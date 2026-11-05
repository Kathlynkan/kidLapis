<script setup>
import { ref, computed, onMounted } from 'vue'
import { useScheduleChanged } from '@/composables/useScheduleChanged'
import { useRouter } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import PageHeader from '@/components/PageHeader.vue'
import ChildInitial from '@/components/ChildInitial.vue'
import StateMessage from '@/components/StateMessage.vue'
import TopicSummaryChart from '@/components/charts/TopicSummaryChart.vue'
import WeekScheduleCard from '@/components/WeekScheduleCard.vue'
import WeekdayDots from '@/components/WeekdayDots.vue'
import { firstName } from '@/utils/format'
import { isConfirmed, isPending } from '@/utils/slots'
import '@/css/coordinator/coordinatorpage.css' // the styles of the coordinator pages

const router = useRouter()

const summary = ref(null)
const sessions = ref([])
const children = ref([])
const volunteers = ref([])
const loading = ref(true)
const error = ref('')

const statusFilter = ref('') // '' = all, 'followUp' = flagged children, otherwise a status below
const busyChildId = ref(null)
const actionError = ref('')

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// One place that says how each status looks: its name and its tag colour.
const STATUS = {
  none: { label: 'No volunteer', tag: 'tag-red' },
  some: { label: 'Some days', tag: 'tag-struggle' },
  all: { label: 'Every weekday', tag: 'tag-ok' },
}

async function loadDashboard() {
  const [sum, s, c, v] = await Promise.all([
    api.get('/dashboard/summary'),
    api.get('/sessions'),
    api.get('/children'),
    api.get('/users', { params: { role: 'volunteer' } }),
  ])
  summary.value = sum.data
  sessions.value = s.data
  children.value = c.data
  volunteers.value = v.data
}


