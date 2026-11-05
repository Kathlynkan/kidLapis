import { Router } from 'express'
import { Homework, Child, Deck, User } from '../models/index.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { visibleChildIds } from '../utils/access.js'
import { notifyBell, addUpdate } from '../utils/notify.js'

const router = Router()

// The child's volunteers see "quests to check" on their NavBar bell: update it straight away
async function notifyVolunteersOf(req, childId) {
  const child = await Child.findById(childId).select('volunteerIds')
  if (child) notifyBell(req, child.volunteerIds)
}

// The child's own login gets an update in their bell, e.g. "'Read one story' was approved! +10 stars"
async function tellChild(req, childId, update) {
  const logins = await User.find({ role: 'child', childId }).select('_id')
  await addUpdate(req, logins.map((u) => u.id), update)
}

// Everything in this file needs a logged-in user.
router.use(requireAuth)

// GET /homework?childId=c_1
// Returns the quests of a child (or of all the children this user may see).
router.get('/', async (req, res) => {
  const visible = await visibleChildIds(req.user) // the ids of the children this user is allowed to see
  const { childId } = req.query

  // Asking about a child you may not see? You get an empty list.
  if (childId && !visible.includes(childId)) {
    return res.json([])
  }

  const filter = { childId: childId || { $in: visible } }
  const list = await Homework.find(filter).sort({ dueDate: 1 }) // earliest due date first

  res.json(list)
})

// GET /homework/leaderboard
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
      weekPoints[hw.childId] = (weekPoints[hw.childId] || 0) + (hw.pointsAwarded ?? hw.points)
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

// GET /homework/:id                              loads one homework into the edit form
router.get('/:id', async (req, res) => {
  const hw = await Homework.findById(req.params.id)
  if (!hw) return res.status(404).json({ message: 'Homework not found.' })

  const visible = await visibleChildIds(req.user)
  if (!visible.includes(hw.childId)) {
    return res.status(403).json({ message: 'You do not have access to this homework.' })
  }

  res.json(hw)
})

// POST /homework      assign homework; the questions can come from a deck
router.post('/', requireRole('volunteer', 'coordinator'), async (req, res) => {
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

// PUT /homework/:id         -> volunteer or coordinator edits the homework
//   body = { title, subject, details, dueDate, points }  (the child and the status cannot be changed here)
//   Not allowed once verified: the child already earned the stars.
router.put('/:id', requireRole('volunteer', 'coordinator'), async (req, res) => {
  const hw = await Homework.findById(req.params.id)
  if (!hw) return res.status(404).json({ message: 'Homework not found.' })

  const visible = await visibleChildIds(req.user)
  if (!visible.includes(hw.childId)) {
    return res.status(403).json({ message: 'You do not have access to this homework.' })
  }

  if (hw.status === 'verified') {
    return res.status(400).json({
      message: 'Verified homework cannot be edited — the child already earned their stars.',
    })
  }

  const { title, subject, details, dueDate, points } = req.body

  if (!dueDate) return res.status(400).json({ message: 'Due date is required' })
  // a date that is already in the past is fine only if it is the date the homework had before
  const today = new Date().toISOString().slice(0, 10)
  if (dueDate !== hw.dueDate && dueDate < today) {
    return res.status(400).json({ message: 'Due date cannot be in the past' })
  }
  if (!title || !title.trim()) return res.status(400).json({ message: 'Title is required' })
  if (points < 5 || points > 20) {
    return res.status(400).json({ message: 'Points must be between 5 and 20' })
  }

  hw.title = title.trim()
  hw.subject = subject
  hw.details = (details || '').trim()
  hw.dueDate = dueDate
  hw.points = Number(points)
  await hw.save()
  res.json(hw)
})

// PUT /homework/:id/submit  -> child marks homework as done
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
  hw.rejectedAt = null
  hw.rejectMessage = ''
  await hw.save()
  await notifyVolunteersOf(req, hw.childId) // "Ethan handed in ..." appears on their bell
  res.json(hw)
})

