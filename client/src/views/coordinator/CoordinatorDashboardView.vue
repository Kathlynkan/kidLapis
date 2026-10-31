<!-- =============================================================
  Coordinator dashboard                               Owner: Yu Xuan
  -------------------------------------------------------------
  KPI cards from GET /dashboard/summary + centre-wide topic chart.
    [x] "Needs attention" list from GET /dashboard/alerts
        (no session in 7 days, recurring struggle, overdue homework, unassigned child)
    [x] filter alerts by type + click a row -> child profile (unassigned -> matchmaking)
    [x] "Flag for follow-up" toggle per child -> PUT /dashboard/follow-up/:childId
    [x] recent activity feed (latest sessions across the centre)
============================================================= -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import PageHeader from '@/components/PageHeader.vue'
import ChildInitial from '@/components/ChildInitial.vue'
import StateMessage from '@/components/StateMessage.vue'
import TopicSummaryChart from '@/components/charts/TopicSummaryChart.vue'
import { firstName } from '@/utils/format'
import '@/css/teacher/teacherpage.css' // the styles of the teacher pages

const router = useRouter()

const summary = ref(null)
const sessions = ref([])
const alerts = ref([])
const children = ref([])
const volunteers = ref([])
const loading = ref(true)
const error = ref('')

const typeFilter = ref('') // '' = all, 'followUp' = flagged children, otherwise an alert type
const busyChildId = ref(null)
const actionError = ref('')

// One place that says how each alert type looks: its name and its tag colour.
// Red for the three that need action, muted yellow for a child who is struggling.
const ALERT_TYPES = {
  unassigned: 'No volunteer',
  'no-session': 'Not seen',
  'repeated-struggle': 'Struggling',
  'overdue-homework': 'Overdue',
}
const TAG_CLASS = {
  unassigned: 'tag-red',
  'no-session': 'tag-red',
  'overdue-homework': 'tag-red',
  'repeated-struggle': 'tag-struggle',
}

