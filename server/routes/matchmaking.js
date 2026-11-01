// =============================================================
// /matchmaking  - suggest + assign volunteers    Owner: Yu Xuan
// Used by the Matchmaking page AND the Schedule (timetable) page.
// =============================================================
import { Router } from 'express'
import { Child, User } from '../models/index.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { rankVolunteers } from '../utils/matchmaking.js'
import { findClash, TIME_PATTERN } from '../utils/schedule.js'
import { toPlain } from '../utils/toPlain.js'

const router = Router()
router.use(requireAuth, requireRole('teacher')) // every matchmaking route is for the teacher (the coordinator) only

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
//   assign:   { action: 'assign',   volunteerId, day, time? }   time like '16:00'
//   unassign: { action: 'unassign', volunteerId, day? }
//             with day    -> remove just that day's slot (Schedule page)
//             without day -> remove the volunteer completely (Matchmaking page)
router.put('/:childId/assign', async (req, res) => {
  const { volunteerId, day, time, action = 'assign' } = req.body

  if (!['assign', 'unassign'].includes(action)) {
    return res.status(400).json({ message: 'Action must be "assign" or "unassign".' })
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
  } else {
    const volunteer = await User.findOne({ _id: volunteerId, role: 'volunteer' })
    if (!volunteer) return res.status(404).json({ message: 'Volunteer not found' })
    if (!day) return res.status(400).json({ message: 'Pick a day for the session.' })

    // Never trust the browser: re-check everything the page already checks.
    if (!(volunteer.availability || []).includes(day)) {
      return res.status(400).json({ message: `${volunteer.name} isn't available on ${day}.` })
    }
    if (time && !TIME_PATTERN.test(time)) {
      return res.status(400).json({ message: 'Time must look like 16:00.' })
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