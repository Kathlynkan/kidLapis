// =============================================================
// /messages  - volunteer <-> parent chat about a child      Owner: Kat
// -------------------------------------------------------------
// Fields: see models/Message.js
// One "conversation" per child, shared by the parent, the child's
// assigned volunteers and the coordinator.
// =============================================================
import { Router } from 'express'
import { Child, Message, User } from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'
import { canAccessChild, visibleChildIds } from '../utils/access.js'

const router = Router()
router.use(requireAuth)

// GET /messages?childId=c_1   (DONE) -> oldest first, with sender name
router.get('/', async (req, res) => {
  const child = await Child.findById(req.query.childId)
  if (!canAccessChild(req.user, child) || req.user.role === 'child' || req.user.role === 'volunteer') {
    return res.status(403).json({ message: 'You do not have access to this conversation.' })
  }
  const messages = await Message.find({ childId: child.id }).sort({ sentAt: 1 })

  const senderIds = [...new Set(messages.map((m) => m.fromId))]
  const senders = await User.find({ _id: { $in: senderIds } }).select('name role')
  const byId = Object.fromEntries(senders.map((u) => [u.id, u]))

  res.json(
    messages.map((m) => ({
      ...m.toJSON(),
      fromName: byId[m.fromId]?.name || 'Unknown',
      fromRole: byId[m.fromId]?.role,
    })),
  )
})

// GET /messages/unread  -> { [childId]: count }  (for the navbar badge)
router.get('/unread', async (req, res) => {
  const ids = await visibleChildIds(req.user)
  const unread = await Message.find(
    { childId: { $in: ids }, readBy: { $ne: req.user.id } },
    'childId',
  )
  const counts = {}
  for (const m of unread) counts[m.childId] = (counts[m.childId] || 0) + 1
  res.json(counts)
})

// POST /messages   body: { childId, text }
router.post('/', async (req, res) => {
  const { childId } = req.body
  const text = String(req.body.text ?? '').trim()
  if (!text) return res.status(400).json({ message: 'Message text is required.' })
  const child = await Child.findById(childId)
  if (!canAccessChild(req.user, child) || req.user.role === 'child' || req.user.role === 'volunteer') {
    return res.status(403).json({ message: 'You do not have access to this conversation.' })
  }
  const message = await Message.create({ childId, fromId: req.user.id, text, readBy: [req.user.id] })
  const payload = { ...message.toJSON(), fromName: req.user.name, fromRole: req.user.role }
  // Push to every browser currently viewing this child's thread (real-time)
  const io = req.app.get('io')
  if (io) io.to(`child:${childId}`).emit('new-message', payload)
  res.status(201).json(payload)
})

// PUT /messages/read   body: { childId }  -> mark all as read by me
router.put('/read', async (req, res) => {
  const { childId } = req.body
  const child = await Child.findById(childId)
  if (!canAccessChild(req.user, child) || req.user.role === 'child' || req.user.role === 'volunteer') {
    return res.status(403).json({ message: 'You do not have access to this conversation.' })
  }
  await Message.updateMany({ childId }, { $addToSet: { readBy: req.user.id } })
  res.json({ ok: true })
})

export default router
