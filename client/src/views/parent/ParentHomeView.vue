<!-- Parent home: "What did my child do today?"          Owner: Kat -->
<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth' // the logged-in user
import PageHeader from '@/components/PageHeader.vue' // for the 'Hello {{parent}}'
import StateMessage from '@/components/StateMessage.vue' // to show loading etc
import ParentSocialDay from '@/components/ParentSocialDay.vue' // one day of the social tab
import LineIcon from '@/components/LineIcon.vue' // a small drawn icon, instead of an emoji
import { firstName, formatDate, daysSince } from '@/utils/format' // small helpers for names, dates and scores
import '@/css/parent/parentshared.css' // what the parent pages have in common
import '@/css/parent/parentpage.css' // the styles of this page
import '@/css/main/labels.css' // the capital-letter captions

const auth = useAuthStore()

// ---------- the things this page remembers ----------
const children = ref([]) // all the children of this parent
const selectedId = ref(null) // the id of the child we are showing now
const sessions = ref([]) // the sessions of that child, newest first
const homework = ref([]) // the homework of that child
const handover = ref(null) // the AI summary of that child
const handoverLoading = ref(false) // true while we wait for the summary
const loading = ref(true) // true while the page is first loading
const error = ref('') // the error sentence, empty if there is no error
const openTab = ref('homework') // which tab is open: 'homework' or 'social'
const showFinished = ref(false) // true when the finished homework is shown
const showAllDays = ref(false) // true when the social tab shows every day, not only the newest three

// the two tabs
const TABS = [
  { id: 'homework', label: 'Homework' },
  { id: 'social', label: 'Social' },
]

// how the child felt, in simple words for a parent
const MOOD_WORDS = {
  happy: 'Happy',
  okay: 'Doing okay',
  tired: 'A bit tired',
  frustrated: 'Found it hard',
}

// the face icon that goes with each mood
const MOOD_FACES = {
  happy: 'face-happy',
  okay: 'face-okay',
  tired: 'face-tired',
  frustrated: 'face-hard',
}

// the number of each weekday, the way JavaScript counts them (Sunday is 0)
const DAY_NUMBERS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// ---------- values worked out from the things above ----------
// the child we are showing now (found in the list by its id)
const selectedChild = computed(() => children.value.find((child) => child.id === selectedId.value))

// the first letter of the child's name, shown in the round picture
const childInitial = computed(() => (selectedChild.value ? selectedChild.value.name.charAt(0).toUpperCase() : ''))

// the child's first name, used in the sentences
const childName = computed(() => (selectedChild.value ? firstName(selectedChild.value.name) : ''))

// the homework that is still to do, the earliest due date first
const todoHomework = computed(() => {
  const list = homework.value.filter((item) => item.status === 'assigned')
  return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
})

// true when a homework is past its due date
function isLate(item) {
  return item.status === 'assigned' && daysSince(item.dueDate) > 0
}

// the three groups of the homework tab (a group is left out when it is empty)
const homeworkGroups = computed(() => {
  const groups = [
    { key: 'todo', title: 'Needs doing at home', items: todoHomework.value },
    { key: 'waiting', title: 'Handed in, waiting to be checked', items: homework.value.filter((item) => item.status === 'submitted') },
    { key: 'done', title: 'Checked and finished', items: homework.value.filter((item) => item.status === 'verified') },
  ]
  return groups.filter((group) => group.items.length > 0)
})

// the due date in plain words: "2 days late", "Due today", "Due tomorrow", "Due in 5 days"
function dueLabel(item) {
  const days = daysSince(item.dueDate)
  if (days > 1) return days + ' days late'
  if (days === 1) return '1 day late'
  if (days === 0) return 'Due today'
  if (days === -1) return 'Due tomorrow'
  return 'Due in ' + -days + ' days'
}

// the small tag on the right of a homework row
function rowTag(item, groupKey) {
  if (groupKey === 'todo') return dueLabel(item)
  if (groupKey === 'waiting') return 'Being checked'
  return 'Done'
}

// the grey line under the title of a homework row
function rowMeta(item, groupKey) {
  if (groupKey === 'todo') return item.subject + ' · due ' + formatDate(item.dueDate)
  const handedIn = item.completedAt ? ' · handed in ' + formatDate(item.completedAt) : ''
  if (groupKey === 'waiting') return item.subject + handedIn
  return item.subject + handedIn
}

