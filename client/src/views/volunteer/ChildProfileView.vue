<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import { daysSince, firstName, formatDate } from '@/utils/format'
import { levelFor, earnedBadges } from '@/utils/gamification'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import StateMessage from '@/components/StateMessage.vue'
import HandoverCard from '@/components/HandoverCard.vue'
import SessionCard from '@/components/SessionCard.vue'
import HomeworkQuestCard from '@/components/HomeworkQuestCard.vue'
import SkillProgressChart from '@/components/charts/SkillProgressChart.vue'
import TopicSummaryChart from '@/components/charts/TopicSummaryChart.vue'
import PeelCard from '@/components/PeelCard.vue'
import ChildInitial from '@/components/ChildInitial.vue'
import '@/css/volunteer/volunteershared.css' // what the volunteer pages have in common
import '@/css/main/labels.css' // the capital-letter captions

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const childId = route.params.id

const child = ref(null)
const sessions = ref([])
const homework = ref([])
const handover = ref(null)
const handoverLoading = ref(false)
const loading = ref(true)
const success = ref('')
const error = ref('')
const verifyImpact = ref('')  // brief message shown to the volunteer after checking a quest

// the homework in the order a volunteer needs it: overdue, to do, waiting to be checked, checked
function homeworkRank(h) {
  if (h.status === 'verified') return 3
  if (h.status === 'submitted') return 2
  return daysSince(h.dueDate) > 0 ? 0 : 1
}

const activeHomework = computed(() =>
  [...homework.value]
    .filter(h => h.status !== 'verified')
    .sort((a, b) => homeworkRank(a) - homeworkRank(b))
)

const completedHomework = computed(() =>
  [...homework.value]
    .filter(h => h.status === 'verified')
    .sort((a, b) => {
      const dateA = a.completedAt || ''
      const dateB = b.completedAt || ''
      return dateB.localeCompare(dateA)
    })
)

async function loadHandover() {
  handoverLoading.value = true
  try {
    const response = await api.post(`/handover/${childId}`)
    handover.value = response.data
  } catch {
    handover.value = null // the rest of the page still works without the summary
  }
  handoverLoading.value = false
}

// child overview for coordinator only
const volunteers = ref([]) // all the volunteers, so we can show their names

async function loadVolunteers() {
  try {
    const response = await api.get('/users', { params: { role: 'volunteer' } })
    volunteers.value = response.data
  } catch {
    volunteers.value = [] // the names show as 'A volunteer' instead
  }
}

// a volunteer's first name from their id, e.g. 'u_vol1' -> 'Aisha'
function volunteerName(volunteerId) {
  for (const volunteer of volunteers.value) {
    if (volunteer.id === volunteerId) {
      return firstName(volunteer.name)
    }
  }
  return 'A volunteer' // not found
}

function plural(count, word) {
  if (count === 1) {
    return `1 ${word}`
  }
  return `${count} ${word}s`
}

// the sessions, newest first
const newestFirst = computed(() => {
  const list = [...sessions.value] // a copy, so the list on the page is not changed
  list.sort((a, b) => b.date.localeCompare(a.date))
  return list
})

// Who sees this child, and when.
// e.g. 'Aisha: Mon 16:00, Wed 12:00. Daniel: Tue 16:00 (waiting to accept).'
function scheduleText() {
  // 1. put the days of each volunteer together, e.g. { u_vol1: ['Mon 16:00', 'Wed 12:00'] }
  const daysByVolunteer = {}
  const schedule = child.value.schedule || []
  for (const slot of schedule) {
    if (slot.status === 'declined') {
      continue // the volunteer said no, so skip it
    }

    let text = slot.day // e.g. 'Mon'
    if (slot.time) {
      text = `${slot.day} ${slot.time}` // e.g. 'Mon 16:00'
    }
    if (slot.status === 'pending') {
      text = text + ' (waiting to accept)'
    }

    if (!daysByVolunteer[slot.volunteerId]) {
      daysByVolunteer[slot.volunteerId] = [] // first day of this volunteer: start an empty list
    }
    daysByVolunteer[slot.volunteerId].push(text)
  }

  // 2. one sentence for each volunteer, e.g. 'Aisha: Mon 16:00, Wed 12:00.'
  const sentences = []
  for (const volunteerId of Object.keys(daysByVolunteer)) {
    const days = daysByVolunteer[volunteerId].join(', ')
    sentences.push(`${volunteerName(volunteerId)}: ${days}.`)
  }
  return sentences.join(' ') // '' if there is no volunteer yet
}

