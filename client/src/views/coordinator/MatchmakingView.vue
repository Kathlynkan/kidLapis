<!-- =============================================================
  Skills-based matchmaking                            Owner: Yu Xuan
  Route: matchmaking (optional :childId opens that child)
  -------------------------------------------------------------
  All children are listed as toggle buttons (unassigned first) with a search bar.
  Open a child -> volunteers ranked by score (GET /matchmaking/:childId)
  -> pick a day + time -> Assign (PUT /matchmaking/:childId/assign).
  The server rejects days the volunteer isn't free and double-bookings.
============================================================= -->
<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import PageHeader from '@/components/PageHeader.vue'
import StateMessage from '@/components/StateMessage.vue'

const route = useRoute()
const router = useRouter()

// Start times every 30 minutes from 09:00 to 19:30 (same as the Schedule page).
const TIMES = []
for (let h = 9; h <= 19; h++) {
  for (const m of ['00', '30']) TIMES.push(`${String(h).padStart(2, '0')}:${m}`)
}

const children = ref([])
const loading = ref(true)
const error = ref('')

const search = ref('')
const openId = ref(route.params.childId || '') // the child whose panel is open ('' = none)

// Kept per child, so a closing panel keeps showing its own data while it animates away.
const suggestions = ref({}) // { childId: [ranked volunteers] }
const loadingId = ref('')
const panelError = ref({}) // { childId: 'message' }

// The day/time picked in each volunteer's dropdowns, keyed by 'childId|volunteerId'.
const dayChoice = ref({})
const timeChoice = ref({})
const busyKey = ref('')

const keyOf = (childId, volunteerId) => `${childId}|${volunteerId}`
const isAssigned = (c) => (c.volunteerIds || []).length > 0
const isPhoto = (avatar) => typeof avatar === 'string' && avatar.startsWith('/')
const firstName = (name) => name.split(' ')[0]

// ---------- Child list + search ----------

// Children with no volunteer first, then alphabetical.
const sortedChildren = computed(() =>
  [...children.value].sort(
    (a, b) => Number(isAssigned(a)) - Number(isAssigned(b)) || a.name.localeCompare(b.name),
  ),
)

// Matches name, level, school or any subject they need ("math" finds everyone needing Math).
const filteredChildren = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return sortedChildren.value
  return sortedChildren.value.filter((c) =>
    [c.name, c.level, c.school, ...(c.needs || [])]
      .filter(Boolean)
      .some((text) => text.toLowerCase().includes(q)),
  )
})

const unassignedCount = computed(() => children.value.filter((c) => !isAssigned(c)).length)

async function loadChildren() {
  const res = await api.get('/children')
  children.value = res.data
}

