import { Notification, User } from '../models/index.js'

export function notifyBell(req, userIds) {
  const io = req.app.get('io')
  if (!io) return
  for (const id of new Set((userIds || []).filter(Boolean))) {
    io.to(`user:${id}`).emit('bell-refresh')
  }
}

// A volunteer accepted or declined a session: every coordinator's open Dashboard, Matchmaking
// and Schedule page reloads its data, so "waiting" turns into the real answer straight away.
export function notifyCoordinators(req) {
  req.app.get('io')?.to('role:coordinator').emit('schedule-changed')
}

export async function addUpdate(req, userIds, { text, icon, link }) {
  const ids = [...new Set((userIds || []).filter(Boolean))]
  if (!ids.length) return
  await Notification.insertMany(ids.map((userId) => ({ userId, text, icon, link })))
  notifyBell(req, ids)
}

// Every coordinator's id (updates about the schedule go to all of them)
export async function coordinatorIds() {
  const coordinators = await User.find({ role: 'coordinator' }).select('_id')
  return coordinators.map((t) => t.id)
}