onMounted(async () => {
  try {
    await loadDashboard()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})

// A volunteer accepted/declined a session (live, via the NavBar): reload quietly (Kai Sen)
useScheduleChanged(loadDashboard, { isLoading: loading })

const nameById = (list) => Object.fromEntries(list.map((x) => [x.id, x.name]))
const childNames = computed(() => nameById(children.value))
const volunteerNames = computed(() => nameById(volunteers.value))
// the whole volunteer (with the photo) for each id, for the round picture in Recent Sessions
const volunteerById = computed(() => Object.fromEntries(volunteers.value.map((v) => [v.id, v])))

// Volunteer assignment

// One row per child: which weekdays are covered, a status, and a short sentence.
// Fewest covered days first, so children who need a volunteer are at the top.
const assignments = computed(() =>
  children.value
    .map((child) => {
      const weekday = (s) => WEEKDAYS.includes(s.day)
      const slots = (child.schedule || []).filter((s) => weekday(s) && isConfirmed(s)) // accepted only
      const requests = (child.schedule || []).filter((s) => weekday(s) && isPending(s))
      const covered = WEEKDAYS.filter((d) => slots.some((s) => s.day === d))
      const missing = WEEKDAYS.filter((d) => !covered.includes(d))
      const status = covered.length === 0 ? 'none' : covered.length === WEEKDAYS.length ? 'all' : 'some'

      // "Aisha (Mon, Wed) · Daniel (Tue)"
      const daysByVolunteer = {}
      for (const s of slots) (daysByVolunteer[s.volunteerId] ??= []).push(s.day)
      const who = Object.entries(daysByVolunteer)
        .map(([id, days]) => {
          const name = firstName(volunteerNames.value[id] || 'Volunteer')
          return `${name} (${WEEKDAYS.filter((d) => days.includes(d)).join(', ')})`
        })
        .join(' · ')

      // "Waiting for Priya (Wed)"
      const waitingByVolunteer = {}
      for (const s of requests) (waitingByVolunteer[s.volunteerId] ??= []).push(s.day)
      const waiting = Object.entries(waitingByVolunteer)
        .map(([id, days]) => {
          const name = firstName(volunteerNames.value[id] || 'a volunteer')
          return `Waiting for ${name} (${WEEKDAYS.filter((d) => days.includes(d)).join(', ')})`
        })
        .join(' · ')

      let message
      if (status === 'all') message = who
      else if (status === 'some') message = `${who} · No volunteer on ${missing.join(', ')}`
      else if (waiting) message = 'No volunteer on any weekday yet'
      else if ((child.volunteerIds || []).length) message = 'Assigned, but no weekdays booked yet'
      else message = 'No volunteer on any weekday'
      if (waiting) message += ` · ${waiting}`

      return { child, status, coveredCount: covered.length, message, hasPending: requests.length > 0 }
    })
    .sort((a, b) => a.coveredCount - b.coveredCount || a.child.name.localeCompare(b.child.name)),
)

// How many children have each status, for the numbers on the filter chips.
const countByStatus = computed(() => {
  const counts = { none: 0, some: 0, all: 0 }
  for (const a of assignments.value) counts[a.status]++
  return counts
})

const flaggedCount = computed(() => children.value.filter((c) => c.followUp).length)

const filteredAssignments = computed(() => {
  if (!statusFilter.value) return assignments.value
  if (statusFilter.value === 'followUp') return assignments.value.filter((a) => a.child.followUp)
  return assignments.value.filter((a) => a.status === statusFilter.value)
})

// The fix for any gap is in matchmaking, so a row opens that child there.
function openMatchmaking(child) {
  router.push({ name: 'matchmaking', params: { childId: child.id } })
}

async function toggleFollowUp(child) {
  const next = !child.followUp
  busyChildId.value = child.id
  actionError.value = ''
  try {
    await api.put(`/dashboard/follow-up/${child.id}`, { followUp: next })
    child.followUp = next
  } catch (err) {
    actionError.value = errorMessage(err)
  } finally {
    busyChildId.value = null
  }
}

// Recent activity

const recentSessions = computed(() =>
  [...sessions.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
)

function daysAgo(dateStr) {
  const today = new Date().toLocaleDateString('en-CA') // 'YYYY-MM-DD' in local time
  const days = Math.round((Date.parse(today) - Date.parse(dateStr)) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}
</script>

<template>
  <div class="container py-4 coordinatorpage">
    <PageHeader title="Student Care Dashboard" subtitle="See who needs a volunteer at a glance." />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <!-- the counts -->
      <div class="tiles">
        <RouterLink to="/coordinator/children" class="tile" data-test="tile-children">
          <span class="tile-value">{{ summary.totalChildren }}</span>
          <span class="tile-label"><i class="bi bi-people"></i>Children</span>
        </RouterLink>
        <RouterLink to="/coordinator/volunteers" class="tile" data-test="tile-volunteers">
          <span class="tile-value">{{ summary.totalVolunteers }}</span>
          <span class="tile-label"><i class="bi bi-person-heart"></i>Volunteers</span>
        </RouterLink>
        <RouterLink to="/coordinator/schedule" class="tile" data-test="tile-sessions">
          <span class="tile-value">{{ summary.sessionsThisWeek }}</span>
          <span class="tile-label"><i class="bi bi-journal-check"></i>Sessions this week</span>
        </RouterLink>
        <!-- there is no homework page for the coordinator, so this tile only shows the number -->
        <div class="tile" data-test="tile-homework">
          <span class="tile-value">{{ summary.homeworkPending }}</span>
          <span class="tile-label"><i class="bi bi-hourglass-split"></i>Homework pending</span>
        </div>
      </div>

      <!-- today's sessions + the weekly schedule (editing is on the Schedule page) -->
      <WeekScheduleCard class="mb-4" :volunteers="volunteers" :children="children" />

      <!-- the sandy board: the filters and the white cards -->
      <div id="volunteer-assignment" class="board">
        <div class="filters" role="group" aria-label="Show" data-test="assignment-filter">
          <button
            type="button"
            class="chip"
            :aria-pressed="statusFilter === ''"
            data-test="assignment-filter-all"
            @click="statusFilter = ''"
          >
            All<span class="chip-count">{{ assignments.length }}</span>
          </button>
          <button
            v-for="(info, status) in STATUS"
            :key="status"
            type="button"
            class="chip"
            :aria-pressed="statusFilter === status"
            :data-test="`assignment-filter-${status}`"
            @click="statusFilter = status"
          >
            {{ info.label }}<span class="chip-count">{{ countByStatus[status] }}</span>
          </button>
          <button
            type="button"
            class="chip"
            :aria-pressed="statusFilter === 'followUp'"
            data-test="assignment-filter-followUp"
            @click="statusFilter = 'followUp'"
          >
            Flagged<span class="chip-count">{{ flaggedCount }}</span>
          </button>
        </div>

        <div v-if="actionError" class="note note-bad">{{ actionError }}</div>

        <div class="cols">
          <!-- Volunteer assignment -->
          <section class="t-card">
            <div class="card-head">
              <h2>Volunteer Assignment</h2>
              <span class="tag">{{ filteredAssignments.length }} Shown</span>
            </div>

            <div v-if="!assignments.length" class="empty" data-test="no-children">
              <strong>No children yet</strong>
              Children appear here once they are added.
            </div>
            <div v-else-if="!filteredAssignments.length" class="empty">
              <strong>Nothing of this kind</strong>
              Choose "All" to see every child.
            </div>

            <div v-else class="list" data-test="assignment-list">
              <div
                v-for="a in filteredAssignments"
                :key="a.child.id"
                class="alert-row"
                data-test="assignment-row"
                @click="openMatchmaking(a.child)"
              >
                <ChildInitial :child="a.child" />
                <div class="alert-body">
                  <span class="alert-who">
                    <RouterLink :to="{ name: 'matchmaking', params: { childId: a.child.id } }" @click.stop>
                      {{ a.child.name }}
                    </RouterLink>
                    <WeekdayDots :schedule="a.child.schedule" />
                    <span class="tag" :class="STATUS[a.status].tag" data-test="assignment-status">
                      {{ STATUS[a.status].label }}
                    </span>
                    <span v-if="a.hasPending" class="tag tag-pending" data-test="pending-tag">Pending</span>
                  </span>
                  <span class="alert-msg">{{ a.message }}</span>
                </div>
                <div class="alert-actions">
                  <button
                    type="button"
                    class="flag-btn"
                    :disabled="busyChildId === a.child.id"
                    :aria-pressed="Boolean(a.child.followUp)"
                    :title="a.child.followUp ? 'Remove follow-up flag' : 'Flag for follow-up'"
                    data-test="follow-up-toggle"
                    @click.stop="toggleFollowUp(a.child)"
                  >
                    <i class="bi" :class="a.child.followUp ? 'bi-flag-fill' : 'bi-flag'"></i>
                    <span class="visually-hidden">{{ a.child.followUp ? 'Flagged' : 'Flag for follow-up' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div class="side">
            <TopicSummaryChart :sessions="sessions" title="Accuracy by Subject" calm />

            <!-- Recent activity -->
            <section class="t-card" data-test="activity-feed">
              <div class="card-head"><h2>Recent Sessions</h2></div>
              <p v-if="!recentSessions.length" class="empty">No sessions logged yet.</p>
              <ul v-else class="recent">
                <li v-for="s in recentSessions" :key="s.id">
                  <ChildInitial class="small" :child="volunteerById[s.volunteerId] || { name: 'Someone' }" />
                  <span>
                    <strong>{{ firstName(volunteerNames[s.volunteerId] || 'Someone') }}</strong> worked with
                    <strong>{{ firstName(childNames[s.childId] || 'Someone') }}</strong> on {{ s.topic }}
                    <span v-if="s.attempted">({{ s.correct }}/{{ s.attempted }} correct)</span>
                    <span class="when">{{ s.subject }}, {{ daysAgo(s.date) }}</span>
                  </span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* a request waiting for the volunteer to accept (same amber as the timetable) */
.tag-pending {
  background: #fbefd2;
  color: #8a5a00;
  box-shadow: inset 0 0 0 1px #e0b45a;
}
</style>