// the session that shows how a finished homework went: the first session of the same subject
// on or after the day the child handed it in (or the due date). Empty when there is none yet.
function sessionFor(item) {
  const from = item.completedAt || item.dueDate
  let found = null
  for (const session of sessions.value) {
    if (!session.subject || !item.subject) continue
    if (session.subject.toLowerCase() !== item.subject.toLowerCase()) continue
    if (session.date < from) continue
    if (found === null || session.date < found.date) found = session
  }
  return found
}

// the score of a session in words, like "4 / 5 right" (empty when nothing was attempted)
function scoreOf(session) {
  if (!session || !session.attempted) return ''
  return session.correct + ' / ' + session.attempted + ' right'
}

// the notes of a session that the volunteer filled in, each with its label
function resultNotes(session) {
  const notes = []
  if (session.struggles && session.struggles.length > 0) notes.push({ label: 'A bit tricky', text: session.struggles.join('; ') })
  if (session.whatWorked) notes.push({ label: 'What helped', text: session.whatWorked })
  if (session.nextStep) notes.push({ label: 'Coming up next', text: session.nextStep })
  if (session.notes) notes.push({ label: 'Note from the volunteer', text: '"' + session.notes + '"' })
  return notes
}

// the non-academic things the child did in a session (chess with friends, soccer ...), as a list
function activitiesOf(session) {
  const activity = session.activity // a list like ['Chess', 'Drawing'] (older sessions have one word)
  if (Array.isArray(activity)) {
    return activity
  }
  if (activity) {
    return [activity]
  }
  return []
}

// the lines of the AI summary, each with its label (a line is left out when it is empty)
const summaryLines = computed(() => {
  if (!handover.value) return []
  const lines = [
    { label: 'Working on', text: handover.value.continueTopic },
    { label: 'Latest score', text: handover.value.lastResult },
    { label: 'What helped', text: handover.value.whatWorked },
    { label: 'Finding tricky', text: handover.value.struggle },
    { label: 'Coming up next', text: handover.value.nextStep },
  ]
  return lines.filter((line) => line.text && line.text !== '-')
})

// the days shown on the social tab: the newest three, or all of them
const socialDays = computed(() => (showAllDays.value ? sessions.value : sessions.value.slice(0, 3)))

// the name of a volunteer, found in the sessions we already have (empty if we have not seen them yet)
function volunteerName(volunteerId) {
  const session = sessions.value.find((item) => item.volunteerId === volunteerId)
  return session ? session.volunteerName : ''
}

// the next session of the child: the soonest day in the child's weekly schedule
const nextSession = computed(() => {
  const schedule = selectedChild.value ? selectedChild.value.schedule : []
  if (!schedule || schedule.length === 0) return null

  const today = new Date()
  let soonest = null
  for (const slot of schedule) {
    const dayNum = DAY_NUMBERS[slot.day]
    if (dayNum === undefined) continue // skip any slot with an unrecognised day name
    let daysAway = dayNum - today.getDay()
    if (daysAway < 0) daysAway = daysAway + 7 // that day already passed this week, so it is next week
    if (soonest === null || daysAway < soonest.daysAway) {
      soonest = { daysAway: daysAway, volunteerId: slot.volunteerId }
    }
  }

  if (!soonest) return null // all slots had unrecognised days

  // the date of that day, written like 2026-10-12 so formatDate can show it
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + soonest.daysAway)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return {
    date: `${date.getFullYear()}-${month}-${day}`,
    volunteer: volunteerName(soonest.volunteerId),
  }
})

// the three small tiles at the top: late homework, homework to do, next session
const summaryTiles = computed(() => {
  const late = todoHomework.value.filter(isLate).length
  const next = nextSession.value
  const nextValue = next ? formatDate(next.date) : 'Not set yet' // always a date, like Mon, 26 Oct
  return [
    { value: late > 0 ? late + ' late' : 'On time', label: late > 0 ? 'Needs a catch-up' : 'No late homework', late: late > 0, goToHomework: true },
    { value: todoHomework.value.length - late + ' to do', label: 'To do at home', todo: todoHomework.value.length - late > 0, goToHomework: true },
    { value: nextValue, label: next && next.volunteer ? 'Next session with ' + firstName(next.volunteer) : 'Next session', next: true },
  ]
})

// pressing the "late" or "to do" tile: open the homework tab and scroll down to it
async function showHomework() {
  openTab.value = 'homework'
  await nextTick() // wait until the tab is on the screen
  document.getElementById('homework-board').scrollIntoView({ behavior: 'instant', block: 'start' })
}

