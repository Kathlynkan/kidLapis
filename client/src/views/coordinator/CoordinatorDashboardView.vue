<!-- =============================================================
  Coordinator dashboard                               Owner: Yu Xuan
  -------------------------------------------------------------
  KPI cards from GET /dashboard/summary + centre-wide topic chart.
    [x] "Needs attention" table from GET /dashboard/alerts
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
import StatCard from '@/components/StatCard.vue'
import StateMessage from '@/components/StateMessage.vue'
import TopicSummaryChart from '@/components/charts/TopicSummaryChart.vue'
import '@/css/teacher/coordinatordashboard.css' // the styles of this page

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

// One place that says how each alert type and severity looks.
const ALERT_TYPES = {
  unassigned: 'No volunteer',
  'no-session': 'No recent session',
  'repeated-struggle': 'Recurring struggle',
  'overdue-homework': 'Overdue homework',
}
const SEVERITY_CLASS = {
  high: 'bg-danger',
  medium: 'bg-warning text-dark',
  low: 'bg-secondary',
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

// How many alerts of each type, for the filter dropdown labels.
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

const firstName = (name) => (name || 'Someone').split(' ')[0]

function daysAgo(dateStr) {
  const today = new Date().toLocaleDateString('en-CA') // 'YYYY-MM-DD' in local time
  const days = Math.round((Date.parse(today) - Date.parse(dateStr)) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}
</script>

<template>
  <div class="container py-4">
    <PageHeader title="Centre dashboard" subtitle="See who needs follow-up at a glance." />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
          <StatCard label="Children" :value="summary.totalChildren" icon="bi-people" />
        </div>
        <div class="col-6 col-lg-3">
          <StatCard label="Volunteers" :value="summary.totalVolunteers" icon="bi-person-heart" />
        </div>
        <div class="col-6 col-lg-3">
          <StatCard label="Sessions this week" :value="summary.sessionsThisWeek" icon="bi-journal-check" />
        </div>
        <div class="col-6 col-lg-3">
          <StatCard label="Homework pending" :value="summary.homeworkPending" icon="bi-hourglass-split" />
        </div>
      </div>

      <div class="row g-4">
        <!-- Needs attention -->
        <div class="col-lg-7">
          <div class="lapis-card lapis-card-yellow p-3">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h2 class="h6 mb-0"><i class="bi bi-exclamation-triangle me-2"></i>Needs attention</h2>
              <div class="d-flex align-items-center gap-2">
                <label for="alert-filter" class="small mb-0">Show</label>
                <select
                  id="alert-filter"
                  v-model="typeFilter"
                  class="form-select form-select-sm w-auto"
                  data-test="alert-type-filter"
                >
                  <option value="">All ({{ alerts.length }})</option>
                  <option v-for="(label, type) in ALERT_TYPES" :key="type" :value="type">
                    {{ label }} ({{ countByType[type] || 0 }})
                  </option>
                  <option value="followUp">Flagged for follow-up ({{ flaggedCount }})</option>
                </select>
              </div>
            </div>

            <div v-if="actionError" class="alert alert-danger py-2 small">{{ actionError }}</div>

            <p v-if="!alerts.length" class="small lapis-muted mb-0" data-test="no-alerts">
              Nothing needs attention right now. Every child has a volunteer and a recent session.
            </p>
            <p v-else-if="!filteredAlerts.length" class="small lapis-muted mb-0">
              No alerts of this type. Choose "All" to see everything.
            </p>

            <div v-else class="table-responsive">
              <table class="table table-hover align-middle small mb-0" data-test="alerts-table">
                <thead>
                  <tr>
                    <th scope="col">Child</th>
                    <th scope="col">Issue</th>
                    <th scope="col" class="text-end">Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="a in filteredAlerts"
                    :key="a.id"
                    class="alert-row"
                    data-test="alert-row"
                    @click="openChild(a)"
                  >
                    <td class="text-nowrap">
                      <span class="me-1">{{ a.avatar }}</span>
                      <RouterLink
                        :to="
                          a.type === 'unassigned'
                            ? { name: 'matchmaking', params: { childId: a.childId } }
                            : { name: 'child-profile', params: { id: a.childId } }
                        "
                        class="fw-semibold"
                        @click.stop
                      >
                        {{ a.childName }}
                      </RouterLink>
                    </td>
                    <td>
                      <span class="badge me-1" :class="SEVERITY_CLASS[a.severity]">{{ ALERT_TYPES[a.type] }}</span>
                      {{ a.message }}
                    </td>
                    <td class="text-end">
                      <button
                        class="btn btn-sm"
                        :class="a.followUp ? 'btn-warning' : 'btn-outline-secondary'"
                        :disabled="busyChildId === a.childId"
                        :aria-pressed="a.followUp"
                        :title="a.followUp ? 'Remove follow-up flag' : 'Flag for follow-up'"
                        data-test="follow-up-toggle"
                        @click.stop="toggleFollowUp(a)"
                      >
                        <i class="bi" :class="a.followUp ? 'bi-flag-fill' : 'bi-flag'"></i>
                        <span class="visually-hidden">{{ a.followUp ? 'Flagged' : 'Flag for follow-up' }}</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="col-lg-5 d-flex flex-column gap-4">
          <TopicSummaryChart :sessions="sessions" title="Centre-wide accuracy by subject" />

          <!-- Recent activity -->
          <div class="lapis-card p-3" data-test="activity-feed">
            <h2 class="h6"><i class="bi bi-clock-history me-2"></i>Recent sessions</h2>
            <p v-if="!recentSessions.length" class="small lapis-muted mb-0">No sessions logged yet.</p>
            <ul v-else class="list-unstyled small mb-0">
              <li v-for="s in recentSessions" :key="s.id" class="py-2 border-bottom">
                <strong>{{ firstName(volunteerNames[s.volunteerId]) }}</strong> worked with
                <strong>{{ firstName(childNames[s.childId]) }}</strong> on {{ s.topic }}
                <span v-if="s.attempted">({{ s.correct }}/{{ s.attempted }} correct)</span>
                <div class="lapis-muted">{{ s.subject }}, {{ daysAgo(s.date) }}</div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
