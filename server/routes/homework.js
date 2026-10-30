// =============================================================
// /homework  - homework "quests"
// Owners: Ning Xuan (volunteer assigns) [done]  +  Jachin (child hands in, berries, leaderboard)
// =============================================================
// How a quest travels (its "status" changes step by step):
//
//   'assigned'   the volunteer gave the quest to the child
//        |  the child presses DONE!        -> PUT /homework/:id/submit
//        v
//   'submitted'  the child handed it in, now it waits for the volunteer (the "Captain")
//        |  the volunteer checks it         -> PUT /homework/:id/verify
//        v
//   'verified'   checked! The child is paid the berries now.
//
// Berries (the pirate money) are saved on the child as child.points.
// The ranks and badges are worked out in the browser: client/src/utils/gamification.js
// =============================================================
import { Router } from 'express'
import { Homework, Child, Deck } from '../models/index.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { canAccessChild, visibleChildIds } from '../utils/access.js'

const router = Router()

// A child must not see the right answers, so we take them out of the quest before we send it.
function hideAnswers(quest) {
  const data = quest.toJSON()
  for (const question of data.questions || []) {
    delete question.answer
  }
  return data
}

// Everything in this file needs a logged-in user.
router.use(requireAuth)

// ---------------------------------------------------------------
// GET /homework?childId=c_1
// Returns the quests of a child (or of all the children this user may see).
// ---------------------------------------------------------------
router.get('/', async (req, res) => {
  const visible = await visibleChildIds(req.user) // the ids of the children this user is allowed to see
  const { childId } = req.query

  // Asking about a child you may not see? You get an empty list.
  if (childId && !visible.includes(childId)) {
    return res.json([])
  }

  const filter = { childId: childId || { $in: visible } }
  const list = await Homework.find(filter).sort({ dueDate: 1 }) // earliest due date first

  // A child gets the questions without the answers. Volunteers and coordinators get everything.
  if (req.user.role === 'child') {
    const hidden = []
    for (const quest of list) {
      hidden.push(hideAnswers(quest))
    }
    return res.json(hidden)
  }
  res.json(list)
})

// GET /homework/leaderboard                     (Jachin)
// ?period=week  -> stars earned this week (points from verified homework completed in the last 7 days)
// default       -> all-time (total child points, top 10)
router.get('/leaderboard', async (req, res) => {
  if (req.query.period === 'week') {
    // Use YYYY-MM-DD string comparison — works for both date-only and ISO strings
    const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    const recentVerified = await Homework.find({
      status: 'verified',
      completedAt: { $gte: sevenDaysAgoStr },
    })

    // Sum points earned per child this week
    const weekPoints = {}
    for (const hw of recentVerified) {
      weekPoints[hw.childId] = (weekPoints[hw.childId] || 0) + hw.points
    }

    if (Object.keys(weekPoints).length === 0) return res.json([])

    const children = await Child.find({ _id: { $in: Object.keys(weekPoints) } }).select(
      'name points avatar',
    )
    const entries = children
      .map((c) => ({
        childId: c.id,
        name: c.name,
        avatar: c.avatar,
        points: weekPoints[c.id] || 0,
      }))
      .sort((a, b) => b.points - a.points)

    return res.json(entries)
  }

  // Default: all-time by total points
  const children = await Child.find({}).sort({ points: -1 }).limit(10).select('name points avatar')
  res.json(
    children.map((c) => ({ childId: c.id, name: c.name, avatar: c.avatar, points: c.points })),
  )
})

// ---------------------------------------------------------------
// POST /homework      (Ning Xuan: assign homework, done  +  Jachin: the questions come from a deck)
// ---------------------------------------------------------------
// GET /homework/:id
router.get('/:id', async (req, res) => {
  const homework = await Homework.findById(req.params.id)

  if (!homework) {
    return res.status(404).json({
      message: 'Homework not found'
    })
  }

  const visible = await visibleChildIds(req.user)

  if (!visible.includes(homework.childId)) {
    return res.status(403).json({
      message: 'No access'
    })
  }

  res.json(homework)
})