// alert = true when the coordinator should do something (shown with a red "!" in front).
// followUp = a few words for the summary line at the top
const overviewRows = computed(() => {
  if (!child.value) {
    return [] // the child has not loaded yet
  }
  const rows = []

  // Volunteers: who teaches the child, and when
  const schedule = scheduleText()
  if (schedule === '') {
    rows.push({ label: 'Volunteers', icon: 'bi-people', text: 'No volunteer yet. Find one in Matchmaking.', alert: true, followUp: 'no volunteer yet' })
  } else {
    rows.push({ label: 'Volunteers', icon: 'bi-people', text: schedule, alert: false })
  }

  // Attendance: when the child last came
  if (newestFirst.value.length === 0) {
    rows.push({ label: 'Attendance', icon: 'bi-calendar-check', text: 'No sessions recorded yet.', alert: false })
  } else {
    const lastSession = newestFirst.value[0]
    const days = daysSince(lastSession.date)
    if (days > 7) {
      // more than a week: worth following up (same rule as "Not seen" on the dashboard)
      rows.push({
        label: 'Attendance',
        icon: 'bi-calendar-check',
        text: `Not seen for ${days} days (last on ${formatDate(lastSession.date)}).`,
        alert: true,
        followUp: `not seen for ${days} days`,
      })
    } else {
      let when = `${days} days ago`
      if (days === 0) {
        when = 'today'
      }
      if (days === 1) {
        when = 'yesterday'
      }
      rows.push({ label: 'Attendance', icon: 'bi-calendar-check', text: `Last session ${when} (${formatDate(lastSession.date)}).`, alert: false })
    }
  }

  // Latest Note: what the volunteer wrote last time, so the coordinator sees the "why"
  for (const session of newestFirst.value) {
    const note = session.notes || session.socialNotes || ''
    if (note !== '') {
      const writer = firstName(session.volunteerName || 'A volunteer')
      rows.push({
        label: 'Latest Note',
        icon: 'bi-chat-quote',
        text: `"${note}" (${writer}, ${formatDate(session.date)})`,
        alert: false,
      })
      break // only the newest one
    }
  }

  // Wellbeing: mood and eating in the last 3 sessions
  const lastThree = newestFirst.value.slice(0, 3)
  if (lastThree.length > 0) {
    let lowMoods = 0 // how many sessions they were tired or frustrated
    let happy = 0 // how many sessions they were happy
    const ateLittleOn = [] // the dates they ate little or nothing
    for (const session of lastThree) {
      if (session.mood === 'tired' || session.mood === 'frustrated') {
        lowMoods = lowMoods + 1
      }
      if (session.mood === 'happy') {
        happy = happy + 1
      }
      if (session.portion === 'Little' || session.portion === 'None') {
        ateLittleOn.push(formatDate(session.date))
      }
    }

    // no low moods: say what the volunteers saw, e.g. 'Happy in the last 3 sessions.'
    let text = `Happy or okay in the last ${plural(lastThree.length, 'session')}.`
    if (happy === lastThree.length) {
      text = `Happy in the last ${plural(lastThree.length, 'session')}.`
    }
    if (lowMoods === 1) {
      text = `Tired or frustrated once in the last ${plural(lastThree.length, 'session')}.`
    }
    if (lowMoods >= 2) {
      text = `Tired or frustrated in ${lowMoods} of the last ${plural(lastThree.length, 'session')}. Worth a check-in with the parent.`
    }
    if (ateLittleOn.length > 0) {
      text = text + ` Ate little on ${ateLittleOn.join(' and ')}.`
    }
    rows.push({ label: 'Wellbeing', icon: 'bi-emoji-smile', text: text, alert: lowMoods >= 2, followUp: 'tired or frustrated lately' })
  }

  // Homework
  let overdue = 0
  let todo = 0
  let waiting = 0
  for (const item of homework.value) {
    if (item.status === 'submitted') {
      waiting = waiting + 1 // the child handed it in, the volunteer has not checked it yet
    } else if (item.status === 'assigned' && daysSince(item.dueDate) > 0) {
      overdue = overdue + 1 // not done, and the due date has passed
    } else if (item.status === 'assigned') {
      todo = todo + 1 // not done, but there is still time
    }
  }
  const parts = []
  if (overdue > 0) {
    parts.push(`${overdue} overdue`)
  }
  if (todo > 0) {
    parts.push(`${todo} to do`)
  }
  if (waiting > 0) {
    parts.push(`${waiting} waiting to be checked`)
  }
  let homeworkText = 'Nothing pending.'
  if (parts.length > 0) {
    homeworkText = parts.join(', ') + '.' // e.g. '1 overdue, 2 to do.'
  }
  rows.push({ label: 'Homework', icon: 'bi-journal-check', text: homeworkText, alert: overdue > 0, followUp: 'overdue homework' })

  return rows
})

