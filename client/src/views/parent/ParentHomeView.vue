<!-- Parent home: "What did my child do today?"          Owner: Kat -->
<script setup>
import { ref, computed, onMounted } from 'vue' 
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth' // the logged-in user
import PageHeader from '@/components/PageHeader.vue' // for the 'Hello {{parent}}'
import StateMessage from '@/components/StateMessage.vue' // to show loading etc 
import HandoverCard from '@/components/HandoverCard.vue'
import ParentSessionCard from '@/components/ParentSessionCard.vue' // the session card from the whiteboard design
import ParentSocialDay from '@/components/ParentSocialDay.vue' // one day of the social tab
import SkillProgressChart from '@/components/charts/SkillProgressChart.vue'
import PeelCard from '@/components/PeelCard.vue'
import { firstName, formatDate, daysSince } from '@/utils/format' // small helpers for names, dates and scores
import '@/assets/parentpage.css' // the styles of this page (the timeline)

const auth = useAuthStore()

// ---------- the things this page remembers ----------
const children = ref([]) // all the children of this parent
const selectedId = ref(null) // the id of the child we are showing now
const sessions = ref([]) // the sessions of that child, newest first
const homework = ref([]) // the homework of that child
const handover = ref(null) // the "Today at student care" summary of that child
const handoverLoading = ref(false) // true while we wait for the summary
const loading = ref(true) // true while the page is first loading
const error = ref('') // the error sentence, empty if there is no error
const noticeTab = ref('latest') // which tab of the notice board is open: 'social', 'latest' or 'homework'

// ---------- values worked out from the things above ----------
// the child we are showing now (found in the list by its id)
const selectedChild = computed(() => children.value.find((child) => child.id === selectedId.value))

// the newest session (the first one in the list)
const latest = computed(() => sessions.value[0] || null)

// the homework that is still to do, the earliest due date first (for the reminders)
const todoHomework = computed(() => {
  const list = homework.value.filter((item) => item.status === 'assigned')
  return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
})

// how many homework items are to do, waiting for the volunteer to check, or checked
const homeworkCounts = computed(() => {
  const counts = { todo: 0, waiting: 0, checked: 0, late: 0 }
  for (const item of homework.value) {
    if (item.status === 'assigned') counts.todo = counts.todo + 1
    if (item.status === 'submitted') counts.waiting = counts.waiting + 1
    if (item.status === 'verified') counts.checked = counts.checked + 1
    if (item.status === 'assigned' && daysSince(item.dueDate) > 0) counts.late = counts.late + 1
  }
  return counts
})

// the non-academic things the child did in a session (chess with friends, soccer ...), as a list
function activitiesOf(session) {
  if (session.activities && session.activities.length > 0) {
    return session.activities
  }
  if (session.activity) {
    return [session.activity]
  }
  return []
}

// the 5 newest sessions, for the timeline
const recentSessions = computed(() => sessions.value.slice(0, 5))

// how the child felt, in simple words for a parent
const MOOD_WORDS = {
  happy: '😊 Happy',
  okay: '🙂 Doing okay',
  tired: '😴 A bit tired',
  frustrated: '😕 Found it hard',
}

// a face for each mood, used in the week strip
const MOOD_FACES = { happy: '😊', okay: '🙂', tired: '😴', frustrated: '😕' }

// the moods of the last five sessions, the oldest first (the newest is on the right)
const weekMoods = computed(() => sessions.value.slice(0, 5).reverse())

// the days shown on the social tab: the newest three, or all of them
const socialDays = computed(() => (showAllDays.value ? sessions.value : sessions.value.slice(0, 3)))

// the child's first name, used in the sentences
const childName = computed(() => (selectedChild.value ? firstName(selectedChild.value.name) : ''))

// how the child was, as the end of a sentence
const FEELING_WORDS = {
  happy: 'was happy',
  okay: 'was doing okay',
  tired: 'was a bit tired',
  frustrated: 'had a harder day',
}

// the weekday of the latest session, like "Saturday"
const latestWeekday = computed(() => {
  if (!latest.value) return ''
  return new Date(latest.value.date).toLocaleDateString('en-SG', { weekday: 'long' })
})

// the number of each weekday, the way JavaScript counts them (Sunday is 0)
const DAY_NUMBERS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

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
    isToday: soonest.daysAway === 0,
    date: `${date.getFullYear()}-${month}-${day}`,
    volunteer: volunteerName(soonest.volunteerId),
  }
})

