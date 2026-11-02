// Small helper functions shared by everyone (Week 4: utils/ folder)

import { SUBJECT_COLORS } from '@/utils/constants'

// the background of a subject tag: <span :style="subjectStyle('Math')">Math</span>
export function subjectStyle(subject) {
  return { backgroundColor: SUBJECT_COLORS[subject] }
}

// "2026-10-04" -> "Sat, 4 Oct"
export function formatDate(isoDate) {
  if (!isoDate) return '-'
  return new Date(isoDate).toLocaleDateString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// Whole days between a date and today (0 = today)
export function daysSince(isoDate, today = new Date()) {
  if (!isoDate) return null
  const start = new Date(isoDate.slice(0, 10) + 'T00:00:00') // local midnight
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((end - start) / (24 * 60 * 60 * 1000))
}

// "3 days ago", "Today", "Yesterday"
export function relativeDay(isoDate, today = new Date()) {
  const days = daysSince(isoDate, today)
  if (days === null) return 'Never'
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 0) return `In ${-days} days`
  return `${days} days ago`
}

// Session accuracy as a whole-number percentage: 3/5 -> 60
export function accuracy(session) {
  if (!session || !session.attempted) return 0
  return Math.round((session.correct / session.attempted) * 100)
}

// "Ethan Wong" -> "Ethan"   (a title stays with the name: "Ms Grace Wong" -> "Ms Grace")
export function firstName(fullName = '') {
  const words = fullName.split(' ')
  if (['Ms', 'Mrs', 'Mr', 'Dr'].includes(words[0]) && words.length > 1) {
    return words[0] + ' ' + words[1]
  }
  return words[0]
}

// What the child did in a session (chess, soccer ...) as a list. Older sessions have one word, newer ones a list.
export function activitiesOf(session) {
  const activity = session.activity
  if (Array.isArray(activity)) return activity
  return activity ? [activity] : []
}
