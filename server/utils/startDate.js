// The first date a weekly session happens, counted from today.
// e.g. accepted on Tue 3 Nov:
//   firstDateFor('Mon', '16:00') -> '2026-11-09' (Monday has passed, so next Monday)
//   firstDateFor('Tue', '16:00') -> '2026-11-03' at 10am (today, not started yet)
//                                   '2026-11-10' at 5pm  (today's has started, so next week)
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// a date as 'YYYY-MM-DD' in our time zone
export function toDateText(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function firstDateFor(day, time = '', now = new Date()) {
  let daysAhead = DAYS.indexOf(day) - now.getDay()
  if (daysAhead < 0) {
    daysAhead = daysAhead + 7 // that day has already passed this week -> next week
  }

  // the same day as today: only today if the session has not started yet
  if (daysAhead === 0 && time) {
    const [hours, minutes] = time.split(':').map(Number)
    // accepted when its past the assigned day (time)
    const started = now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)
    if (started) {
      daysAhead = 7
    }
  }

  const first = new Date(now)
  first.setDate(now.getDate() + daysAhead)
  return toDateText(first)
}

// e.g. '2026-11-09' -> 'Mon 9 Nov'
// (used for the coordinator's bell and the parent's "No sessions since ..." note)
export function formatStart(dateText) {
  const date = new Date(dateText + 'T00:00:00')
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}