// =============================================================
// /matchmaking  - suggest + assign volunteers    Owner: Yu Xuan
// Used by the Matchmaking page AND the Schedule (timetable) page.
// =============================================================
import { Router } from 'express'
import { Child, User } from '../models/index.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { rankVolunteers } from '../utils/matchmaking.js'
import { findClash, TIME_PATTERN } from '../utils/schedule.js'

const router = Router()
router.use(requireAuth, requireRole('teacher')) // every matchmaking route is for the teacher (coordinator)

// Mongoose keeps the id in _id. This gives the same { id, ... } shape the client and
// seed.json use, which is what the pure functions in utils/ expect.
const toPlain = (doc) => ({ ...doc.toJSON(), id: doc.id })

// GET /matchmaking/:childId -> { child, suggestions: [...ranked volunteers] }
router.get('/:childId', async (req, res) => {
  const [child, volunteers, allChildren] = await Promise.all([
    Child.findById(req.params.childId),
    User.find({ role: 'volunteer' }),
    Child.find(),
  ])
  if (!child) return res.status(404).json({ message: 'Child not found' })

  const suggestions = rankVolunteers(toPlain(child), volunteers.map(toPlain), allChildren.map(toPlain))
  res.json({ child, suggestions })
})

// PUT /matchmaking/:childId/assign
//   assign:   { action: 'assign',   volunteerId, day, time? }        add a day (or change that day's time)
//   move:     { action: 'move',     volunteerId, fromDay, day, time } change an existing day and/or time
//   unassign: { action: 'unassign', volunteerId, day? }
//             with day    -> remove just that day
//             without day -> remove the volunteer completely
router.put('/:childId/assign', async (req, res) => {
  const { volunteerId, day, time, fromDay, action = 'assign' } = req.body

  if (!['assign', 'move', 'unassign'].includes(action)) {
    return res.status(400).json({ message: 'Action must be "assign", "move" or "unassign".' })
  }
  if (!volunteerId) return res.status(400).json({ message: 'Choose a volunteer.' })

  const child = await Child.findById(req.params.childId)
  if (!child) return res.status(404).json({ message: 'Child not found' })
  if (!child.schedule) child.schedule = [] // safe even before the schema has the field

  if (action === 'unassign') {
    if (day) {
      child.schedule = child.schedule.filter((s) => !(s.volunteerId === volunteerId && s.day === day))
    } else {
      child.schedule = child.schedule.filter((s) => s.volunteerId !== volunteerId)
    }
    // Only drop the volunteer from the child once they have no days left together.
    if (!child.schedule.some((s) => s.volunteerId === volunteerId)) {
      child.volunteerIds = child.volunteerIds.filter((id) => id !== volunteerId)
    }
    await child.save()
    return res.json(child)
  }

  // ----- assign + move share the same checks. Never trust the browser: re-check everything. -----
  const volunteer = await User.findOne({ _id: volunteerId, role: 'volunteer' })
  if (!volunteer) return res.status(404).json({ message: 'Volunteer not found' })
  if (!day) return res.status(400).json({ message: 'Pick a day for the session.' })
  if (!(volunteer.availability || []).includes(day)) {
    return res.status(400).json({ message: `${volunteer.name} isn't available on ${day}.` })
  }
  if (time && !TIME_PATTERN.test(time)) {
    return res.status(400).json({ message: 'Time must look like 16:00.' })
  }

  let slotToMove = null
  if (action === 'move') {
    slotToMove = child.schedule.find((s) => s.volunteerId === volunteerId && s.day === fromDay)
    if (!slotToMove) {
      return res.status(404).json({ message: 'That session no longer exists. Refresh the page.' })
    }
    if (!time) return res.status(400).json({ message: 'Pick a time for the session.' })
    // Moving to a different day they already have together would create two slots on one day.
    if (day !== fromDay && child.schedule.some((s) => s.volunteerId === volunteerId && s.day === day)) {
      return res.status(409).json({ message: `${volunteer.name} already sees ${child.name} on ${day}.` })
    }
  }

  const allChildren = (await Child.find()).map(toPlain)
  const clash = findClash(allChildren, {
    childId: child.id,
    volunteerId,
    volunteerName: volunteer.name,
    day,
    time,
  })
  if (clash) return res.status(409).json({ message: clash }) // 409 Conflict

  if (action === 'move') {
    slotToMove.day = day
    slotToMove.time = time
  } else {
    if (!child.volunteerIds.includes(volunteerId)) child.volunteerIds.push(volunteerId)
    const existing = child.schedule.find((s) => s.volunteerId === volunteerId && s.day === day)
    if (existing) {
      if (time) existing.time = time // same volunteer + day again = change the time
    } else {
      child.schedule.push(time ? { volunteerId, day, time } : { volunteerId, day })
    }
  }

  await child.save()
  res.json(child)
})

export default router