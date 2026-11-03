// =============================================================
// /requests  - session requests for volunteers        Owner: Kai Sen
// -------------------------------------------------------------
// When the coordinator assigns a volunteer in Matchmaking, the new schedule slot is
// 'pending' (models/Child.js). The volunteer sees it in their NavBar bell and
// accepts or declines it here.
//   accept  -> the slot becomes 'accepted' and the volunteer joins child.volunteerIds,
//              so the child now appears on their page and counts as assigned.
//              The slot also gets a startDate (Yuqi): the next time that weekday comes round,
//              so the child never appears on a day that has already passed.
//   decline -> the slot is removed, so the coordinator sees the child needs someone again
// =============================================================
import { Router } from 'express'
import { Child } from '../models/index.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { notifyCoordinators, addUpdate, coordinatorIds } from '../utils/notify.js'
import { firstDateFor, formatStart } from '../utils/startDate.js' // Yuqi

const router = Router()
router.use(requireAuth, requireRole('volunteer')) // only the volunteer the request is for

// GET /requests -> [{ childId, childName, level, avatar, needs, day, time, startsOn }]
// Only MY pending slots, from every child.
// startsOn = the first session if I accept now, e.g. '2026-11-09' (Yuqi)
router.get('/', async (req, res) => {
  const children = await Child.find({
    schedule: {
      $elemMatch: {
        volunteerId: req.user.id
      }
    }
  })
  const requests = []
  for (const child of children) {
    for (const slot of child.schedule) {
      if (slot.volunteerId === req.user.id) {
        requests.push({
          childId: child.id,
          childName: child.name,
          level: child.level,
          avatar: child.avatar,
          needs: child.needs,
          day: slot.day,
          time: slot.time || '',
          status: slot.status,
          requestedAt: slot.requestedAt,
          startsOn: firstDateFor(slot.day, slot.time),
        })
      }
    }
  }
  res.json(requests)
})

// PUT /requests/:childId   body: { day, action: 'accept' | 'decline' }
router.put('/:childId', async (req, res) => {
  const { day, action } = req.body
  if (!['accept', 'decline'].includes(action)) {
    return res.status(400).json({ message: 'Action must be "accept" or "decline".' })
  }

  const child = await Child.findById(String(req.params.childId))
  // Never trust the browser: the request must exist, be pending, and be for THIS volunteer
  const slot = child?.schedule.find(
    (s) => s.volunteerId === req.user.id && s.day === day && s.status === 'pending',
  )
  if (!slot) {
    return res.status(404).json({ message: 'That request no longer exists. The coordinator may have changed it.' })
  }

  if (action === 'accept') {
    slot.status = 'accepted'
    slot.startDate = firstDateFor(slot.day, slot.time) // the first session, e.g. next Monday (Yuqi)
    if (!child.volunteerIds.includes(req.user.id)) child.volunteerIds.push(req.user.id)
  } else {
    slot.status = 'declined'
    // No accepted days left together -> the volunteer is not assigned to this child
    if (!child.schedule.some((s) => s.volunteerId === req.user.id && s.status !== 'pending')) {
      child.volunteerIds = child.volunteerIds.filter((id) => id !== req.user.id)
    }
  }
  await child.save()
  notifyCoordinators(req) // the coordinator's pages update from "waiting" straight away

  // ...and every coordinator gets an update in their bell
  const when = `${day}${slot.time ? ` at ${slot.time}` : ''}`
  await addUpdate(
    req,
    await coordinatorIds(),
    action === 'accept'
      ? { text: `${req.user.name} accepted ${child.name}, every ${when}, starting ${formatStart(slot.startDate)}`, icon: 'bi-check-circle', link: '/coordinator/schedule' }
      : { text: `${req.user.name} declined ${child.name} on ${day}`, icon: 'bi-x-circle', link: `/coordinator/matchmaking/${child.id}` },
  )
  res.json({ message: action === 'accept' ? 'Request accepted.' : 'Request declined.' })
})

export default router