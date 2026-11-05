<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useScheduleChanged } from '@/composables/useScheduleChanged'
import api, { errorMessage } from '@/services/api'
import PageHeader from '@/components/PageHeader.vue'
import StateMessage from '@/components/StateMessage.vue'
import WeekGrid from '@/components/WeekGrid.vue'
import '@/css/coordinator/coordinatorpage.css' // the styles of the coordinator pages
import { isActive, isConfirmed, isPending, timeOptions } from '@/utils/slots'
import { firstName } from '@/utils/format'


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
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

useScheduleChanged(loadData, { isLoading: loading })

function onKeydown(e) {
  if (e.key === 'Escape' && adding.value && !saving.value) closeAdd()
}


// Accepted weekly sessions, and requests still waiting for the volunteer.
const countSlots = (test) => children.value.reduce((n, c) => n + (c.schedule || []).filter(test).length, 0)
const sessionCount = computed(() => countSlots(isConfirmed))
const pendingCount = computed(() => countSlots(isPending))

// Assigned in volunteerIds but no day on the timetable (e.g. assigned before schedules existed).
const unscheduled = computed(() => {
  const volunteerName = Object.fromEntries(volunteers.value.map((v) => [v.id, v.name]))
  const list = []
  for (const c of children.value) {
    for (const vid of c.volunteerIds || []) {
      if (!(c.schedule || []).some((s) => s.volunteerId === vid && isActive(s))) {
        list.push({ key: `${c.id}|${vid}`, child: c, volunteerName: volunteerName[vid] || 'Unknown volunteer' })
      }
    }
  }
  return list
})

// Add a session

// Children to offer: unassigned first, then best skill match for this volunteer.
// Children already booked (or requested) with this volunteer on this day are left out;
// a request they declined doesn't count, so that child can be asked again.
const childOptions = computed(() => {
  if (!adding.value) return []
  const { volunteer, day } = adding.value
  const skills = volunteer.skills || []
  const bookedHere = new Set(
    children.value
      .filter((c) =>
        (c.schedule || []).some((s) => s.volunteerId === volunteer.id && s.day === day && isActive(s)),
      )
      .map((c) => c.id),
  )

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

// The start times for the dialog: times that would double-book the volunteer or the chosen
// child are greyed out with the reason (the same rule as Matchmaking, from utils/slots.js).
const addTimeOptions = computed(() => {
  if (!adding.value) return []
  const child = children.value.find((c) => c.id === form.value.childId)
  return timeOptions(children.value, {
    childId: form.value.childId,
    childName: child?.name || '',
    volunteerId: adding.value.volunteer.id,
    volunteerName: adding.value.volunteer.name,
    day: adding.value.day,
  })
})

// Choosing a different child can make the chosen time clash: clear it so a free one is picked.
watch(
  () => form.value.childId,
  () => {
    if (addTimeOptions.value.find((o) => o.time === form.value.time)?.disabled) form.value.time = ''
  },
)

function openAdd(volunteer, day) {
  adding.value = { volunteer, day }
  form.value = { childId: '', time: '' }
  formError.value = ''
}

// Like Bootstrap's own dialogs: the page behind the dialog doesn't scroll while it's open.
// (On a phone, a page that moves underneath also moves the dialog away from where you tap.)
watch(adding, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

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

// Remove a session

// Removes one day (or cancels a pending request for it).
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
  <div class="container py-4 coordinatorpage">
    <PageHeader title="Weekly Schedule" subtitle="Who sees which child, on which day, at what time." />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <div class="d-flex flex-wrap align-items-center gap-3 small mb-3">
        <span><strong>{{ sessionCount }}</strong> weekly slots</span>
        <span v-if="pendingCount" data-test="pending-count">
          <strong>{{ pendingCount }}</strong> waiting for a volunteer to accept
        </span>
        <span class="legend"><span class="swatch swatch-pending"></span>Pending request</span>
        <span class="legend"><span class="swatch swatch-off"></span>Volunteer not free</span>
        <span class="legend"><span class="swatch swatch-today"></span>Today</span>
      </div>

      <div v-if="actionError" class="alert alert-danger py-2 small">{{ actionError }}</div>

      <div class="t-card p-2">
        <WeekGrid
          editable
          :volunteers="volunteers"
          :children="children"
          :busy-key="busyKey"
          @add="openAdd"
          @remove="removeSlot"
        />
      </div>

      <!-- Assigned but not on the timetable yet -->
      <div v-if="unscheduled.length" class="t-card p-3 mt-3" data-test="unscheduled">
        <h2 class="h6"><i class="bi bi-calendar-x me-2"></i>Assigned Without a Day</h2>
        <p class="small text-muted-cb mb-2">
          These pairs are assigned but have no session on the timetable. Use "+ Add" to give them a day and time.
        </p>
        <ul class="small mb-0">
          <li v-for="u in unscheduled" :key="u.key">{{ u.child.name }} with {{ u.volunteerName }}</li>
        </ul>
      </div>
    </template>

    <!-- Add a session dialog (Bootstrap modal styles, opened/closed by Vue).
         Teleport puts it at the end of <body>, so no wrapper on the page can move it. -->
    <Teleport to="body">
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
                Add a Session · {{ adding.volunteer.name }} · {{ adding.day }}
              </h2>
              <button type="button" class="btn-close" aria-label="Close" :disabled="saving" @click="closeAdd"></button>
            </div>

            <div class="modal-body">
              <label for="add-child" class="form-label small fw-semibold">Child</label>
              <select id="add-child" v-model="form.childId" class="form-select" required data-test="add-child">
                <option value="" disabled>Choose a child</option>
                <option v-for="o in childOptions" :key="o.child.id" :value="o.child.id">{{ optionLabel(o) }}</option>
              </select>
              <div class="small text-muted-cb mt-1 mb-3">
                Children with no volunteer come first, then the best skill match for
                {{ firstName(adding.volunteer.name) }}. {{ firstName(adding.volunteer.name) }} gets a request
                to accept before the session is confirmed.
              </div>

              <label for="add-time" class="form-label small fw-semibold">Start time (1-hour session)</label>
              <select id="add-time" v-model="form.time" class="form-select" required data-test="add-time">
                <option value="" disabled>Choose a time</option>
                <option v-for="o in addTimeOptions" :key="o.time" :value="o.time" :disabled="o.disabled">{{ o.label }}</option>
              </select>

              <div v-if="formError" class="alert alert-danger small py-2 mt-3 mb-0" data-test="add-error">
                {{ formError }}
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="t-btn t-btn-red" :disabled="saving" @click="closeAdd">
                Cancel
              </button>
              <button
                type="submit"
                class="t-btn"
                :disabled="!form.childId || !form.time || saving"
                data-test="add-submit"
              >
                {{ saving ? 'Sending…' : 'Send request' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div class="modal-backdrop show"></div>
    </template>
    </Teleport>
  </div>
</template>
<style scoped>
.legend {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(61, 52, 84, 0.12);
}
/* same colours as WeekGrid.vue */
.swatch-off {
  background: rgba(61, 52, 84, 0.06);
}
.swatch-today {
  background: #f0eaf8;
}
.swatch-pending {
  background: #fffaf0;
  border: 1.5px dashed #e0b45a;
}
</style>