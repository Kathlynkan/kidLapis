// =============================================================
// Kids Lapis API server  (Express + MongoDB/Mongoose, like the IS113 / Week 5 blog-with-mongodb service)
// Run:  pnpm dev   ->  http://localhost:8000
// =============================================================
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import { Server as SocketServer } from 'socket.io'
import { connectDb } from './utils/db.js' // also loads config.env
import { userForToken } from './middleware/auth.js'
import { canAccessChild } from './utils/access.js'
import { Child } from './models/index.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import childRoutes from './routes/children.js'
import sessionRoutes from './routes/sessions.js'
import homeworkRoutes from './routes/homework.js'
import deckRoutes from './routes/decks.js'
import messageRoutes from './routes/messages.js'
import handoverRoutes from './routes/handover.js'
import dashboardRoutes from './routes/dashboard.js'
import progressRoutes from './routes/progress.js'
import matchmakingRoutes from './routes/matchmaking.js'

const app = express()
const httpServer = createServer(app)
const io = new SocketServer(httpServer, {
  cors: { origin: process.env.CLIENT_URL || true },
})
const PORT = process.env.PORT || 8000

app.use(cors({ origin: process.env.CLIENT_URL || true }))
app.use(express.json({ limit: '10mb' })) // a session carries its photos as text, so it can be big

// Store io on the app so routes can emit events via req.app.get('io')
app.set('io', io)

// Each connected client joins a room named after the childId it is viewing,
// so the server can push new messages only to the relevant browsers.
//
// Security (Kai Sen): the live connection follows the same rules as GET /messages.
//   1. No valid login token -> the connection is refused.
//   2. You can only join the room of a child whose chat you may read
//      (parents: their own children, teachers: every child; volunteers and children: none).
// Without this, anyone could connect without logging in, join "child:c_1" and read new messages.
io.use(async (socket, next) => {
  try {
    const user = await userForToken(socket.handshake.auth?.token)
    if (!user) return next(new Error('Please log in again.'))
    socket.data.token = socket.handshake.auth.token
    next()
  } catch {
    next(new Error('Could not check your login.'))
  }
})

io.on('connection', (socket) => {
  socket.on('join', async (childId) => {
    // try/catch: an error here (e.g. the database is down) must not crash the whole server
    try {
      // Look the user up again, so someone who has logged out since connecting can't join
      const user = await userForToken(socket.data.token)
      const child = await Child.findById(String(childId))
      const canReadChat = user && user.role !== 'child' && user.role !== 'volunteer'
      if (canReadChat && canAccessChild(user, child)) socket.join(`child:${child.id}`)
    } catch (error) {
      console.error('Socket join failed:', error.message)
    }
  })
  socket.on('leave', (childId) => socket.leave(`child:${childId}`))
})

// Health check - handy for deployment platforms and E2E tests
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'Kids Lapis API' })
})

//          URL prefix        Owner
app.use('/auth', authRoutes) // Kai Sen
app.use('/users', userRoutes) // Kai Sen / Yu Xuan
app.use('/children', childRoutes) // Kai Sen
app.use('/matchmaking', matchmakingRoutes) // Yu Xuan
app.use('/dashboard', dashboardRoutes) // Yu Xuan
app.use('/sessions', sessionRoutes) // Ning Xuan
app.use('/homework', homeworkRoutes) // Ning Xuan (assign) + Jachin (complete / rewards)
app.use('/decks', deckRoutes) // Jachin (the decks of questions)
app.use('/handover', handoverRoutes) // Yuqi
app.use('/messages', messageRoutes) // Kat
app.use('/progress', progressRoutes) // Jachin

// Fallback error handler so the server never crashes on a bad request
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Something went wrong on the server.' })
})

await connectDb()
httpServer.listen(PORT, () => {
  console.log(`Kids Lapis API running at http://localhost:${PORT}`)
})