// at the top of the card
// e.g. '2 things to follow up: not seen for 17 days, overdue homework.'  or  'Nothing to follow up.'
const followUpText = computed(() => {
  const things = []
  for (const row of overviewRows.value) {
    if (row.alert) {
      things.push(row.followUp)
    }
  }
  if (things.length === 0) {
    return 'Nothing to follow up.'
  }
  return `${plural(things.length, 'thing')} to follow up: ${things.join(', ')}.`
})

async function loadHomework() {
  try {
    const h = await api.get('/homework', { params: { childId } })
    homework.value = h.data
  } catch {
    // silent — background refresh
  }
}

async function loadData() {
  try {
    const [c, s, h] = await Promise.all([
      api.get(`/children/${childId}`),
      api.get('/sessions', { params: { childId } }),
      api.get('/homework', { params: { childId } }),
    ])
    child.value = c.data
    sessions.value = s.data
    homework.value = h.data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

function editSession(sessionId) {
  router.push({ name: 'session-edit', params: { sessionId } })
}

function editHomework(homeworkId) {
  router.push({ name: 'homework-edit', params: { id: childId, homeworkId } })
}
// The child handed a quest in; the volunteer checks it and the child is paid the berries (PUT /homework/:id/verify)
const checkingQuestId = ref(null)
const rejectPendingId = ref(null)
const rejectMsg = ref('')
async function verifyQuest(homeworkId) {
  checkingQuestId.value = homeworkId
  const prevPoints     = child.value?.points || 0
  const prevBadgeCount = earnedBadges(child.value || {}, homework.value).length
  try {
    const res = await api.put(`/homework/${homeworkId}/verify`)
    const h   = await api.get('/homework', { params: { childId } })
    homework.value = h.data
    if (child.value) child.value.points = res.data.points

    const name        = firstName(child.value?.name || 'The child')
    const newLevel    = levelFor(res.data.points).level
    const prevLevel   = levelFor(prevPoints).level
    const newBadgeCount = earnedBadges(child.value, homework.value).length

    if (newLevel > prevLevel) {
      verifyImpact.value = `${name} levelled up to Level ${newLevel}!`
    } else if (newBadgeCount > prevBadgeCount) {
      verifyImpact.value = `${name} just earned a new kueh badge!`
    } else {
      verifyImpact.value = `+${res.data.pointsAwarded} ★ awarded to ${name}`
    }
    setTimeout(() => { verifyImpact.value = '' }, 5000)
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    checkingQuestId.value = null
  }
}

async function deleteHomework(homeworkId) {
  try {
    await api.delete(`/homework/${homeworkId}`)
    homework.value = homework.value.filter((h) => h.id !== homeworkId)
  } catch (err) {
    error.value = errorMessage(err)
  }
}

function rejectQuest(homeworkId) {
  rejectPendingId.value = homeworkId
  rejectMsg.value = ''
}

async function confirmReject() {
  try {
    await api.put(`/homework/${rejectPendingId.value}/reject`, { message: rejectMsg.value })
    const h = await api.get('/homework', { params: { childId } })
    homework.value = h.data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    rejectPendingId.value = null
    rejectMsg.value = ''
  }
}

async function deleteSession(sessionId) {
  try {
    await api.delete(`/sessions/${sessionId}`)

    success.value = 'Session deleted successfully'

    await loadData() // reload data after successful deletion
    if (auth.role === 'volunteer') loadHandover() // the summary changes when a session is deleted
  } catch (err) {
    error.value = errorMessage(err)
  }
}

onMounted(() => {
  success.value = route.query.success || ''

  // remove success message from URL after reading it
  if (route.query.success) {
    router.replace({
      name: 'child-profile',
      params: {id: childId}
    })
  }

  // start both at the same time: the summary only needs childId,
  // so it does not have to wait for the child, sessions and homework
  loadData()
  if (auth.role === 'volunteer') {
    loadHandover() // the AI handover is a note for the next volunteer
  } else if (auth.role === 'coordinator') {
    loadVolunteers() // for the names in the Overview
  }
  window.addEventListener('bell-refresh', loadHomework)
})

onUnmounted(() => {
  window.removeEventListener('bell-refresh', loadHomework)
})
</script>

<template>
  <div class="container py-4 childprofilepage">
    <StateMessage v-if="loading" type="loading" />

    <template v-else>
      <div v-if="success" class="alert alert-success">{{ success }}</div>
      <StateMessage v-else-if="error" type="error" :message="error" />

      <Transition name="verify-impact">
        <div v-if="verifyImpact" class="verify-impact-toast" role="status">
          <i class="bi bi-patch-check-fill me-2"></i>{{ verifyImpact }}
        </div>
      </Transition>

      <RouterLink
        v-if="auth.role === 'volunteer' || auth.role === 'coordinator'"
        class="back-link"
        :to="{ name: auth.role === 'coordinator' ? 'manage-children' : 'volunteer-home' }"
      >
        <i class="bi bi-chevron-left"></i>Back
      </RouterLink>

      <PageHeader :title="child.name" :subtitle="`${child.level} · ${child.school}`">
        <template #lead>
          <ChildInitial :child="child" />
        </template>
        <RouterLink
          v-if="auth.role === 'volunteer'"
          :to="{ name: 'session-new', params: { id: child.id } }"
          class="btn btn-primary"
          data-test="record-session"
        >
          <i class="bi bi-plus-lg me-1"></i>Record Session
        </RouterLink>
        <RouterLink
          v-if="auth.role === 'volunteer'"
          :to="{ name: 'homework-new', params: { id: child.id } }"
          class="btn btn-outline-primary"
          data-test="assign-homework"
        >
          <i class="bi bi-journal-plus me-1"></i>Assign Homework
        </RouterLink>
        <!-- Coordinators only: volunteers can't use Messages (chat is parent <-> coordinator) -->
        <RouterLink
          v-if="auth.role === 'coordinator'"
          :to="{ name: 'messages', params: { childId: child.id } }"
          class="btn btn-outline-secondary"
        >
          <i class="bi bi-chat-dots me-1"></i>Message Parent
        </RouterLink>
      </PageHeader>

      <!-- the sandy board that holds the sections -->
      <div class="board">
        <div class="row g-4">
          <div class="col-lg-7">
            <!-- volunteer: what to teach next session (AI) -->
            <HandoverCard v-if="auth.role === 'volunteer'" :handover="handover" :loading="handoverLoading" class="mb-4" />

            <!-- coordinator: how the child is doing overall -->
            <div v-else-if="auth.role === 'coordinator'" class="care-card mb-4" data-test="care-overview">
              <h2 class="handover-title care-title"><i class="bi bi-clipboard2-pulse me-2"></i>Overview</h2>
              <!-- the one line that answers "does this child need me?" -->
              <p class="care-summary" :class="{ 'care-summary-alert': followUpText !== 'Nothing to follow up.' }" data-test="care-summary">
                <i
                  class="bi me-1"
                  :class="followUpText === 'Nothing to follow up.' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'"
                ></i>{{ followUpText }}
              </p>
              <dl class="row mb-0">
                <template v-for="row in overviewRows" :key="row.label">
                  <dt class="col-12 col-sm-4 small handover-key">
                    <i class="bi me-1" :class="row.icon"></i>{{ row.label }}
                  </dt>
                  <dd class="col-12 col-sm-8 fw-semibold handover-value">
                    <!-- something to follow up: a red "!" in front -->
                    <i v-if="row.alert" class="bi bi-exclamation-circle-fill care-alert me-1" aria-label="Needs follow-up"></i>{{ row.text }}
                  </dd>
                </template>
              </dl>
            </div>

              <StateMessage v-if="sessions.length === 0" message="No sessions recorded yet." />
              <div class="d-flex flex-column gap-3">
                <SessionCard
                  v-for="s in sessions"
                  :key="s.id"
                  :session="s"
                  :can-edit="s.volunteerId === auth.user?.id"
                  @edit="editSession"
                  @delete="deleteSession"
                />
              </div>
          </div>

          <div class="col-lg-5 d-flex flex-column gap-4">
            <PeelCard title="Skill Progress" icon="bi-graph-up-arrow" :initial-open="true">
              <SkillProgressChart :sessions="sessions" :calm="auth.role === 'volunteer'" explain />
            </PeelCard>

            <PeelCard title="Subject Summary" icon="bi-pie-chart" :initial-open="true">
              <TopicSummaryChart :sessions="sessions" :calm="auth.role === 'volunteer'" />
            </PeelCard>

            <PeelCard
              :title="`Pending Homework (${activeHomework.length})`"
              icon="bi-journal-check"
              :initial-open="true"
            >
              <div class="d-flex flex-column gap-2">
                <HomeworkQuestCard
                  v-for="h in activeHomework"
                  :key="h.id"
                  :homework="h"
                  mode="volunteer"
                  :readonly="auth.role !== 'volunteer'"
                  :busy="checkingQuestId !== null"
                  @verify="verifyQuest"
                  @reject="rejectQuest"
                  @edit="editHomework"
                  @delete="deleteHomework"
                />
              </div>
            </PeelCard>
            
            <PeelCard
            v-if="completedHomework.length"
            :title="`Completed Homework (${completedHomework.length})`"
            icon="bi-check-circle-fill"
            :initial-open="true"
            >
              <div class="d-flex flex-column gap-2">
              <HomeworkQuestCard
              v-for="h in completedHomework"
              :key="h.id"
              :homework="h"
              mode="volunteer"
              :readonly="auth.role !== 'volunteer'"
              />
              </div>
            </PeelCard>
          </div>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="rejectPendingId" class="modal fade show d-block" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Return Quest</h5>
            </div>
            <div class="modal-body">
              <p class="mb-2" style="font-size:14px">The quest goes back to the child as "assigned". Leave a note so they know what to fix (optional).</p>
              <textarea
                v-model="rejectMsg"
                class="form-control"
                rows="3"
                maxlength="300"
                placeholder="e.g. Please write in full sentences."
                style="font-size:14px; resize:none;"
              ></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-danger btn-sm" @click="rejectPendingId = null">Cancel</button>
              <button type="button" class="btn btn-danger btn-sm" @click="confirmReject">
                <i class="bi bi-arrow-return-left me-1"></i>Return Quest
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="rejectPendingId" class="modal-backdrop fade show"></div>
    </Teleport>
  </div>
</template>

<style>
/* the text of the page: the same size and weight as a volunteer sees (volunteershared.css), in the coordinator's colours */
.role-coordinator .childprofilepage {
  color: var(--cp-text);
}

.role-coordinator .childprofilepage .lapis-page-header .page-title {
  color: #5B4B8A;
}

/* the Edit buttons on a session and on a homework: the same pale green as a volunteer sees */
.role-coordinator .childprofilepage .btn-outline-primary {
  background: #CDE9D8;
}

.role-coordinator .childprofilepage .btn-outline-primary:hover {
  background: #9BD3B2;
}

.role-coordinator .childprofilepage .lapis-page-header .page-subtitle {
  color: #7D7690;
}

/* the whole page */

/* the board: the sandy box that holds the sections */
.childprofilepage .alert {
  border: 0;
  border-radius: 14px;
  background: var(--cp-teal);
  color: var(--cp-text);
}

/* the way back, the name and the buttons */

.childprofilepage .back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 14px 3px 10px;
  border-radius: 6px;
  background: var(--cp-lightest);
  color: var(--cp-text);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.childprofilepage .back-link:hover {
  background: var(--cp-soft);
}

.childprofilepage .back-link i {
  color: var(--cp-deep);
}

.childprofilepage .child-initial {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--cp-letter);
  font-size: 22px;
  font-weight: 700;
}

/* the buttons of the page: round pills, no capital letters */
.childprofilepage .btn {
  border: 0;
  border-radius: 5px;
  box-shadow: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.childprofilepage .btn-primary {
  background: var(--cp-main);
  color: var(--cp-main-text);
}

.childprofilepage .btn-primary:hover {
  background: var(--cp-main-hover);
  color: var(--cp-main-text);
}

.childprofilepage .btn-outline-primary,
.childprofilepage .btn-outline-secondary {
  background: var(--cp-soft);
  color: var(--cp-text);
}

.childprofilepage .btn-outline-primary:hover,
.childprofilepage .btn-outline-secondary:hover {
  background: var(--cp-letter);
  color: var(--cp-text);
}

/* Edit and Mark as Checked are the same pale green for a volunteer, so they are told apart by size and icon:
   the action that matters (Mark as Checked, Return) is bigger, the everyday ones (Edit, Delete) are smaller */
.childprofilepage .quest-check,
.childprofilepage .quest-return {
  padding: 3px 9px;
  font-size: 13px;
}

.childprofilepage .quest-edit,
.childprofilepage .quest-delete {
  padding: 3px 9px;
  font-size: 13px;
}

.role-volunteer .childprofilepage .quest-check {
  background: var(--cp-soft);
  color: #000000;
}

.role-volunteer .childprofilepage .quest-check:hover {
  background: var(--cp-letter);
  color: #000000;
}

/* delete and overdue are the same soft red */
.childprofilepage .btn-outline-danger {
  background: #EE9F96;
  color: var(--cp-text);
}

.childprofilepage .btn-outline-danger:hover {
  background: #E68C81;
  color: var(--cp-text);
}

/* Return: black words on a deeper soft red, like the black words of Mark as Checked */
.childprofilepage .btn-outline-danger.quest-return {
  background: #D9776B;
  color: #000000;
}

.childprofilepage .btn-outline-danger.quest-return:hover {
  background: #CC6659;
  color: #000000;
}

.childprofilepage .btn-link {
  color: var(--cp-deep);
  font-size: 13px;
  text-decoration: underline;
}

/* the sections (the handover and the PeelCard sections) */

.childprofilepage .peel-card,
.childprofilepage .handover-card {
  border: 0;
  border-radius: 22px;
  background: #FFFFFF;
  box-shadow: 0 1px 6px var(--cp-shadow);
}

.childprofilepage .handover-card {
  background: var(--cp-teal);
  box-shadow: none;
}

.childprofilepage .peel-header,
.childprofilepage .handover-header {
  padding: 16px 20px;
  background: transparent;
}

.childprofilepage .peel-header:hover,
.childprofilepage .handover-header:hover {
  background: transparent;
}

.childprofilepage .peel-card--open .peel-header,
.childprofilepage .handover-card--open .handover-header {
  border-bottom: 0;
}

.childprofilepage .peel-title,
.childprofilepage .handover-title {
  font-family: inherit;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--cp-text);
}

.childprofilepage .peel-title i,
.childprofilepage .handover-title i,
.childprofilepage .peel-arrow {
  color: var(--cp-deep);
}

.childprofilepage .peel-body-inner {
  padding: 0 20px 20px;
}

/* the charts sit straight on the section, and the section already has the title */
.childprofilepage [data-test='skill-progress-chart'],
.childprofilepage [data-test='topic-summary-chart'] {
  border: 0;
  background: transparent;
  box-shadow: none;
  padding: 0 !important; /* the chart card has the bootstrap class p-3, which is important */
}

.childprofilepage [data-test='skill-progress-chart'] > h2,
.childprofilepage [data-test='topic-summary-chart'] > h2 {
  display: none;
}

/* the topic bars (TopicSummaryChart.vue with calm): the name and the percentage, then a plain teal bar */
.childprofilepage .topic-bars {
  display: grid;
  gap: 12px;
}

.childprofilepage .topic-bar-top {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.childprofilepage .topic-bar-track {
  height: 12px;
  border-radius: 999px;
  background: var(--cp-track);
  overflow: hidden;
}

.childprofilepage .topic-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--cp-bar);
}

