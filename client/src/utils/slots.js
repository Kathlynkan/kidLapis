// A schedule slot's status (server/models/Child.js).                 Owner: Yu Xuan
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