onMounted(async () => {
  try {
    const [sum, s, a, c, v] = await Promise.all([
      api.get('/dashboard/summary'),
      api.get('/sessions'),
      api.get('/dashboard/alerts'),
      api.get('/children'),
      api.get('/users', { params: { role: 'volunteer' } }),
    ])
    summary.value = sum.data
    sessions.value = s.data
    alerts.value = a.data
    children.value = c.data
    volunteers.value = v.data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})

// ---------- Needs attention ----------

// How many alerts of each type, for the numbers on the filter chips.
const countByType = computed(() => {
  const counts = {}
  for (const a of alerts.value) counts[a.type] = (counts[a.type] || 0) + 1
  return counts
})

const flaggedCount = computed(() => new Set(alerts.value.filter((a) => a.followUp).map((a) => a.childId)).size)

const filteredAlerts = computed(() => {
  if (!typeFilter.value) return alerts.value
  if (typeFilter.value === 'followUp') return alerts.value.filter((a) => a.followUp)
  return alerts.value.filter((a) => a.type === typeFilter.value)
})

// The "Homework pending" tile: show the overdue homework alerts and scroll down to them.
function showOverdue() {
  typeFilter.value = 'overdue-homework'
  document.getElementById('needs-attention')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Unassigned children go to matchmaking (that's the fix); everyone else to their profile.
function openChild(alert) {
  if (alert.type === 'unassigned') {
    router.push({ name: 'matchmaking', params: { childId: alert.childId } })
  } else {
    router.push({ name: 'child-profile', params: { id: alert.childId } })
  }
}

async function toggleFollowUp(alert) {
  const next = !alert.followUp
  busyChildId.value = alert.childId
  actionError.value = ''
  try {
    await api.put(`/dashboard/follow-up/${alert.childId}`, { followUp: next })
    // A child can have several alerts: update every row for that child.
    alerts.value.forEach((a) => {
      if (a.childId === alert.childId) a.followUp = next
    })
  } catch (err) {
    actionError.value = errorMessage(err)
  } finally {
    busyChildId.value = null
  }
}

// ---------- Recent activity ----------

const nameById = (list) => Object.fromEntries(list.map((x) => [x.id, x.name]))
const childNames = computed(() => nameById(children.value))
const volunteerNames = computed(() => nameById(volunteers.value))

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
  <div class="container py-4 teacherpage">
    <PageHeader title="Centre dashboard" subtitle="See who needs follow-up at a glance." />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <!-- the counts -->
      <div class="tiles">
        <RouterLink to="/teacher/children" class="tile" data-test="tile-children">
          <span class="tile-value">{{ summary.totalChildren }}</span>
          <span class="tile-label"><i class="bi bi-people"></i>Children</span>
        </RouterLink>
        <RouterLink to="/teacher/volunteers" class="tile" data-test="tile-volunteers">
          <span class="tile-value">{{ summary.totalVolunteers }}</span>
          <span class="tile-label"><i class="bi bi-person-heart"></i>Volunteers</span>
        </RouterLink>
        <RouterLink to="/teacher/schedule" class="tile" data-test="tile-sessions">
          <span class="tile-value">{{ summary.sessionsThisWeek }}</span>
          <span class="tile-label"><i class="bi bi-journal-check"></i>Sessions this week</span>
        </RouterLink>
        <!-- there is no homework page for the teacher, so this one shows the overdue homework in the list below -->
        <button type="button" class="tile" data-test="tile-homework" @click="showOverdue">
          <span class="tile-value">{{ summary.homeworkPending }}</span>
          <span class="tile-label"><i class="bi bi-hourglass-split"></i>Homework pending</span>
        </button>
      </div>

      <!-- the sandy board: the filters and the white cards -->
      <div id="needs-attention" class="board">
        <div class="filters" role="group" aria-label="Show" data-test="alert-type-filter">
          <button
            type="button"
            class="chip"
            :aria-pressed="typeFilter === ''"
            data-test="alert-filter-all"
            @click="typeFilter = ''"
          >
            All<span class="chip-count">{{ alerts.length }}</span>
          </button>
          <button
            v-for="(label, type) in ALERT_TYPES"
            :key="type"
            type="button"
            class="chip"
            :aria-pressed="typeFilter === type"
            :data-test="`alert-filter-${type}`"
            @click="typeFilter = type"
          >
            {{ label }}<span class="chip-count">{{ countByType[type] || 0 }}</span>
          </button>
          <button
            type="button"
            class="chip"
            :aria-pressed="typeFilter === 'followUp'"
            data-test="alert-filter-followUp"
            @click="typeFilter = 'followUp'"
          >
            Flagged<span class="chip-count">{{ flaggedCount }}</span>
          </button>
        </div>

        <div v-if="actionError" class="note note-bad">{{ actionError }}</div>

        <div class="cols">
          <!-- Needs attention -->
          <section class="t-card">
            <div class="card-head">
              <h2>Needs attention</h2>
              <span class="tag">{{ filteredAlerts.length }} shown</span>
            </div>

            <div v-if="!alerts.length" class="empty" data-test="no-alerts">
              <strong>All clear</strong>
              Nothing needs attention right now. Every child has a volunteer and a recent session.
            </div>
            <div v-else-if="!filteredAlerts.length" class="empty">
              <strong>Nothing of this kind</strong>
              Choose "All" to see everything.
            </div>

            <div v-else class="list" data-test="alerts-table">
              <div
                v-for="a in filteredAlerts"
                :key="a.id"
                class="alert-row"
                data-test="alert-row"
                @click="openChild(a)"
              >
                <ChildInitial :child="{ name: a.childName || '?', avatar: a.avatar }" />
                <div class="alert-body">
                  <span class="alert-who">
                    <RouterLink
                      :to="
                        a.type === 'unassigned'
                          ? { name: 'matchmaking', params: { childId: a.childId } }
                          : { name: 'child-profile', params: { id: a.childId } }
                      "
                      @click.stop
                    >
                      {{ a.childName }}
                    </RouterLink>
                    <span class="tag" :class="TAG_CLASS[a.type]">{{ ALERT_TYPES[a.type] }}</span>
                  </span>
                  <span class="alert-msg">{{ a.message }}</span>
                </div>
                <div class="alert-actions">
                  <button
                    class="flag-btn"
                    :disabled="busyChildId === a.childId"
                    :aria-pressed="a.followUp"
                    :title="a.followUp ? 'Remove follow-up flag' : 'Flag for follow-up'"
                    data-test="follow-up-toggle"
                    @click.stop="toggleFollowUp(a)"
                  >
                    <i class="bi" :class="a.followUp ? 'bi-flag-fill' : 'bi-flag'"></i>
                    <span class="visually-hidden">{{ a.followUp ? 'Flagged' : 'Flag for follow-up' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div class="side">
            <TopicSummaryChart :sessions="sessions" title="Accuracy by subject" calm />

            <!-- Recent activity -->
            <section class="t-card" data-test="activity-feed">
              <div class="card-head"><h2>Recent sessions</h2></div>
              <p v-if="!recentSessions.length" class="empty">No sessions logged yet.</p>
              <ul v-else class="recent">
                <li v-for="s in recentSessions" :key="s.id">
                  <ChildInitial class="small" :child="{ name: volunteerNames[s.volunteerId] || 'Someone' }" />
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