// the next session as a short label for the small tile, like "Thu 24" ("Today" when it is today)
const nextShort = computed(() => {
  if (!nextSession.value) return 'Not set yet'
  if (nextSession.value.isToday) return 'Today'
  return new Date(nextSession.value.date + 'T00:00:00').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric' })
})

// the homework that was handed in and waits for the volunteer to check
const waitingHomework = computed(() => homework.value.filter((item) => item.status === 'submitted'))

// the homework that is checked and finished
const checkedHomework = computed(() => homework.value.filter((item) => item.status === 'verified'))
const showChecked = ref(false) // true when the finished homework list is opened
const showAllDays = ref(false) // true when the social tab shows every day, not only the newest three

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

// the due date in plain words: "2 days late", "Due today", "Due tomorrow", "Due in 5 days"
function dueLabel(item) {
  const days = daysSince(item.dueDate)
  if (days > 1) return days + ' days late'
  if (days === 1) return '1 day late'
  if (days === 0) return 'Due today'
  if (days === -1) return 'Due tomorrow'
  return 'Due in ' + -days + ' days'
}

// ONE friendly sentence about the latest session, shown at the very top
const topSentence = computed(() => {
  if (!latest.value) return ''
  const session = latest.value
  const feeling = FEELING_WORDS[session.mood] || 'was at student care'
  let text = `${childName.value} ${feeling} on ${formatDate(session.date)}. `
  text = text + `${childName.value} worked on ${session.subject}: ${session.topic} and got ${session.correct} out of ${session.attempted} right.`
  if (activitiesOf(session).length > 0) {
    text = text + ` Also: ${activitiesOf(session).join(', ')}.`
  }
  if (homeworkCounts.value.late > 0) {
    text = text + ` ${homeworkCounts.value.late} homework is late.`
  }
  return text
})