/* the handover */

.childprofilepage .handover-key {
  font-size: 14px;
  color: var(--cp-key);
}

.childprofilepage .handover-value {
  font-weight: 400;
}

/* the small tags (the source of the summary, the topics that keep coming back, the score, the subject, the homework state): the text sits in the middle */
.childprofilepage .handover-badge,
.childprofilepage .session-score,
.childprofilepage .session-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 999px;
  box-shadow: none;
  font-size: 12px;
  font-weight: 700;
}

.childprofilepage .handover-source-ai,
.childprofilepage .handover-source-last {
  background: var(--cp-teal-soft);
  color: var(--cp-text);
}

/* the Overview (coordinator) */

.childprofilepage .care-card {
  padding: 16px 20px 20px;
  border-radius: 22px;
  background: var(--cp-teal);
}

.childprofilepage .care-title {
  margin-bottom: 14px; /* the size and weight come from .handover-title, so it matches the Handover Notes */
}

.childprofilepage .care-title i {
  color: var(--cp-deep);
}

/* the summary line at the top: green tick when all is fine, soft red when something needs following up */
.childprofilepage .care-summary {
  margin-bottom: 14px;
  padding: 8px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.65);
  font-weight: 600;
}

.childprofilepage .care-summary i {
  color: #2E8B57;
}

