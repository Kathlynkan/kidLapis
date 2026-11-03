// =============================================================
// Reset MongoDB to the demo data:   pnpm seed
// -------------------------------------------------------------
// Deletes everything in YOUR database (from DB= in config.env) and loads
// data/seed.json. Run it before demos; the E2E tests run it automatically.
//
// Dates in seed.json are shifted so the demo data is always "recent"
// (otherwise every child would trigger "no session in 7 days").
// =============================================================
import { readFile } from 'node:fs/promises'
import bcrypt from 'bcryptjs'
import { connectDb, disconnectDb } from './db.js'
import { User, Child, Session, Homework, Message, Handover, Deck, Notification } from '../models/index.js'
import { newLinkCode } from '../models/helpers.js'

const DATE_FIELDS = ['date', 'dueDate', 'sentAt', 'createdAt', 'completedAt']
const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

// seedAnchor in seed.json is a Friday. We move it to the most recent Friday (today, if today is a Friday).
// 1. We shift by WHOLE weeks, so every session stays on the same weekday as the child's schedule (a Monday session is still on a Monday).
// 2. Nothing should be in the future, so any date that would land after "now" becomes "now". Due dates are skipped (they can be in the future).
export function shiftSeedDates(seed, today = new Date()) {
  const anchor = new Date(seed.meta.seedAnchor + 'T00:00:00Z')
  const todayUtc = new Date(today.toISOString().slice(0, 10) + 'T00:00:00Z')
  const weeks = Math.floor((todayUtc - anchor) / WEEK_MS)
  const offset = weeks * WEEK_MS
  for (const key of ['users', 'children', 'sessions', 'homework', 'messages']) {
    for (const row of seed[key]) {
      for (const field of DATE_FIELDS) {
        if (!row[field]) continue
        let shifted = new Date(new Date(row[field]).getTime() + offset)
        if (field !== 'dueDate' && shifted > today) {
          shifted = today
        }
        const iso = shifted.toISOString()
        row[field] = row[field].length === 10 ? iso.slice(0, 10) : iso
      }
    }
  }
  return seed
}

// seed.json uses "id"; MongoDB uses "_id"
const toDocs = (rows) => rows.map(({ id, ...rest }) => ({ _id: id, ...rest }))

const seedFile = new URL('../data/seed.json', import.meta.url)
const seed = shiftSeedDates(JSON.parse(await readFile(seedFile, 'utf-8')))

await connectDb()

// Hash all seed passwords so demo accounts work after seeding
const hashedUsers = await Promise.all(
  seed.users.map(async (u) => ({ ...u, password: await bcrypt.hash(u.password, 10) })),
)

// Every child gets a fresh child code (parents use it to link their account at sign up)
const childrenWithCodes = seed.children.map((c) => ({ ...c, linkCode: newLinkCode() }))

const collections = [
  [User, hashedUsers],
  [Child, childrenWithCodes],
  [Session, seed.sessions],
  [Deck, seed.decks],
  [Homework, seed.homework],
  [Message, seed.messages],
]
for (const [Model, rows] of collections) {
  await Model.deleteMany({})
  await Model.insertMany(toDocs(rows))
  console.log(`  ${Model.modelName}: ${rows.length}`)
}

// clear saved AI summaries so they are made again from the fresh demo sessions
await Handover.deleteMany({})
console.log('  Handover: cleared')

// clear the bell's saved updates ("Aisha accepted Sofia" ...): they belong to the old demo data
await Notification.deleteMany({})
console.log('  Notification: cleared')

await disconnectDb()
console.log('Database reset with demo data ✅')