// ---------- ask the server for the "Today at student care" summary ----------
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
    <PageHeader :title="`Hello ${firstName(auth.user.name)}`" subtitle="Stay up to date with your child's learning and social life at student care." />

    <!-- one of these three messages shows while loading, on an error, or when there is no child -->
    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />
    <StateMessage v-else-if="!selectedChild" message="No child is linked to your account yet." />

    <template v-else>
      <!-- the child's name and level, and the child buttons (only when the parent has 2 or more children) -->
      <div class="child-row" data-test="child-switcher">
        <div class="d-flex align-items-center gap-2">
          <span class="avatar">{{ selectedChild.avatar }}</span>
          <div>
            <h2 class="h6 mb-0">{{ selectedChild.name }}</h2>
            <div class="small text-muted-cb">{{ selectedChild.level }} &middot; ⭐ {{ selectedChild.points }} stars</div>
          </div>
        </div>
        <div v-if="children.length > 1" class="d-flex flex-wrap gap-2">
          <button
            v-for="child in children"
            :key="child.id"
            type="button"
            class="btn btn-sm"
            :class="child.id === selectedId ? 'btn-primary' : 'btn-outline-primary'"
            @click="switchChild(child.id)"
          >
            {{ firstName(child.name) }}
          </button>
        </div>
      </div>

      <!-- three small tiles: what needs attention -->
      <div class="status-strip" data-test="status-strip">
        <div class="strip-tile" :class="homeworkCounts.late > 0 ? 'tile-late' : 'tile-ok'">
          <strong>{{ homeworkCounts.late > 0 ? homeworkCounts.late + ' late' : 'On time' }}</strong>
          <span class="small">{{ homeworkCounts.late > 0 ? 'Homework past its date' : 'No late homework' }}</span>
        </div>
        <div class="strip-tile tile-todo">
          <strong>{{ homeworkCounts.todo }} to do</strong>
          <span class="small">Remind at home</span>
        </div>
        <div class="strip-tile tile-next">
          <strong>{{ nextShort }}</strong>
          <span class="small">Next session<template v-if="nextSession && nextSession.volunteer"> · {{ firstName(nextSession.volunteer) }}</template></span>
        </div>
      </div>

      <!-- one sentence: how the latest session went -->
      <div v-if="topSentence" class="top-summary" data-test="top-summary">
        <span class="top-label">Today at a glance</span>
        {{ topSentence }}
        <div v-if="latest && latest.volunteerName" class="top-extra">Ran by {{ latest.volunteerName }}</div>
      </div>

      <!-- the notice board (the AI summary is inside it, under the academic details) -->
      <div class="row g-4 mb-4">
        <div class="col-12">
          <div class="notice-board" :class="'board-' + noticeTab" data-test="notice-board">
            <!-- the three tabs -->
            <div class="notice-tabs">
              <button type="button" class="notice-tab tab-latest" :class="{ active: noticeTab === 'latest' }" @click="noticeTab = 'latest'">Academic</button>
              <button type="button" class="notice-tab tab-homework" :class="{ active: noticeTab === 'homework' }" @click="noticeTab = 'homework'">
                Homework<span v-if="homeworkCounts.todo > 0" class="tab-count">{{ homeworkCounts.todo }}</span>
              </button>
              <button type="button" class="notice-tab tab-social" :class="{ active: noticeTab === 'social' }" @click="noticeTab = 'social'">Social</button>
            </div>

            <!-- tab: social = a diary: the newest day is open, the earlier days are short cards -->
            <div v-if="noticeTab === 'social'" data-test="session-timeline">
              <p v-if="sessions.length === 0" class="note mb-0">Nothing posted yet.</p>
              <template v-else>
                <!-- the mood of the last five sessions -->
                <div class="week-strip">
                  <strong>{{ childName }}'s week</strong>
                  <span class="week-faces">
                    <span v-for="(session, number) in weekMoods" :key="session.id" class="week-face" :class="['mood-' + session.mood, { 'week-face-now': number === weekMoods.length - 1 }]" :title="formatDate(session.date)">{{ MOOD_FACES[session.mood] || '🙂' }}</span>
                  </span>
                </div>

                <!-- the newest day, always open -->
                <div class="day-card">
                  <div class="day-head">
                    <div>
                      <h3 class="h6 mb-0">{{ daysSince(sessions[0].date) === 0 ? 'Today at student care' : 'Latest day at student care' }}</h3>
                      <div class="small text-muted-cb">{{ formatDate(sessions[0].date) }}<template v-if="sessions[0].volunteerName"> &middot; with {{ sessions[0].volunteerName }}</template></div>
                    </div>
                    <span class="mood-chip" :class="'mood-' + sessions[0].mood">{{ MOOD_WORDS[sessions[0].mood] || 'Mood not noted' }}</span>
                  </div>
                  <ParentSocialDay :session="sessions[0]" :child-name="childName" />
                </div>

                <!-- the earlier days: a short card, tap to see the full day -->
                <h3 v-if="sessions.length > 1" class="day-earlier">Earlier days</h3>
                <details v-for="session in socialDays.slice(1)" :key="session.id" class="day-card day-card-small">
                  <summary>
                    <span class="day-head">
                      <strong>{{ formatDate(session.date) }}</strong>
                      <span class="mood-chip" :class="'mood-' + session.mood">{{ MOOD_WORDS[session.mood] || 'Mood not noted' }}</span>
                    </span>
                    <span v-if="activitiesOf(session).length > 0" class="small text-muted-cb d-block">{{ activitiesOf(session).join(', ') }}</span>
                  </summary>
                  <ParentSocialDay :session="session" :child-name="childName" />
                </details>
                <button v-if="sessions.length > 3" type="button" class="day-more" @click="showAllDays = !showAllDays">
                  {{ showAllDays ? 'Show fewer days' : 'Show more days' }}
                </button>
              </template>
            </div>

            <!-- tab: academic = the session card -->
            <div v-else-if="noticeTab === 'latest'">
              <p v-if="!latest" class="note mb-0">No sessions yet.</p>
              <ParentSessionCard v-else :session="latest" :child="selectedChild">
                <!-- the AI summary, under the academic details -->
                <template #academic-extra>
                  <HandoverCard
                    v-if="handover || handoverLoading"
                    :handover="handover"
                    :loading="handoverLoading"
                    audience="parent"
                    title="AI summary"
                  />
                  <div v-else class="small text-muted-cb">No summary yet.</div>
                </template>
              </ParentSessionCard>
            </div>

            <!-- tab: homework = the homework of the child -->
            <div v-else>
              <p v-if="homework.length === 0" class="note mb-0">No homework right now.</p>

              <!-- four small numbers -->
              <div v-else class="homework-status" data-test="homework-status">
                <div class="status-box" :class="{ late: homeworkCounts.late > 0 }"><strong class="fs-4">{{ homeworkCounts.late }}</strong><span class="small text-muted-cb">Late</span></div>
                <div class="status-box"><strong class="fs-4">{{ homeworkCounts.todo - homeworkCounts.late }}</strong><span class="small text-muted-cb">To do</span></div>
                <div class="status-box"><strong class="fs-4">{{ homeworkCounts.waiting }}</strong><span class="small text-muted-cb">Being checked</span></div>
                <div class="status-box"><strong class="fs-4">{{ homeworkCounts.checked }}</strong><span class="small text-muted-cb">Done</span></div>
              </div>

              <!-- group 1: what the child still has to do (the earliest date first) -->
              <div v-if="todoHomework.length > 0" data-test="homework-reminders">
                <h3 class="hw-heading hw-heading-todo">Needs doing at home <span>{{ todoHomework.length }}</span></h3>
                <div v-for="item in todoHomework" :key="item.id" class="hw-item" :class="daysSince(item.dueDate) > 0 ? 'hw-late' : 'hw-todo'" data-test="homework-card">
                  <div class="hw-top">
                    <span class="hw-title">{{ item.title }}</span>
                    <span class="hw-tag">{{ dueLabel(item) }}</span>
                  </div>
                  <div class="small text-muted-cb">{{ item.subject }} &middot; due {{ formatDate(item.dueDate) }}</div>
                  <div v-if="item.details" class="hw-details">{{ item.details }}</div>
                </div>
              </div>

              <!-- group 2: handed in, nothing for the parent to do -->
              <div v-if="waitingHomework.length > 0">
                <h3 class="hw-heading hw-heading-waiting">Handed in, waiting for the volunteer to check <span>{{ waitingHomework.length }}</span></h3>
                <div v-for="item in waitingHomework" :key="item.id" class="hw-item hw-waiting" data-test="homework-card">
                  <div class="hw-top">
                    <span class="hw-title">{{ item.title }}</span>
                    <span class="hw-tag">Being checked</span>
                  </div>
                  <div class="small text-muted-cb">{{ item.subject }}<template v-if="item.completedAt"> &middot; handed in {{ formatDate(item.completedAt) }}</template></div>
                </div>
              </div>

              <!-- group 3: finished, folded away until opened -->
              <div v-if="checkedHomework.length > 0">
                <h3 class="hw-heading hw-heading-done">Checked and finished <span>{{ checkedHomework.length }}</span></h3>
                <button type="button" class="hw-toggle" :aria-expanded="showChecked" @click="showChecked = !showChecked">
                  <span>{{ showChecked ? 'Hide' : 'Show' }} finished homework</span>
                </button>
                <div v-if="showChecked">
                  <!-- tap a finished homework to open it: the result the volunteer wrote in the session form -->
                  <details v-for="item in checkedHomework" :key="item.id" class="hw-item hw-done" data-test="homework-card">
                    <summary>
                      <span class="hw-title">{{ item.title }}</span>
                      <span class="hw-score">{{ scoreOf(sessionFor(item)) || 'Done' }}</span>
                    </summary>
                    <div class="small text-muted-cb">
                      {{ item.subject }}
                      <template v-if="item.completedAt"> &middot; handed in {{ formatDate(item.completedAt) }}</template>
                      &middot; +{{ item.points }} ⭐
                    </div>

                    <template v-if="sessionFor(item)">
                      <div v-if="MOOD_WORDS[sessionFor(item).mood]" class="small mt-2">How {{ childName }} felt: {{ MOOD_WORDS[sessionFor(item).mood] }}</div>
                      <div v-if="sessionFor(item).struggles && sessionFor(item).struggles.length" class="hw-box hw-box-tricky">
                        <span class="hw-box-label">A bit tricky</span>
                        {{ sessionFor(item).struggles.join('; ') }}
                      </div>
                      <div v-if="sessionFor(item).whatWorked" class="hw-box hw-box-helped">
                        <span class="hw-box-label">What helped</span>
                        {{ sessionFor(item).whatWorked }}
                      </div>
                      <div v-if="sessionFor(item).nextStep" class="hw-box hw-box-next">
                        <span class="hw-box-label">Coming up next</span>
                        {{ sessionFor(item).nextStep }}
                      </div>
                      <div v-if="sessionFor(item).notes" class="hw-box hw-box-note">
                        <span class="hw-box-label">Note from the volunteer</span>
                        "{{ sessionFor(item).notes }}"
                      </div>
                      <div v-if="sessionFor(item).photos && sessionFor(item).photos.length" class="hw-photos">
                        <img v-for="(photo, number) in sessionFor(item).photos" :key="number" :src="photo" alt="Photo from the session" />
                      </div>
                    </template>
                    <div v-else class="small text-muted-cb mt-2" data-test="no-result">No result recorded yet.</div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <PeelCard title="Progress over time" icon="bi-graph-up-arrow" :initial-open="true">
        <SkillProgressChart :sessions="sessions" />
      </PeelCard>

    </template>
  </div>
</template>
