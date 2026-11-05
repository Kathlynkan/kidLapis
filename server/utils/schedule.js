export const SESSION_MINUTES = 60 // every session is assumed to last one hour
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/ // 'HH:MM', 24-hour

// A slot's status (models/Child.js). No status = seed data / older assignments = accepted.
export const slotStatus = (slot) => slot.status || 'accepted'
export const isConfirmed = (slot) => slotStatus(slot) === 'accepted'
export const isPending = (slot) => slotStatus(slot) === 'pending'
// Pending still holds its time (the volunteer may accept); a declined request doesn't.
export const isActive = (slot) => slotStatus(slot) !== 'declined'

export function toMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Two one-hour sessions overlap if they start less than an hour apart.
export function overlaps(timeA, timeB) {
  return Math.abs(toMinutes(timeA) - toMinutes(timeB)) < SESSION_MINUTES
}

// Would booking { childId, volunteerId, day, time } double-book anyone?
// Returns a friendly message, or null if the slot is fine.
export function findClash(allChildren, { childId, volunteerId, volunteerName = 'This volunteer', day, time }) {
  if (!time) return null // no time chosen, nothing to compare

  for (const child of allChildren) {
    for (const slot of child.schedule || []) {
      if (!isActive(slot)) continue // a declined request doesn't hold the time
      if (slot.day !== day || !slot.time || !overlaps(slot.time, time)) continue

      // Same child + same volunteer + same day is the slot being changed, not a clash.
      if (child.id === childId && slot.volunteerId === volunteerId) continue

      if (slot.volunteerId === volunteerId) {
        return `${volunteerName} already has ${child.name} on ${day} at ${slot.time}.`
      }
      if (child.id === childId) {
        return `${child.name} already has another session on ${day} at ${slot.time}.`
      }
    }
  }
  return null
}