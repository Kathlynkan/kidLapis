// =============================================================
// /matchmaking  - suggest + assign volunteers    Owner: Yu Xuan
// Used by the Matchmaking page AND the Schedule (timetable) page.
// Slot statuses (models/Child.js): 'pending' until the volunteer accepts (routes/requests.js),
// then 'accepted'; 'declined' if they say no. No status = accepted (seed / older data).
// =============================================================
import { Router } from 'express'
import { Child, User } from '../models/index.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { rankVolunteers } from '../utils/matchmaking.js'
import { findClash, TIME_PATTERN, isActive, isConfirmed } from '../utils/schedule.js'
import { notifyBell, addUpdate } from '../utils/notify.js'

const router = Router()
router.use(requireAuth, requireRole('coordinator')) // every matchmaking route is for the coordinator only

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
    const isRemoved = (s) => s.volunteerId === volunteerId && (!day || s.day === day)
    const removed = child.schedule.filter(isRemoved) // remembered for the volunteer's update below
    child.schedule = child.schedule.filter((s) => !isRemoved(s))
    // Only drop the volunteer from the child once they have no ACCEPTED days left together
    // (a day still waiting for them, or one they declined, doesn't make them assigned).
    if (!child.schedule.some((s) => s.volunteerId === volunteerId && isConfirmed(s))) {
      child.volunteerIds = child.volunteerIds.filter((id) => id !== volunteerId)
    }
    await child.save()
    notifyBell(req, [volunteerId]) // a cancelled request disappears from their bell straight away

    // Tell the volunteer in their bell's "Updates" (Kai Sen, utils/notify.js)
    const confirmedDays = removed.filter(isConfirmed).map((s) => s.day)
    const requestDays = removed.filter((s) => s.status === 'pending').map((s) => s.day)
    if (confirmedDays.length) {
      await addUpdate(req, [volunteerId], {
        text: `You no longer see ${child.name} on ${confirmedDays.join(', ')}`,
        icon: 'bi-calendar-x',
        link: '/volunteer',
      })
    }
    if (requestDays.length) {
      await addUpdate(req, [volunteerId], {
        text: `The request for ${child.name} on ${requestDays.join(', ')} was cancelled`,
        icon: 'bi-calendar-x',
        link: '/volunteer/requests',
      })
    }
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

  // A request this volunteer DECLINED for this day is just history: clear it, so the day can be
  // requested (or moved to) again instead of getting stuck as 'declined'.
  child.schedule = child.schedule.filter(
    (s) => !(s.volunteerId === volunteerId && s.day === day && !isActive(s)),
  )

  let slotToMove = null
  if (action === 'move') {
    slotToMove = child.schedule.find((s) => s.volunteerId === volunteerId && s.day === fromDay && isActive(s))
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

  let changedSession = null // a CONFIRMED session whose day/time changed -> the volunteer is told below
  if (action === 'move') {
    const before = `${slotToMove.day} ${slotToMove.time || ''}`.trim()
    slotToMove.day = day
    slotToMove.time = time
    if (isConfirmed(slotToMove)) changedSession = { before, after: `${day} ${time}` }
  } else {
    // The volunteer is NOT added to child.volunteerIds here: that happens when they accept
    // (routes/requests.js). Until then the child still counts as needing a volunteer, and
    // the child doesn't appear on the volunteer's page.
    const existing = child.schedule.find((s) => s.volunteerId === volunteerId && s.day === day)
    if (existing) {
      // same volunteer + day again = change the time
      if (time && time !== existing.time && isConfirmed(existing)) {
        changedSession = { before: `${day} ${existing.time || ''}`.trim(), after: `${day} ${time}` }
      }
      if (time) existing.time = time
    } else {
      // A new day starts as a request: the volunteer accepts it from their bell (routes/requests.js)
      const slot = { volunteerId, day, status: 'pending' }
      if (time) slot.time = time
      child.schedule.push(slot)
    }
  }

  await child.save()
  notifyBell(req, [volunteerId]) // a new or changed request shows on the volunteer's bell straight away
  if (changedSession) {
    await addUpdate(req, [volunteerId], {
      text: `${child.name}'s session moved from ${changedSession.before} to ${changedSession.after}`,
      icon: 'bi-calendar-event',
      link: '/volunteer',
    })
  }
  res.json(child)
})

export default router