.childprofilepage .care-summary-alert i {
  color: #C0574B;
}

/* the red "!" in front of a row the coordinator should follow up (the same soft red as overdue) */
.childprofilepage .care-alert {
  color: #C0574B;
}

/* a session */

.childprofilepage .session-card,
.childprofilepage .quest-card {
  border: 0;
  border-radius: 18px;
  background: #F7F4EE;
  box-shadow: none;
}

/* a session on the sandy board is a white card (the homework inside a white section stays warm cream) */
.childprofilepage .board .session-card {
  background: #FFFFFF;
  box-shadow: 0 1px 6px var(--cp-shadow);
}

.childprofilepage .session-title {
  font-size: 16px;
}

/* the grey line under a session and under a homework */
.childprofilepage .session-meta,
.childprofilepage .quest-meta {
  font-size: 13px;
  color: var(--cp-grey);
}

/* the date and the mood chip share one white rounded bar, centred on the same line */
.childprofilepage .session-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 8px; /* a gap under the subject and the topic */
  padding: 4px 12px;
  border-radius: 999px;
  background: #FFFFFF;
}

.childprofilepage .session-mood {
  gap: 5px;
  padding: 0;
  background: transparent; /* the white bar behind the date shows through */
  font-size: 12px;
  line-height: 1; /* a tight line, so the face and the word sit on the same middle line */
}

