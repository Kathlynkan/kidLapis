<!-- =============================================================
  Weekly schedule (timetable)                         Owner: Yu Xuan
  Route: /coordinator/schedule
  -------------------------------------------------------------
  Rows = volunteers, columns = days. Grey cells = volunteer not free.
  "+ Add" -> pick child + start time -> PUT /matchmaking/:childId/assign
  "x" on a session -> removes just that day (unassign with day)
  The server blocks double-bookings (409) and days the volunteer isn't free.
============================================================= -->
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import api, { errorMessage } from '@/services/api'
import PageHeader from '@/components/PageHeader.vue'
import ChildAvatar from '@/components/ChildAvatar.vue'
import StateMessage from '@/components/StateMessage.vue'
import { firstName } from '@/utils/format'
import '@/css/teacher/teacherpage.css' // the styles of the teacher pages

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Start times every 30 minutes from 09:00 to 19:30.
const TIMES = []
for (let h = 9; h <= 19; h++) {
  for (const m of ['00', '30']) TIMES.push(`${String(h).padStart(2, '0')}:${m}`)
}

const TODAY = new Date().toLocaleDateString('en-US', { weekday: 'short' }) // 'Mon'

const volunteers = ref([])
const children = ref([])
const loading = ref(true)
const error = ref('')

const busyKey = ref(null) // which session is being removed
const actionError = ref('')

// "Add a session" dialog
const adding = ref(null) // { volunteer, day } while the dialog is open
const form = ref({ childId: '', time: '' })
const formError = ref('')
const saving = ref(false)

async function loadData() {
  const [v, c] = await Promise.all([
    api.get('/users', { params: { role: 'volunteer' } }),
    api.get('/children'),
  ])
  volunteers.value = v.data
  children.value = c.data
}

