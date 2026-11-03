// =============================================================
// Auth middleware (owner: Kai Sen)
// -------------------------------------------------------------
// Demo version: tokens are random strings kept in memory.
// Restarting the server logs everyone out (the client handles 401).
// Passwords are hashed with bcryptjs in routes/auth.js.
//
// TODO (Kai Sen):
//   [ ] (Optional) Replace in-memory tokens with JWT (jsonwebtoken),
//       which also survives server restarts on Render
// =============================================================
import crypto from 'node:crypto'
import { User } from '../models/index.js'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

const tokens = new Map() // token -> { userId, issuedAt }

export function issueToken(userId) {
  const token = crypto.randomBytes(24).toString('hex')
  tokens.set(token, { userId, issuedAt: Date.now() })
  return token
}

export function revokeToken(token) {
  tokens.delete(token)
}

// The logged-in user for a token, or null if the token is unknown/expired/user deleted.
// Used by requireAuth below and by the live chat connection in server.js.
export async function userForToken(token) {
  const entry = tokens.get(String(token ?? ''))
  if (!entry) return null
  if (Date.now() - entry.issuedAt > TOKEN_TTL_MS) {
    tokens.delete(token)
    return null
  }
  return User.findById(entry.userId)
}

// Attach req.user (a Mongoose User document) if "Authorization: Bearer <token>" is valid
export async function requireAuth(req, res, next) {
  const header = req.header('Authorization') || ''
  const token = header.replace('Bearer ', '')
  const entry = tokens.get(token)
  if (!entry || Date.now() - entry.issuedAt > TOKEN_TTL_MS) {
    tokens.delete(token)
    return res.status(401).json({ message: 'Please log in again.' })
  }
  const user = await userForToken(token)
  if (!user) {
    return res.status(401).json({ message: 'User no longer exists.' })
  }
  req.user = user
  req.token = token
  next()
}

// Usage: router.post('/', requireAuth, requireRole('coordinator'), handler)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have access to this.' })
    }
    next()
  }
}
