import { Router } from 'express'
import { Notification } from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'
import { nowIso } from '../models/helpers.js'

const router = Router()
router.use(requireAuth)

// GET /notifications -> my unread updates (at most 8), newest first.
// Read ones are not sent again: the bell shows an update once, then it is gone.
router.get('/', async (req, res) => {
  const list = await Notification.find({ userId: req.user.id, readAt: null }).sort({ createdAt: -1 }).limit(8)
  res.json(list)
})

// PUT /notifications/read -> mark all my updates as read (the user opened their bell)
router.put('/read', async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, readAt: null }, { $set: { readAt: nowIso() } })
  res.json({ ok: true })
})

export default router
