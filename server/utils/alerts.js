// Coordinator "Needs attention" rules.
// Every function here is PURE: data in, alerts out. No database, no Express,
// no "new Date()" inside the rules. That makes each rule easy to unit test.
import { toJpg } from '../models/helpers.js' // old photo paths that say .webp are sent as .jpg

export const NO_SESSION_DAYS = 7 // alert if the last session was MORE than this many days ago
export const URGENT_NO_SESSION_DAYS = 14 // after this, the alert becomes high severity
export const STRUGGLE_WINDOW = 5 // look at the last N sessions of a subject...
export const STRUGGLE_MIN = 3 // ...and alert if the same struggle appears this many times

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 }

// Today's date as 'YYYY-MM-DD' in Singapore time, so a server running in UTC
// doesn't think it's still yesterday between midnight and 8am.
export function todayKey(date = new Date(), timeZone = 'Asia/Singapore') {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date)
}

// Whole days between two 'YYYY-MM-DD' strings.
export function daysBetween(from, to) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

// Rule 1: child has no volunteer.
export function unassignedAlert(child) {
  if (child.volunteerIds?.length) return null
  return {
    type: 'unassigned',
    severity: 'high',
    message: 'No volunteer assigned',
  }
}

// Rule 2: no session in the last 7 days.
// Skipped for unassigned children: they can't have sessions, and rule 1 already flags them.
export function noRecentSessionAlert(child, childSessions, today) {
  if (!child.volunteerIds?.length) return null

  const lastDate = childSessions.map((s) => s.date).sort().at(-1)
  if (!lastDate) {
    return { type: 'no-session', severity: 'medium', message: 'No sessions logged yet' }
  }

  const days = daysBetween(lastDate, today)
  if (days <= NO_SESSION_DAYS) return null

  return {
    type: 'no-session',
    severity: days > URGENT_NO_SESSION_DAYS ? 'high' : 'medium',
    message: `No session for ${days} days (last on ${lastDate})`,
  }
}

// Rule 3: the same struggle in 3+ of the last 5 sessions OF THE SAME SUBJECT.
// Per subject on purpose: an English session shouldn't push a maths
// struggle out of the window.
export function repeatedStruggleAlerts(childSessions) {
  const subjects = [...new Set(childSessions.map((s) => s.subject))]
  const alerts = []

  for (const subject of subjects) {
    const recent = childSessions
      .filter((s) => s.subject === subject)
      .sort((a, b) => b.date.localeCompare(a.date)) // newest first
      .slice(0, STRUGGLE_WINDOW)

    const counts = new Map()
    for (const session of recent) {
      for (const struggle of new Set(session.struggles ?? [])) {
        counts.set(struggle, (counts.get(struggle) ?? 0) + 1)
      }
    }

    for (const [struggle, count] of counts) {
      if (count >= STRUGGLE_MIN) {
        alerts.push({
          type: 'repeated-struggle',
          severity: 'medium',
          key: `${subject}:${struggle}`,
          message: `"${struggle}" in ${count} of the last ${recent.length} ${subject} sessions`,
        })
      }
    }
  }
  return alerts
}

// Rule 4: homework still "assigned" after its due date.
// "submitted" and "verified" mean the child did it, so those don't count.
export function overdueHomeworkAlert(childHomework, today) {
  const overdue = childHomework.filter((h) => h.status === 'assigned' && h.dueDate < today)
  if (!overdue.length) return null
  return {
    type: 'overdue-homework',
    severity: 'low',
    message: `${overdue.length} overdue: ${overdue.map((h) => h.title).join(', ')}`,
  }
}

// Runs every rule for every child and returns one flat, sorted list.
export function buildAlerts({ children, sessions, homework, today }) {
  const alerts = []

  for (const child of children) {
    const childSessions = sessions.filter((s) => s.childId === child.id)
    const childHomework = homework.filter((h) => h.childId === child.id)

    const found = [
      unassignedAlert(child),
      noRecentSessionAlert(child, childSessions, today),
      ...repeatedStruggleAlerts(childSessions),
      overdueHomeworkAlert(childHomework, today),
    ].filter(Boolean)

    for (const { key, ...alert } of found) {
      alerts.push({
        id: [alert.type, child.id, key].filter(Boolean).join(':'), // stable id for Vue :key
        childId: child.id,
        childName: child.name,
        avatar: toJpg(child.avatar),
        followUp: child.followUp ?? false,
        ...alert,
      })
    }
  }

  return alerts.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.childName.localeCompare(b.childName),
  )
}