// ---------- ask the server for the AI summary ----------
async function loadHandover(childId) {
  handover.value = null
  handoverLoading.value = true
  let summary = null // stays empty if something goes wrong, the rest of the page still works
  try {
    // audience: 'parent' makes the AI write in simple, friendly words
    const response = await api.post(`/handover/${childId}`, { audience: 'parent' })
    summary = response.data
  } catch {
    summary = null
  }
  if (childId !== selectedId.value) return // the parent already switched to another child, so ignore this answer
  handover.value = summary
  handoverLoading.value = false
}

// ---------- show one child: their summary, sessions and homework ----------
async function loadChild(childId) {
  selectedId.value = childId
  loadHandover(childId) // no "await": the page does not wait for the AI
  const sessionResponse = await api.get('/sessions', { params: { childId } })
  sessions.value = sessionResponse.data
  const homeworkResponse = await api.get('/homework', { params: { childId } })
  homework.value = homeworkResponse.data
}

// ---------- when the parent presses a child's button ----------
async function switchChild(childId) {
  if (childId === selectedId.value) return // already showing this child
  error.value = ''
  try {
    await loadChild(childId)
  } catch (err) {
    error.value = errorMessage(err)
  }
}

// ---------- when the page opens: get the children, then show the first one ----------
onMounted(async () => {
  try {
    const response = await api.get('/children')
    children.value = response.data
    if (children.value.length > 0) {
      await loadChild(children.value[0].id)
    }
  } catch (err) {
    error.value = errorMessage(err)
  }
  loading.value = false
})
</script>

