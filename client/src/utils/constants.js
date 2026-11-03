// Shared option lists so every form uses the same values.
// Add to these lists instead of hard-coding options in your own page.

export const SUBJECTS = ['English', 'Math', 'Science', 'Mother Tongue']

// The colour of each subject (Kueh warm): the pills and the bars of the charts
export const SUBJECT_COLORS = {
  'English':       '#A3CDE6', // sky
  'Math':          '#F4D08A', // custard
  'Science':       '#B2D8A6', // pandan
  'Mother Tongue': '#F3B397', // peach
}

// A deeper tone of each, for the lines of the skill progress chart, so a line is easy to see on white
export const SUBJECT_LINE_COLORS = {
  'English':       '#5E9FC9',
  'Math':          '#DBA645',
  'Science':       '#6BAE63',
  'Mother Tongue': '#E0805D',
}

// Used for volunteer skills AND child needs -> powers skills-based matchmaking
export const SKILL_OPTIONS = ['English', 'Math', 'Science', 'Mother Tongue']

export const LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

export const INTEREST_OPTIONS = [
  'Football', 'Basketball', 'Swimming', 'Badminton', 'Running',
  'Drawing', 'Painting', 'Music', 'Dance', 'Crafts',
  'Video Games', 'Board Games', 'Puzzles', 'Lego',
  'Reading', 'Comics', 'Storytelling',
  'Cooking', 'Baking',
  'Science', 'Animals', 'Dinosaurs', 'Nature', 'Space',
  'Robots', 'Coding', 'Origami', 'Photography',
]

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// face: the Bootstrap icon that goes with the mood
export const MOODS = [
  { value: 'happy', label: 'Happy', face: 'bi-emoji-smile' },
  { value: 'okay', label: 'Okay', face: 'bi-emoji-neutral' },
  { value: 'tired', label: 'Tired', face: 'bi-emoji-expressionless' },
  { value: 'frustrated', label: 'Frustrated', face: 'bi-emoji-angry' },
]

export const PORTIONS = [
  { value: 'all', label: 'Finished All' },
  { value: 'most', label: 'Ate Most' },
  { value: 'half', label: 'Ate Half' },
  { value: 'little', label: 'Ate Little' },
  { value: 'none', label: 'Did Not Eat' },
]

export const HOMEWORK_STATUS = {
  assigned: { label: 'To do', badge: 'badge-accent' },
  submitted: { label: 'Done - waiting for check', badge: 'badge-soft' },
  verified: { label: 'Checked', badge: 'text-bg-success' },
}