router.post('/', requireRole('volunteer', 'teacher'), async (req, res) => {
  // only volunteers and coordinators can assign homework
  try {
    const child = await Child.findById(req.body.childId)

    // check if child exists
    if (!child) {
      return res.status(404).json({
        message: 'Child not found'
      })
    }

    // check user access
    const allowedChildren = await visibleChildIds(req.user)

    if (!allowedChildren.includes(req.body.childId)) {
      return res.status(403).json({
        message: 'No access'
      })
    }

    const today = new Date().toISOString().slice(0, 10)

    // check due date exists
    if (!req.body.dueDate) {
      return res.status(400).json({
        message: 'Due date is required'
      })
    }

    // validate due date
    if (req.body.dueDate < today) {
      return res.status(400).json({
        message: 'Due date cannot be in the past'
      })
    }

    // find the deck, if the volunteer picked one
    let deck = null
    if (req.body.deckId) {
      deck = await Deck.findById(req.body.deckId)
      if (!deck) {
        return res.status(404).json({
          message: 'Deck not found'
        })
      }
    }

    // validate title (a deck gives a title when the volunteer typed none)
    let title = (req.body.title || '').trim()
    if (!title && deck) {
      title = deck.title
    }
    if (!title) {
      return res.status(400).json({
        message: 'Title is required'
      })
    }

    // validate points
    if (req.body.points < 0) {
      return res.status(400).json({
        message: 'Points cannot be negative'
      })
    }

    // copy the questions of the deck into the quest, one by one
    const questions = []
    if (deck) {
      for (const question of deck.questions) {
        questions.push({ text: question.text, answer: question.answer })
      }
    }

    // create homework
    const homework = await Homework.create({
      childId: req.body.childId,
      title,
      subject: req.body.subject || (deck ? deck.subject : undefined),
      details: (req.body.details || '').trim() || (deck ? deck.description : ''),
      dueDate: req.body.dueDate,
      points: Number(req.body.points) || 10,
      volunteerId: req.user.id,
    })

    // return new homework
    return res.status(201).json(homework)
    // status 201: request succeeded and created new homework
    // default status 200: request succeeded
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to assign homework'
    })
  }
})

// PUT /homework/:id/submit  (Jachin) -> child marks homework as done
router.put('/:id/submit', requireRole('child'), async (req, res) => {
  const hw = await Homework.findById(req.params.id)
  if (!hw) return res.status(404).json({ message: 'Homework not found.' })
  if (hw.childId !== req.user.childId) {
    return res.status(403).json({ message: 'This is not your homework.' })
  }
  if (hw.status !== 'assigned') {
    return res.status(400).json({ message: 'Homework is already submitted or verified.' })
  }
  hw.status = 'submitted'
  hw.completedAt = new Date().toISOString().slice(0, 10)
  await hw.save()
  res.json(hw)
})

// PUT /homework/:id/verify  (Jachin) -> volunteer confirms, child earns points
// findOneAndUpdate with status condition makes the submitted→verified transition atomic,
// preventing double-award if two requests race on the same homework.
router.put('/:id/verify', requireRole('volunteer', 'teacher'), async (req, res) => {
  const hw = await Homework.findOneAndUpdate(
    { _id: req.params.id, status: 'submitted' },
    { $set: { status: 'verified' } },
    { new: true },
  )
  if (!hw) {
    const exists = await Homework.exists({ _id: req.params.id })
    if (!exists) return res.status(404).json({ message: 'Homework not found.' })
    return res.status(400).json({ message: 'Homework must be submitted before it can be verified.' })
  }
  const child = await Child.findByIdAndUpdate(
    hw.childId,
    { $inc: { points: hw.points } },
    { new: true },
  )
  res.json({ homework: hw, points: child.points })
})

// DELETE /homework/:id  — volunteer or teacher; not allowed once verified (stars already awarded)
router.delete('/:id', requireRole('volunteer', 'teacher'), async (req, res) => {
  const hw = await Homework.findById(req.params.id)
  if (!hw) return res.status(404).json({ message: 'Homework not found.' })

  const visible = await visibleChildIds(req.user)
  if (!visible.includes(hw.childId)) {
    return res.status(403).json({ message: 'You do not have access to this homework.' })
  }

  if (hw.status === 'verified') {
    return res.status(400).json({
      message: 'Verified homework cannot be deleted — the child already earned their stars.',
    })
  }

  await Homework.deleteOne({ _id: hw._id })
  res.json({ deleted: hw._id })
})

export default router