<template>
  <div class="container py-4 parentpage">
    <PageHeader :title="`Hello, ${firstName(auth.user.name)}`" :subtitle="`Stay up to date with how ${childName} is getting on at student care.`" />

    <!-- one of these three messages shows while loading, on an error, or when there is no child -->
    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />
    <StateMessage v-else-if="!selectedChild" message="No child is linked to your account yet." />

    <template v-else>
      <!-- the child's name and level, and the child buttons (only when the parent has 2 or more children) -->
      <div class="child-row" data-test="child-switcher">
        <div class="child-info">
          <span class="child-initial">{{ childInitial }}</span>
          <div>
            <h2 class="child-name">{{ selectedChild.name }}</h2>
            <div class="muted">{{ selectedChild.level }} &middot; <span class="with-icon"><LineIcon name="star" small />{{ selectedChild.points }} stars earned</span></div>
          </div>
        </div>
        <div v-if="children.length > 1" class="child-buttons">
          <button
            v-for="child in children"
            :key="child.id"
            type="button"
            class="child-button"
            :class="{ selected: child.id === selectedId }"
            @click="switchChild(child.id)"
          >
            {{ firstName(child.name) }}
          </button>
        </div>
      </div>

      <!-- three small tiles: what needs attention -->
      <div class="summary-tiles" data-test="status-strip">
        <!-- the late and the to do tiles are buttons: they take the parent to the homework -->
        <component
          :is="tile.goToHomework ? 'button' : 'div'"
          v-for="tile in summaryTiles"
          :key="tile.label"
          class="tile"
          :class="{ 'tile-late': tile.late, 'tile-todo': tile.todo, 'tile-next': tile.next, 'tile-link': tile.goToHomework }"
          :type="tile.goToHomework ? 'button' : null"
          @click="tile.goToHomework && showHomework()"
        >
          <strong>{{ tile.value }}</strong>
          <span>{{ tile.label }}</span>
        </component>
      </div>

      <!-- today at a glance: the AI summary -->
      <div class="glance" data-test="handover-card">
        <span class="small-label">How things are going</span>
        <p v-if="handoverLoading" class="muted">Getting the update...</p>
        <template v-else-if="summaryLines.length > 0">
          <p v-for="line in summaryLines" :key="line.label" class="glance-line">
            <strong>{{ line.label }}:</strong> {{ line.text }}
          </p>
          <p v-if="handover.recurring && handover.recurring.length > 0" class="glance-line">
            <strong>Keep practising:</strong>
            <span v-for="topic in handover.recurring" :key="topic" class="chip" data-test="recurring-badge">{{ topic }}</span>
          </p>
        </template>
        <p v-else class="muted">No summary yet.</p>
      </div>

      <!-- the board with two tabs -->
      <div id="homework-board" class="board" data-test="notice-board">
        <div class="tabs">
          <button v-for="tab in TABS" :key="tab.id" type="button" class="tab" :class="{ active: openTab === tab.id }" @click="openTab = tab.id">
            {{ tab.label }}
            <span v-if="tab.id === 'homework' && todoHomework.length > 0" class="tab-count">{{ todoHomework.length }}</span>
          </button>
        </div>

        <!-- tab: homework, in groups -->
        <div v-if="openTab === 'homework'" class="board-panel">
          <p v-if="homework.length === 0" class="muted">No homework right now.</p>

          <div v-for="group in homeworkGroups" :key="group.key">
            <h3 class="group-heading">
              <span>{{ group.title }}</span>
              <span>{{ group.items.length }}</span>
            </h3>

            <!-- the finished homework is hidden until the parent asks for it -->
            <button v-if="group.key === 'done'" type="button" class="show-more" :aria-expanded="showFinished" @click="showFinished = !showFinished">
              {{ showFinished ? 'Hide' : 'Show' }} finished homework
            </button>

            <template v-if="group.key !== 'done' || showFinished">
              <!-- one row for each homework: tap it to open (only the finished ones start closed) -->
              <details v-for="item in group.items" :key="item.id" :open="group.key !== 'done'" class="homework-row" :class="['row-' + group.key, { 'row-late': isLate(item) }]" data-test="homework-card">
                <summary>
                  <span class="row-top">
                    <span class="row-title">{{ item.title }}</span>
                    <span class="row-tag">{{ rowTag(item, group.key) }}</span>
                  </span>
                  <span v-if="group.key === 'done' && scoreOf(sessionFor(item))" class="row-score">{{ scoreOf(sessionFor(item)) }}</span>
                  <span class="muted">{{ rowMeta(item, group.key) }}</span>
                  <span v-if="group.key === 'done'" class="muted with-icon"><LineIcon name="star" small />{{ item.points }} stars</span>
                </summary>

                <!-- what the volunteer wrote down for it -->
                <p v-if="group.key === 'todo' && item.details" class="row-details">{{ item.details }}</p>
                <template v-if="group.key === 'done'">
                  <template v-if="sessionFor(item)">
                    <p v-if="MOOD_WORDS[sessionFor(item).mood]" class="row-details with-icon">How {{ childName }} felt: <LineIcon :name="MOOD_FACES[sessionFor(item).mood]" small />{{ MOOD_WORDS[sessionFor(item).mood] }}</p>
                    <div v-for="note in resultNotes(sessionFor(item))" :key="note.label" class="note-box">
                      <span class="small-label">{{ note.label }}</span>
                      {{ note.text }}
                    </div>
                    <div v-if="sessionFor(item).photos && sessionFor(item).photos.length > 0" class="result-photos">
                      <img v-for="(photo, number) in sessionFor(item).photos" :key="number" :src="photo" alt="Photo from the session" />
                    </div>
                  </template>
                  <p v-else class="muted" data-test="no-result">No result recorded yet.</p>
                </template>
              </details>
            </template>
          </div>
        </div>

        <!-- tab: social = a diary: the newest day is open, the earlier days are short cards -->
        <div v-else class="board-panel" data-test="session-timeline">
          <p v-if="sessions.length === 0" class="muted">Nothing posted yet.</p>
          <template v-else>
            <!-- the newest day, always open -->
            <div class="day-card">
              <div class="day-head">
                <div>
                  <h3 class="day-title">{{ daysSince(sessions[0].date) === 0 ? 'Today at student care' : 'Latest day at student care' }}</h3>
                  <div class="muted">{{ formatDate(sessions[0].date) }}<template v-if="sessions[0].volunteerName"> &middot; with {{ sessions[0].volunteerName }}</template></div>
                </div>
                <span class="mood-chip"><LineIcon v-if="MOOD_FACES[sessions[0].mood]" :name="MOOD_FACES[sessions[0].mood]" small />{{ MOOD_WORDS[sessions[0].mood] || 'Mood not noted' }}</span>
              </div>
              <ParentSocialDay :session="sessions[0]" :child-name="childName" />
            </div>

            <!-- the earlier days: a short card, tap to see the full day -->
            <h3 v-if="sessions.length > 1" class="group-heading">Earlier days</h3>
            <details v-for="session in socialDays.slice(1)" :key="session.id" class="day-card day-card-small">
              <summary>
                <span class="day-head">
                  <strong>{{ formatDate(session.date) }}</strong>
                  <span class="mood-chip"><LineIcon v-if="MOOD_FACES[session.mood]" :name="MOOD_FACES[session.mood]" small />{{ MOOD_WORDS[session.mood] || 'Mood not noted' }}</span>
                </span>
                <span v-if="activitiesOf(session).length > 0" class="muted">{{ activitiesOf(session).join(', ') }}</span>
              </summary>
              <ParentSocialDay :session="session" :child-name="childName" />
            </details>
            <button v-if="sessions.length > 3" type="button" class="show-more" @click="showAllDays = !showAllDays">
              {{ showAllDays ? 'Show fewer days' : 'Show more days' }}
            </button>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>
