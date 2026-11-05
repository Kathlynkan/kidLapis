import { isActive, isPending, slotStatus } from './schedule.js'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Children's needs and volunteers' skills are both just subjects, the same words
// sessions use, so matching is a simple "same word" check.
export const SUBJECTS = ['Math', 'Science', 'English', 'Mother Tongue']

export function scoreVolunteer(child, volunteer, allChildren) {
  const needs = child.needs || []
  const volunteerDays = volunteer.availability || []

  const matchedSkills = (volunteer.skills || []).filter((s) => needs.includes(s))

  // Children don't store days yet, so every day the volunteer is free counts as shared.
  // If a child.availability field is added later, this starts using it automatically.
  const childDays = child.availability?.length ? child.availability : DAYS
  const sharedDays = volunteerDays.filter((d) => childDays.includes(d))

  // Exclude THIS child, otherwise an already-assigned volunteer is penalised for this very child.
  const workload = allChildren.filter(
    (c) => c.id !== child.id && (c.volunteerIds || []).includes(volunteer.id),
  ).length

  // This volunteer's sessions (and pending requests) with this child, in week order.
  // Declined requests are left out, so that day can be requested again.
  const mySlots = (child.schedule || [])
    .filter((s) => s.volunteerId === volunteer.id && isActive(s))
    .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day))

  const breakdown = { skills: 2 * matchedSkills.length, days: sharedDays.length, workload: -workload }

  return {
    volunteerId: volunteer.id,
    name: volunteer.name,
    avatar: volunteer.avatar, // the volunteer's photo on the Matchmaking page
    availability: volunteerDays,
    score: breakdown.skills + breakdown.days + breakdown.workload,
    breakdown,
    matchedSkills,
    sharedDays,
    workload,
    assigned: (child.volunteerIds || []).includes(volunteer.id),
    scheduledDays: mySlots.map((s) => s.day),
    pendingDays: mySlots.filter(isPending).map((s) => s.day), // days waiting for the volunteer to accept
    // e.g. [{ day: 'Mon', time: '16:00', status: 'accepted' }, { day: 'Wed', time: '18:00', status: 'pending' }]
    scheduledSlots: mySlots.map((s) => ({ day: s.day, time: s.time || '', status: slotStatus(s) })),
  }
}

// Highest score first. Ties: more matched skills, then alphabetical.
export function rankVolunteers(child, volunteers, allChildren) {
  return volunteers
    .map((v) => scoreVolunteer(child, v, allChildren))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.matchedSkills.length - a.matchedSkills.length ||
        a.name.localeCompare(b.name),
    )
}