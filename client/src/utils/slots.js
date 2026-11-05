import { firstName } from './format'

// ---------- A slot's status (server/models/Child.js) ----------
//   pending  = the coordinator asked, the volunteer hasn't answered yet
//   accepted = a real weekly session
//   declined = the volunteer said no (the slot stays in the data, but means nothing)
// Slots without a status are seed data / older assignments, and count as accepted.

export const slotStatus = (slot) => slot.status || 'accepted'

// A real session: counts towards the dots, the "Some days / Every weekday" status and the slot count.
export const isConfirmed = (slot) => slotStatus(slot) === 'accepted'

// Waiting for the volunteer: shown with a "Pending" tag.
export const isPending = (slot) => slotStatus(slot) === 'pending'

// Shown on the timetable and holds its time (a pending request may still be accepted).
export const isActive = (slot) => slotStatus(slot) !== 'declined'

// ---------- Session times ----------

export const SESSION_MINUTES = 60 // every session lasts an hour (same rule as server/utils/schedule.js)

// Start times every 30 minutes from 09:00 to 19:30, for the time dropdowns.
export const TIMES = []
for (let h = 9; h <= 19; h++) {
  for (const m of ['00', '30']) TIMES.push(`${String(h).padStart(2, '0')}:${m}`)
}

export const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// ---------- Clashes (greyed out in the time dropdowns) ----------
// The server makes the final decision; this just warns the coordinator before they click.

// Every booked time on this day that would clash for this volunteer, or for this child
// with another volunteer. The pair's own slot doesn't count (it's the one being changed).
// booking = { childId, childName, volunteerId, volunteerName, day }  (childId may be '' = not chosen yet)
export function busyTimes(children, { childId, childName, volunteerId, volunteerName, day }) {
  const busy = []
  for (const other of children) {
    for (const slot of other.schedule || []) {
      if (!isActive(slot) || slot.day !== day || !slot.time) continue // declined requests don't hold a time
      if (other.id === childId && slot.volunteerId === volunteerId) continue
      if (slot.volunteerId === volunteerId) {
        busy.push({ time: slot.time, reason: `${firstName(volunteerName)} has ${firstName(other.name)}` })
      } else if (childId && other.id === childId) {
        busy.push({ time: slot.time, reason: `${firstName(childName)} has another session` })
      }
    }
  }
  return busy
}

// All start times, with clashing ones disabled and labelled with the reason,
// e.g. { time: '16:30', disabled: true, label: '16:30 · Daniel has Ethan at 16:00' }
export function timeOptions(children, booking) {
  const busy = booking.day ? busyTimes(children, booking) : []
  return TIMES.map((t) => {
    const clash = busy.find((b) => Math.abs(toMinutes(b.time) - toMinutes(t)) < SESSION_MINUTES)
    return { time: t, disabled: Boolean(clash), label: clash ? `${t} · ${clash.reason} at ${clash.time}` : t }
  })
}