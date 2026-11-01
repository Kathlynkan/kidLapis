// =============================================================
// /dashboard  - coordinator overview & alerts     Owner: Yu Xuan
// -------------------------------------------------------------
// TODO (Yu Xuan):
//   [ ] alerts: children with NO session in the last 7 days
//   [ ] alerts: a struggle skill that appears in 3+ of the last 5 sessions
//   [ ] alerts: homework overdue and not submitted
//   [ ] alerts: children with no volunteer assigned  -> Child.find({ volunteerIds: { $size: 0 } })
//   [ ] PUT /dashboard/follow-up/:childId  -> flag / unflag a child for follow-up
// =============================================================
import { Router } from 'express'
import { Child, User, Session, Homework } from '../models/index.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { buildAlerts, todayKey } from '../utils/alerts.js'
import { toPlain } from '../utils/toPlain.js'

const router = Router()
router.use(requireAuth, requireRole('teacher'))

// GET /dashboard/summary  -> numbers for the KPI cards (basic version DONE)
router.get('/summary', async (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // run the 4 counts at the same time
  const [totalChildren, totalVolunteers, sessionsThisWeek, homeworkPending] = await Promise.all([
    Child.countDocuments(),
    User.countDocuments({ role: 'volunteer' }),
    Session.countDocuments({ date: { $gte: weekAgo } }),
    Homework.countDocuments({ status: { $ne: 'verified' } }),
  ])

  res.json({
    totalChildren,
    totalVolunteers,
    sessionsThisWeek,
    homeworkPending,
    // TODO (Yu Xuan): add averageAccuracy, childrenNeedingFollowUp, ...
  })
})

// GET /dashboard/alerts -> [{ id, type, severity, childId, childName, avatar, followUp, message }]
router.get('/alerts', requireAuth, requireRole('teacher'), async (req, res) => {
  const [children, sessions, homework] = await Promise.all([Child.find(), Session.find(), Homework.find()])
  res.json(
    buildAlerts({
      children: children.map(toPlain),
      sessions: sessions.map(toPlain),
      homework: homework.map(toPlain),
      today: todayKey(),
    }),
  )
})

// PUT /dashboard/follow-up/:childId   body: { followUp: true | false }
router.put('/follow-up/:childId', requireAuth, requireRole('teacher'), async (req, res) => {
  const { followUp } = req.body
  if (typeof followUp !== 'boolean') {
    return res.status(400).json({ message: 'followUp must be true or false.' })
  }
  const child = await Child.findById(req.params.childId)
  if (!child) return res.status(404).json({ message: 'Child not found' })

  child.followUp = followUp
  await child.save()
  res.json(child)
})

export default router
