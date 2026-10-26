// Shared option lists so every form uses the same values.
// Add to these lists instead of hard-coding options in your own page.

export const SUBJECTS = ['English', 'Math', 'Science', 'Mother Tongue']

// Used for volunteer skills AND child needs -> powers skills-based matchmaking
export const SKILL_OPTIONS = ['English', 'Math', 'Science', 'Mother Tongue']

export const LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export const MOODS = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'okay', label: 'Okay', emoji: '🙂' },
  { value: 'tired', label: 'Tired', emoji: '🥱' },
  { value: 'frustrated', label: 'Frustrated', emoji: '😣' },
]

export const HOMEWORK_STATUS = {
  assigned: { label: 'To do', badge: 'badge-accent' },
  submitted: { label: 'Done - waiting for check', badge: 'badge-soft' },
  verified: { label: 'Checked', badge: 'text-bg-success' },
}