onMounted(async () => {
  try {
    await loadChildren()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
  // Opened from a link like the dashboard's "No volunteer" alert: open and scroll to that child.
  if (openId.value) {
    loadSuggestions(openId.value)
    await nextTick()
    document.getElementById(`child-${openId.value}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
})

// Click a child: open it (closing any other), or close it if it's already open.
function toggle(child) {
  openId.value = openId.value === child.id ? '' : child.id
  router.replace({ name: 'matchmaking', params: { childId: openId.value || undefined } })
  if (openId.value) loadSuggestions(openId.value)
}

// ---------- Suggestions ----------

async function loadSuggestions(childId) {
  loadingId.value = childId
  panelError.value[childId] = ''
  try {
    const res = await api.get(`/matchmaking/${childId}`)
    suggestions.value[childId] = res.data.suggestions
  } catch (err) {
    panelError.value[childId] = errorMessage(err)
  } finally {
    if (loadingId.value === childId) loadingId.value = ''
  }
}

function slotsLabel(s) {
  return s.scheduledSlots.map((slot) => (slot.time ? `${slot.day} ${slot.time}` : slot.day)).join(', ')
}

async function changeAssignment(child, s, body) {
  const key = keyOf(child.id, s.volunteerId)
  busyKey.value = key
  panelError.value[child.id] = ''
  try {
    await api.put(`/matchmaking/${child.id}/assign`, { volunteerId: s.volunteerId, ...body })
    delete dayChoice.value[key]
    delete timeChoice.value[key]
    // Scores, workloads and the child's status all change after an assignment.
    await Promise.all([loadSuggestions(child.id), loadChildren()])
  } catch (err) {
    panelError.value[child.id] = errorMessage(err) // e.g. "Aisha Rahman already has Ethan Wong on Mon at 16:00."
  } finally {
    busyKey.value = ''
  }
}

function assign(child, s) {
  const key = keyOf(child.id, s.volunteerId)
  changeAssignment(child, s, { action: 'assign', day: dayChoice.value[key], time: timeChoice.value[key] })
}

function unassign(child, s) {
  changeAssignment(child, s, { action: 'unassign' })
}
</script>

<template>
  <div class="container py-4">
    <PageHeader title="Matchmaking" subtitle="Match each child with volunteers who teach the subjects they need." />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <!-- Search -->
      <div class="cb-card p-3 mb-3 d-flex flex-wrap align-items-center gap-3">
        <div class="search-box flex-grow-1">
          <i class="bi bi-search search-icon" aria-hidden="true"></i>
          <label for="child-search" class="visually-hidden">Search children</label>
          <input
            id="child-search"
            v-model="search"
            type="search"
            class="form-control"
            placeholder="Search by name, level, school or subject"
            data-test="child-search"
          />
        </div>
        <div class="small text-muted-cb">
          Showing {{ filteredChildren.length }} of {{ children.length }}
          <template v-if="unassignedCount">
            · {{ unassignedCount }} without a volunteer, shown first
          </template>
        </div>
      </div>

      <p v-if="!filteredChildren.length" class="text-muted-cb" data-test="no-children">
        No children match "{{ search }}".
      </p>

      <!-- Children -->
      <div class="d-flex flex-column gap-2">
        <div
          v-for="c in filteredChildren"
          :id="`child-${c.id}`"
          :key="c.id"
          class="cb-card child-item"
          :class="{ 'is-open': openId === c.id }"
        >
          <button
            type="button"
            class="child-toggle"
            :aria-expanded="openId === c.id"
            :aria-controls="`panel-${c.id}`"
            data-test="child-toggle"
            @click="toggle(c)"
          >
            <span class="avatar" aria-hidden="true">
              <img v-if="isPhoto(c.avatar)" :src="c.avatar" alt="" />
              <template v-else>{{ c.avatar }}</template>
            </span>

            <span class="flex-grow-1 min-w-0">
              <span class="d-block fw-semibold">{{ c.name }} <span class="text-muted-cb fw-normal">({{ c.level }})</span></span>
              <span class="d-flex flex-wrap gap-1 mt-1">
                <span v-for="n in c.needs" :key="n" class="badge badge-soft">{{ n }}</span>
              </span>
            </span>

            <span v-if="!isAssigned(c)" class="badge text-bg-warning" data-test="no-volunteer-badge">No volunteer</span>
            <span v-else class="small text-muted-cb text-nowrap">
              {{ c.volunteerIds.length }} {{ c.volunteerIds.length === 1 ? 'volunteer' : 'volunteers' }}
            </span>

            <i class="bi bi-chevron-down chevron" aria-hidden="true"></i>
          </button>

          <Transition name="expand">
            <div v-if="openId === c.id" :id="`panel-${c.id}`" class="child-panel" data-test="child-panel">
              <div class="child-panel-inner">
                <StateMessage v-if="loadingId === c.id && !suggestions[c.id]" type="loading" />

                <div v-if="panelError[c.id]" class="alert alert-danger py-2 small" data-test="action-error">
                  {{ panelError[c.id] }}
                </div>

                <template v-if="suggestions[c.id]">
                  <h3 class="h6 mb-2">
                    Suggested volunteers for {{ firstName(c.name) }}
                    <span class="text-muted-cb fw-normal small">(best match first)</span>
                  </h3>

                  <div class="d-flex flex-column gap-2">
                    <div
                      v-for="s in suggestions[c.id]"
                      :key="s.volunteerId"
                      class="suggestion"
                      :class="{ 'is-assigned': s.assigned }"
                      data-test="suggestion-card"
                    >
                      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
                        <div>
                          <div class="fw-semibold">
                            <i class="bi bi-person-circle me-1"></i>{{ s.name }}
                            <span v-if="s.assigned" class="badge text-bg-success ms-1" data-test="assigned-badge">
                              Assigned{{ s.scheduledSlots.length ? ` · ${slotsLabel(s)}` : '' }}
                            </span>
                          </div>

                          <!-- WHY this volunteer -->
                          <div class="small" data-test="match-reason">
                            <template v-if="s.matchedSkills.length">Teaches {{ s.matchedSkills.join(', ') }}</template>
                            <span v-else class="text-muted-cb">No matching subjects</span>
                            · Free on {{ s.availability.join(', ') || 'no days set' }}
                            · {{ s.workload === 0 ? 'No other children' : `${s.workload} other ${s.workload === 1 ? 'child' : 'children'}` }}
                          </div>
                          <div class="small text-muted-cb">
                            Score {{ s.score }}: subjects +{{ s.breakdown.skills }}, days +{{ s.breakdown.days }},
                            workload {{ s.breakdown.workload }}
                          </div>
                        </div>

                        <!-- Actions -->
                        <div class="d-flex flex-wrap align-items-center gap-2">
                          <button
                            v-if="s.assigned"
                            type="button"
                            class="btn btn-sm btn-outline-danger"
                            :disabled="busyKey !== ''"
                            data-test="unassign-btn"
                            @click="unassign(c, s)"
                          >
                            {{ busyKey === keyOf(c.id, s.volunteerId) ? 'Removing…' : 'Unassign' }}
                          </button>

                          <template v-else-if="s.availability.length">
                            <label class="visually-hidden" :for="`day-${c.id}-${s.volunteerId}`">Day for {{ s.name }}</label>
                            <select
                              :id="`day-${c.id}-${s.volunteerId}`"
                              v-model="dayChoice[keyOf(c.id, s.volunteerId)]"
                              class="form-select form-select-sm w-auto"
                              data-test="day-select"
                            >
                              <option :value="undefined" disabled>Day</option>
                              <option v-for="d in s.availability" :key="d" :value="d">{{ d }}</option>
                            </select>

                            <label class="visually-hidden" :for="`time-${c.id}-${s.volunteerId}`">Time for {{ s.name }}</label>
                            <select
                              :id="`time-${c.id}-${s.volunteerId}`"
                              v-model="timeChoice[keyOf(c.id, s.volunteerId)]"
                              class="form-select form-select-sm w-auto"
                              data-test="time-select"
                            >
                              <option :value="undefined" disabled>Time</option>
                              <option v-for="t in TIMES" :key="t" :value="t">{{ t }}</option>
                            </select>

                            <button
                              type="button"
                              class="btn btn-sm btn-primary"
                              :disabled="
                                !dayChoice[keyOf(c.id, s.volunteerId)] ||
                                !timeChoice[keyOf(c.id, s.volunteerId)] ||
                                busyKey !== ''
                              "
                              data-test="assign-btn"
                              @click="assign(c, s)"
                            >
                              {{ busyKey === keyOf(c.id, s.volunteerId) ? 'Assigning…' : 'Assign' }}
                            </button>
                          </template>

                          <span v-else class="small text-muted-cb">Set this volunteer's days on the Volunteers page first</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ---------- Search ---------- */
.search-box {
  position: relative;
  min-width: 220px;
}
.search-icon {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.55;
  pointer-events: none;
}
.search-box .form-control {
  padding-left: 2.4rem;
}

/* ---------- Child toggle buttons ---------- */
.child-item {
  border: 2px solid transparent;
  overflow: hidden;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}
.child-item.is-open {
  border-color: var(--cb-primary);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}
.child-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.child-toggle:hover {
  background: var(--cb-primary-soft);
}
.child-toggle:focus-visible {
  outline: 2px solid var(--cb-primary);
  outline-offset: -2px;
}
.min-w-0 {
  min-width: 0;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  background: var(--cb-primary-soft);
  overflow: hidden;
  flex-shrink: 0;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.chevron {
  transition: transform 0.3s ease;
  flex-shrink: 0;
}
.is-open .chevron {
  transform: rotate(180deg);
}

/* ---------- Expanding panel ---------- */
.child-panel-inner {
  padding: 0.25rem 1rem 1rem;
}
.expand-enter-active,
.expand-leave-active {
  overflow: hidden;
  transition:
    max-height 0.35s ease,
    opacity 0.25s ease;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 1500px;
  opacity: 1;
}

/* ---------- Volunteer suggestions ---------- */
.suggestion {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 0.75rem;
  background: #fff;
}
.suggestion.is-assigned {
  border-color: rgba(25, 135, 84, 0.45);
}

/* Respect people who turn animations off in their device settings */
@media (prefers-reduced-motion: reduce) {
  .child-item,
  .child-toggle,
  .chevron,
  .expand-enter-active,
  .expand-leave-active {
    transition: none;
  }
}
</style>