onMounted(async () => {
  try {
    await loadData()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

function onKeydown(e) {
  if (e.key === 'Escape' && adding.value && !saving.value) closeAdd()
}

// ---------- Building the grid ----------

// { 'u_vol1|Mon': [{ child, time }, ...] } built once, sorted by time.
const slotsByCell = computed(() => {
  const map = {}
  for (const child of children.value) {
    for (const s of child.schedule || []) {
      ;(map[`${s.volunteerId}|${s.day}`] ??= []).push({ child, time: s.time || '' })
    }
  }
  for (const list of Object.values(map)) {
    list.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')) // no time -> last
  }
  return map
})

const slotsFor = (v, day) => slotsByCell.value[`${v.id}|${day}`] || []
const isFree = (v, day) => (v.availability || []).includes(day)

const sessionCount = computed(() => children.value.reduce((n, c) => n + (c.schedule || []).length, 0))

// Assigned in volunteerIds but no day on the timetable (e.g. assigned before schedules existed).
const unscheduled = computed(() => {
  const volunteerName = Object.fromEntries(volunteers.value.map((v) => [v.id, v.name]))
  const list = []
  for (const c of children.value) {
    for (const vid of c.volunteerIds || []) {
      if (!(c.schedule || []).some((s) => s.volunteerId === vid)) {
        list.push({ key: `${c.id}|${vid}`, child: c, volunteerName: volunteerName[vid] || 'Unknown volunteer' })
      }
    }
  }
  return list
})

// ---------- Add a session ----------

// Children to offer: unassigned first, then best skill match for this volunteer.
// Children already booked with this volunteer on this day are left out.
const childOptions = computed(() => {
  if (!adding.value) return []
  const { volunteer, day } = adding.value
  const skills = volunteer.skills || []
  const bookedHere = new Set(slotsFor(volunteer, day).map((s) => s.child.id))

  return children.value
    .filter((c) => !bookedHere.has(c.id))
    .map((c) => ({
      child: c,
      matches: (c.needs || []).filter((n) => skills.includes(n)),
      unassigned: !(c.volunteerIds || []).length,
    }))
    .sort(
      (a, b) =>
        Number(b.unassigned) - Number(a.unassigned) ||
        b.matches.length - a.matches.length ||
        a.child.name.localeCompare(b.child.name),
    )
})

function optionLabel(o) {
  let label = `${o.child.name} (${o.child.level})`
  if (o.unassigned) label += ' · no volunteer yet'
  if (o.matches.length) label += ` · matches ${o.matches.join(', ')}`
  return label
}

function openAdd(volunteer, day) {
  adding.value = { volunteer, day }
  form.value = { childId: '', time: '' }
  formError.value = ''
}

function closeAdd() {
  adding.value = null
}

async function submitAdd() {
  saving.value = true
  formError.value = ''
  try {
    await api.put(`/matchmaking/${form.value.childId}/assign`, {
      action: 'assign',
      volunteerId: adding.value.volunteer.id,
      day: adding.value.day,
      time: form.value.time,
    })
    await loadData()
    closeAdd()
  } catch (err) {
    formError.value = errorMessage(err) // e.g. "Aisha already has Ethan Wong on Mon at 16:00."
  } finally {
    saving.value = false
  }
}

// ---------- Remove a session ----------

async function removeSlot(volunteer, day, slot) {
  busyKey.value = `${volunteer.id}|${day}|${slot.child.id}`
  actionError.value = ''
  try {
    await api.put(`/matchmaking/${slot.child.id}/assign`, {
      action: 'unassign',
      volunteerId: volunteer.id,
      day, // only this day; other days with this volunteer stay
    })
    await loadData()
  } catch (err) {
    actionError.value = errorMessage(err)
  } finally {
    busyKey.value = null
  }
}
</script>

<template>
  <div class="container py-4 teacherpage">
    <PageHeader title="Weekly schedule" subtitle="Who sees which child, on which day, at what time." />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <!-- the sandy board: the legend and the white timetable -->
    <div v-else class="board">
      <div class="toolbar">
        <span class="tag"><strong>{{ sessionCount }}</strong>&nbsp;sessions every week</span>
        <span class="legend"><span class="swatch swatch-off"></span>Volunteer not free</span>
        <span class="legend"><span class="swatch swatch-today"></span>Today</span>
      </div>

      <div v-if="actionError" class="note note-bad">{{ actionError }}</div>

      <div class="t-card schedule-wrap">
        <table class="schedule-table" data-test="schedule-table">
          <thead>
            <tr>
              <th scope="col" class="volunteer-col">Volunteer</th>
              <th v-for="d in DAYS" :key="d" scope="col" class="day-head" :class="{ 'is-today': d === TODAY }">
                {{ d }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in volunteers" :key="v.id" data-test="schedule-row">
              <th scope="row" class="volunteer-col">
                <div class="fw-semibold">{{ v.name }}</div>
                <div class="person-sub fw-normal">{{ (v.skills || []).join(', ') || 'No skills set' }}</div>
                <RouterLink
                  v-if="!(v.availability || []).length"
                  :to="{ name: 'manage-volunteers' }"
                  class="person-sub fw-normal"
                >
                  Set available days
                </RouterLink>
              </th>

              <td
                v-for="d in DAYS"
                :key="d"
                :class="{ 'is-off': !isFree(v, d), 'is-today': d === TODAY }"
                :data-day="d"
                data-test="schedule-cell"
              >
                <template v-if="isFree(v, d)">
                  <div v-for="slot in slotsFor(v, d)" :key="slot.child.id" class="slot" data-test="schedule-slot">
                    <span class="slot-time">{{ slot.time || '--:--' }}</span>
                    <RouterLink
                      :to="{ name: 'child-profile', params: { id: slot.child.id } }"
                      class="slot-name"
                      :title="slot.child.name"
                    >
                      <ChildAvatar :avatar="slot.child.avatar" /> {{ firstName(slot.child.name) }}
                    </RouterLink>
                    <button
                      type="button"
                      class="slot-remove"
                      :disabled="busyKey !== null"
                      :aria-label="`Remove ${slot.child.name} from ${v.name} on ${d}`"
                      data-test="remove-slot"
                      @click="removeSlot(v, d, slot)"
                    >
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                  <button
                    type="button"
                    class="t-btn t-btn-soft add-btn"
                    :aria-label="`Add a session for ${v.name} on ${d}`"
                    data-test="add-slot"
                    @click="openAdd(v, d)"
                  >
                    <i class="bi bi-plus-lg"></i> Add
                  </button>
                </template>
                <span v-else class="visually-hidden">Not free</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Assigned but not on the timetable yet -->
      <div v-if="unscheduled.length" class="t-card person" data-test="unscheduled">
        <h2>Assigned without a day</h2>
        <p class="person-sub mb-0">
          These pairs are assigned but have no session on the timetable. Use "+ Add" to give them a day and time.
        </p>
        <ul class="small mb-0">
          <li v-for="u in unscheduled" :key="u.key">{{ u.child.name }} with {{ u.volunteerName }}</li>
        </ul>
      </div>
    </div>

    <!-- Add a session dialog (Bootstrap modal styles, opened/closed by Vue) -->
    <template v-if="adding">
      <div
        class="modal d-block"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-title"
        @click.self="!saving && closeAdd()"
      >
        <div class="modal-dialog modal-dialog-centered">
          <form class="modal-content" data-test="add-slot-form" @submit.prevent="submitAdd">
            <div class="modal-header">
              <h2 id="add-title" class="modal-title h6">
                Add a session · {{ adding.volunteer.name }} · {{ adding.day }}
              </h2>
              <button type="button" class="btn-close" aria-label="Close" :disabled="saving" @click="closeAdd"></button>
            </div>

            <div class="modal-body">
              <label for="add-child" class="form-label small fw-semibold">Child</label>
              <select id="add-child" v-model="form.childId" class="form-select" required data-test="add-child">
                <option value="" disabled>Choose a child</option>
                <option v-for="o in childOptions" :key="o.child.id" :value="o.child.id">{{ optionLabel(o) }}</option>
              </select>
              <div class="muted mt-1 mb-3">
                Children with no volunteer come first, then the best skill match for
                {{ firstName(adding.volunteer.name) }}.
              </div>

              <label for="add-time" class="form-label small fw-semibold">Start time (1-hour session)</label>
              <select id="add-time" v-model="form.time" class="form-select" required data-test="add-time">
                <option value="" disabled>Choose a time</option>
                <option v-for="t in TIMES" :key="t" :value="t">{{ t }}</option>
              </select>

              <div v-if="formError" class="note note-bad mt-3" data-test="add-error">
                {{ formError }}
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="t-btn t-btn-soft" :disabled="saving" @click="closeAdd">Cancel</button>
              <button
                type="submit"
                class="t-btn"
                :disabled="!form.childId || !form.time || saving"
                data-test="add-submit"
              >
                {{ saving ? 'Adding…' : 'Add session' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div class="modal-backdrop show"></div>
    </template>
  </div>
</template>