.childprofilepage .session-score {
  padding: 4px 12px;
  background: var(--cp-teal);
  color: var(--cp-text);
  font-size: 13px;
}

.childprofilepage .session-lines {
  font-size: 14px;
  color: var(--cp-text);
}

.childprofilepage .session-icon {
  color: var(--cp-deep);
}

.childprofilepage .session-tag {
  padding: 2px 10px;
  background: #EEDFA6;
  color: var(--cp-text);
  font-weight: 600;
}

/* a homework: its edge and its tag show where it is */

.childprofilepage .quest-card {
  border-left: 5px solid #CFC9BC;
}

.childprofilepage .quest-late {
  border-left-color: #EE9F96;
}

.childprofilepage .quest-waiting {
  border-left-color: var(--cp-teal);
  border-left-style: dashed;
}

.childprofilepage .quest-check-alert {
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--cp-teal);
  color: var(--cp-text);
  font-size: 14px;
  font-weight: 600;
}

.childprofilepage .quest-done {
  background: #E6F4EC;
  border-left-color: #2E8B57;
}

.childprofilepage .quest-title {
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
}

.childprofilepage .quest-details {
  font-size: 14px;
}

/* toast shown after a quest is checked: fixed at the bottom so it never shifts the layout */
.verify-impact-toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1050;
  padding: 10px 22px;
  border-radius: 99px;
  background: #2E8B57;
  color: #FFFFFF;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  pointer-events: none;
}

.verify-impact-enter-active { animation: verify-toast-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.verify-impact-leave-active { animation: verify-toast-in 0.25s ease-in reverse; }

@keyframes verify-toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(14px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

</style>