// PUT /homework/:id/unsubmit  -> child retracts a submission before it is verified
router.put('/:id/unsubmit', requireRole('child'), async (req, res) => {
  const hw = await Homework.findById(req.params.id)
  if (!hw) return res.status(404).json({ message: 'Homework not found.' })
  if (hw.childId !== req.user.childId) {
    return res.status(403).json({ message: 'This is not your homework.' })
  }
  if (hw.status !== 'submitted') {
    return res.status(400).json({ message: 'Only submitted homework can be retracted.' })
  }
  hw.status = 'assigned'
  hw.completedAt = null
  await hw.save()
  await notifyVolunteersOf(req, hw.childId) // taken back: gone from their bell
  res.json(hw)
})

// PUT /homework/:id/verify  -> volunteer confirms, child earns points
// findOneAndUpdate with status condition makes the submitted→verified transition atomic,
// preventing double-award if two requests race on the same homework.
// Late penalty: if the child submitted after the due date, they earn half the points.
router.put('/:id/verify', requireRole('volunteer', 'coordinator'), async (req, res) => {
  // access check before the atomic update so an unauthorised caller never changes state
  const existing = await Homework.findById(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Homework not found.' })
  const visible = await visibleChildIds(req.user)
  if (!visible.includes(existing.childId)) {
    return res.status(403).json({ message: 'You do not have access to this homework.' })
  }

  const hw = await Homework.findOneAndUpdate(
    { _id: req.params.id, status: 'submitted' },
    { $set: { status: 'verified' } },
    { new: true },
  )
  if (!hw) {
    return res.status(400).json({ message: 'Homework must be submitted before it can be verified.' })
  }
  const isLate = hw.completedAt && hw.dueDate && hw.completedAt > hw.dueDate
  const pointsAwarded = isLate ? Math.ceil(hw.points / 2) : hw.points
  await Homework.findByIdAndUpdate(hw._id, { $set: { pointsAwarded } })
  const child = await Child.findByIdAndUpdate(
    hw.childId,
    { $inc: { points: pointsAwarded } },
    { new: true },
  )
  notifyBell(req, child.volunteerIds) // checked: gone from every volunteer's bell
  await tellChild(req, hw.childId, {
    text: `"${hw.title}" was approved! +${pointsAwarded} stars${isLate ? ' (half, because it was handed in late)' : ''}`,
    icon: 'bi-star-fill',
    link: '/child',
  })
  res.json({ homework: { ...hw.toJSON(), pointsAwarded }, points: child.points, pointsAwarded })
})

// PUT /homework/:id/reject  -> volunteer returns a submitted quest back to the child
router.put('/:id/reject', requireRole('volunteer', 'coordinator'), async (req, res) => {
  const hw = await Homework.findById(req.params.id)
  if (!hw) return res.status(404).json({ message: 'Homework not found.' })
  const visible = await visibleChildIds(req.user)
  if (!visible.includes(hw.childId)) return res.status(403).json({ message: 'No access.' })
  if (hw.status !== 'submitted') {
    return res.status(400).json({ message: 'Only submitted homework can be returned.' })
  }
  hw.status = 'assigned'
  hw.completedAt = null
  hw.rejectedAt = new Date().toISOString().slice(0, 10)
  hw.rejectMessage = String(req.body.message || '').trim().slice(0, 300)
  await hw.save()
  await notifyVolunteersOf(req, hw.childId) // returned: gone from every volunteer's bell
  const reason = hw.rejectMessage ? ` Reason: "${hw.rejectMessage}"` : ' Have another go!'
  await tellChild(req, hw.childId, {
    text: `"${hw.title}" was returned.${reason}`,
    icon: 'bi-arrow-counterclockwise',
    link: '/child',
  })
  res.json(hw)
})

// DELETE /homework/:id  — volunteer or coordinator; not allowed once verified (stars already awarded)
router.delete('/:id', requireRole('volunteer', 'coordinator'), async (req, res) => {
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