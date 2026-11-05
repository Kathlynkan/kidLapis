import { Router } from 'express'
import { Child } from '../models/index.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { notifyCoordinators, addUpdate, coordinatorIds } from '../utils/notify.js'
import { firstDateFor, formatStart } from '../utils/startDate.js' 
import { findClash, isConfirmed } from '../utils/schedule.js'

const router = Router()
router.use(requireAuth, requireRole('volunteer')) // only the volunteer the request is for

// GET /requests -> [{ childId, childName, level, avatar, needs, day, time, status, requestedAt, startsOn, startDate, changedFrom }]
// Only MY pending slots, from every child.
// startsOn = the first session if I accept now, e.g. '2026-11-09' 
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
          startDate: slot.startDate || '',
          changedFrom: slot.prevDay ? `${slot.prevDay} ${slot.prevTime || ''}`.trim() : '',
          prevDay: slot.prevDay || '', 
          prevTime: slot.prevTime || '',
          declinedChange: slot.declinedChange || '', 
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

  const name = child.name
  const when = `${slot.day}${slot.time ? ` at ${slot.time}` : ''}`
  const isChange = Boolean(slot.prevDay) // a change to a session they had already accepted 
  const oldWhen = `${slot.prevDay}${slot.prevTime ? ` at ${slot.prevTime}` : ''}`
  let message = '' // shown on the volunteer's Requests page
  let update = null // what every coordinator sees in their bell

  if (action === 'accept') {
    slot.status = 'accepted'
    slot.startDate = firstDateFor(slot.day, slot.time) // the first session, e.g. next Monday 
    if (!child.volunteerIds.includes(req.user.id)) child.volunteerIds.push(req.user.id)
    if (isChange) {
      message = `Change accepted. You'll see ${name} every ${when}, starting ${formatStart(slot.startDate)}.`
      update = { text: `${req.user.name} accepted the change: ${name} is now every ${when}, starting ${formatStart(slot.startDate)}`, icon: 'bi-check-circle', link: '/coordinator/schedule' }
    } else {
      message = `Request accepted. You'll see ${name} every ${when}, starting ${formatStart(slot.startDate)}.`
      update = { text: `${req.user.name} accepted ${name}, every ${when}, starting ${formatStart(slot.startDate)}`, icon: 'bi-check-circle', link: '/coordinator/schedule' }
    }
    slot.prevDay = ''
    slot.prevTime = ''
    slot.prevStartDate = ''
    slot.declinedChange = ''
  } else if (isChange) {
    // said no to a CHANGE: go back to the old day/time, if it is still free 
    const allChildren = (await Child.find()).map((c) => ({ ...c.toJSON(), id: c.id }))
    const clash = findClash(allChildren, {
      childId: child.id,
      volunteerId: req.user.id,
      volunteerName: req.user.name,
      day: slot.prevDay,
      time: slot.prevTime,
    })
    const dayTaken = child.schedule.some(
      (s) => s !== slot && s.volunteerId === req.user.id && s.day === slot.prevDay && s.status !== 'declined',
    )
    const newWhen = `${slot.day} ${slot.time || ''}`.trim()
    if (!clash && !dayTaken) {
      slot.declinedChange = newWhen
      slot.day = slot.prevDay
      slot.time = slot.prevTime
      slot.startDate = slot.prevStartDate
      slot.status = 'accepted'
      message = `You said no to the change. Your session with ${name} stays every ${oldWhen}.`
      update = { text: `${req.user.name} said no to moving ${name} to ${newWhen}. The session stays every ${oldWhen}.`, icon: 'bi-arrow-counterclockwise', link: `/coordinator/matchmaking/${child.id}` }
    } else {
      // the old time was given to someone else in the meantime, so there is nothing to go back to
      slot.status = 'declined'
      message = `You said no to the change, but ${oldWhen} is no longer free, so this session has ended. The coordinator has been told.`
      update = { text: `${req.user.name} said no to moving ${name} to ${newWhen}, and ${oldWhen} is no longer free. Please find a new time.`, icon: 'bi-x-circle', link: `/coordinator/matchmaking/${child.id}` }
    }
    slot.prevDay = ''
    slot.prevTime = ''
    slot.prevStartDate = ''
  } else {
    slot.status = 'declined'
    message = `Request declined. The coordinator will find someone else for ${name}.`
    update = { text: `${req.user.name} declined ${name} on ${slot.day}`, icon: 'bi-x-circle', link: `/coordinator/matchmaking/${child.id}` }
  }

  // No ACCEPTED days left together -> the volunteer is not assigned to this child
  if (!child.schedule.some((s) => s.volunteerId === req.user.id && isConfirmed(s))) {
    child.volunteerIds = child.volunteerIds.filter((id) => id !== req.user.id)
  }
  await child.save()
  notifyCoordinators(req) // the coordinator's pages update from "waiting" straight away
  await addUpdate(req, await coordinatorIds(), update) // ...and every coordinator gets an update in their bell
  res.json({ message })
})

export default router