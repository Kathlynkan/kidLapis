export const slotStatus = (slot) => slot.status || 'accepted'

// A real session: counts towards the dots, the "Some days / Every weekday" status and the slot count.
export const isConfirmed = (slot) => slotStatus(slot) === 'accepted'

// Waiting for the volunteer: shown with a "Pending" tag.
export const isPending = (slot) => slotStatus(slot) === 'pending'

// Shown on the timetable and holds its time (a pending request may still be accepted).
export const isActive = (slot) => slotStatus(slot) !== 'declined'