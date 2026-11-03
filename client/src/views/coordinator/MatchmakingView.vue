<!-- =============================================================
  Skills-based matchmaking                            Owner: Yu Xuan
  Route: matchmaking (optional :childId opens that child)
  -------------------------------------------------------------
  All children are listed as toggle buttons (unassigned first) with a search bar.
  Open a child -> volunteers ranked by score (GET /matchmaking/:childId)
  -> pick a day + time -> Assign (PUT /matchmaking/:childId/assign).
  An assigned volunteer can be given more days ("Add day"). Each booked day can be
  edited in place (pencil: change day/time) or removed (x), or all at once ("Unassign all").
  Time dropdowns grey out times that would double-book the volunteer or the child.
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

// The booked day being edited in place (one at a time), or null.
// { childId, volunteerId, fromDay, fromTime, day, time }
const editing = ref(null)

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

// Days this volunteer is free but not yet booked with this child.
const openDays = (s) => s.availability.filter((d) => !s.scheduledDays.includes(d))

// ---------- Busy times (greyed out in the time dropdowns) ----------
// The server makes the final decision; this just warns the coordinator before they click.
const SESSION_MINUTES = 60 // same rule as server/utils/schedule.js
const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Every booked time on this day that would clash for this volunteer or this child.
function busyTimes(child, s, day) {
  const busy = []
  for (const other of children.value) {
    for (const slot of other.schedule || []) {
      if (slot.day !== day || !slot.time) continue
      if (other.id === child.id && slot.volunteerId === s.volunteerId) continue // this pair's own day
      if (slot.volunteerId === s.volunteerId) {
        busy.push({ time: slot.time, reason: `${firstName(s.name)} has ${firstName(other.name)}` })
      } else if (other.id === child.id) {
        busy.push({ time: slot.time, reason: `${firstName(child.name)} has another session` })
      }
    }
  }
  return busy
}

// All start times, with clashing ones disabled and labelled with the reason.
function timeOptions(child, s, day) {
  const busy = day ? busyTimes(child, s, day) : []
  return TIMES.map((t) => {
    const clash = busy.find((b) => Math.abs(toMinutes(b.time) - toMinutes(t)) < SESSION_MINUTES)
    return { time: t, disabled: Boolean(clash), label: clash ? `${t} · ${clash.reason} at ${clash.time}` : t }
  })
}

const isFreeTime = (child, s, day, time) =>
  Boolean(time) && !timeOptions(child, s, day).find((o) => o.time === time)?.disabled

// After the day changes, keep the chosen time only if it's still free on the new day.
function onAddDayChange(child, s) {
  const key = keyOf(child.id, s.volunteerId)
  if (!isFreeTime(child, s, dayChoice.value[key], timeChoice.value[key])) delete timeChoice.value[key]
}

// ---------- Editing a booked day in place ----------

function startEdit(child, s, slot) {
  editing.value = {
    childId: child.id,
    volunteerId: s.volunteerId,
    fromDay: slot.day,
    fromTime: slot.time,
    day: slot.day,
    time: slot.time,
  }
  panelError.value[child.id] = ''
}

const isEditing = (child, s, day) =>
  editing.value?.childId === child.id && editing.value.volunteerId === s.volunteerId && editing.value.fromDay === day

// The day being edited, plus any free day they don't already have together.
const editDays = (s, fromDay) => s.availability.filter((d) => d === fromDay || !s.scheduledDays.includes(d))

function onEditDayChange(child, s) {
  if (!isFreeTime(child, s, editing.value.day, editing.value.time)) editing.value.time = ''
}

const canSaveEdit = computed(
  () =>
    editing.value &&
    editing.value.day &&
    editing.value.time &&
    (editing.value.day !== editing.value.fromDay || editing.value.time !== editing.value.fromTime),
)

async function saveEdit(child, s) {
  const { fromDay, day, time } = editing.value
  const saved = await changeAssignment(child, s, { action: 'move', fromDay, day, time })
  if (saved) editing.value = null
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
    return true
  } catch (err) {
    panelError.value[child.id] = errorMessage(err) // e.g. "Aisha Rahman already has Ethan Wong on Mon at 16:00."
    return false
  } finally {
    busyKey.value = ''
  }
}

function assign(child, s) {
  const key = keyOf(child.id, s.volunteerId)
  changeAssignment(child, s, { action: 'assign', day: dayChoice.value[key], time: timeChoice.value[key] })
}

// Removes just one day. If it was their last day together, the server also unassigns them.
function removeDay(child, s, day) {
  changeAssignment(child, s, { action: 'unassign', day })
}

// Removes the volunteer from this child on every day.
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
                            <span v-if="s.assigned" class="badge text-bg-success ms-1" data-test="assigned-badge">Assigned</span>
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

                          <!-- The days already booked: each can be edited (pencil) or removed (x) -->
                          <div v-if="s.scheduledSlots.length" class="d-flex flex-wrap align-items-center gap-1 mt-2">
                            <template v-for="slot in s.scheduledSlots" :key="slot.day">
                              <!-- editing this day -->
                              <form
                                v-if="isEditing(c, s, slot.day)"
                                class="slot-editor"
                                data-test="slot-editor"
                                @submit.prevent="saveEdit(c, s)"
                              >
                                <label class="visually-hidden" :for="`edit-day-${c.id}-${s.volunteerId}`">New day</label>
                                <select
                                  :id="`edit-day-${c.id}-${s.volunteerId}`"
                                  v-model="editing.day"
                                  class="form-select form-select-sm w-auto"
                                  data-test="edit-day-select"
                                  @change="onEditDayChange(c, s)"
                                >
                                  <option v-for="d in editDays(s, slot.day)" :key="d" :value="d">{{ d }}</option>
                                </select>

                                <label class="visually-hidden" :for="`edit-time-${c.id}-${s.volunteerId}`">New time</label>
                                <select
                                  :id="`edit-time-${c.id}-${s.volunteerId}`"
                                  v-model="editing.time"
                                  class="form-select form-select-sm w-auto"
                                  data-test="edit-time-select"
                                >
                                  <option value="" disabled>Time</option>
                                  <option
                                    v-for="o in timeOptions(c, s, editing.day)"
                                    :key="o.time"
                                    :value="o.time"
                                    :disabled="o.disabled"
                                  >
                                    {{ o.label }}
                                  </option>
                                </select>

                                <button
                                  type="submit"
                                  class="btn btn-sm btn-primary"
                                  :disabled="!canSaveEdit || busyKey !== ''"
                                  data-test="save-edit-btn"
                                >
                                  {{ busyKey === keyOf(c.id, s.volunteerId) ? 'Saving…' : 'Save' }}
                                </button>
                                <button
                                  type="button"
                                  class="btn btn-sm btn-outline-secondary"
                                  :disabled="busyKey !== ''"
                                  @click="editing = null"
                                >
                                  Cancel
                                </button>
                              </form>

                              <!-- normal chip -->
                              <span v-else class="slot-chip" data-test="slot-chip">
                                {{ slot.day }} {{ slot.time || '--:--' }}
                                <button
                                  type="button"
                                  class="chip-btn chip-edit"
                                  :disabled="busyKey !== ''"
                                  :aria-label="`Change ${slot.day} with ${s.name}`"
                                  :title="`Change day or time`"
                                  data-test="edit-day-btn"
                                  @click="startEdit(c, s, slot)"
                                >
                                  <i class="bi bi-pencil"></i>
                                </button>
                                <button
                                  type="button"
                                  class="chip-btn chip-remove"
                                  :disabled="busyKey !== ''"
                                  :aria-label="`Remove ${slot.day} with ${s.name}`"
                                  :title="`Remove ${slot.day}`"
                                  data-test="remove-day-btn"
                                  @click="removeDay(c, s, slot.day)"
                                >
                                  <i class="bi bi-x-lg"></i>
                                </button>
                              </span>
                            </template>
                          </div>
                        </div>

                        <!-- Actions -->
                        <div class="d-flex flex-column align-items-end gap-2">
                          <div v-if="openDays(s).length" class="d-flex flex-wrap align-items-center justify-content-end gap-2">
                            <label class="visually-hidden" :for="`day-${c.id}-${s.volunteerId}`">Day for {{ s.name }}</label>
                            <select
                              :id="`day-${c.id}-${s.volunteerId}`"
                              v-model="dayChoice[keyOf(c.id, s.volunteerId)]"
                              class="form-select form-select-sm w-auto"
                              data-test="day-select"
                              @change="onAddDayChange(c, s)"
                            >
                              <option :value="undefined" disabled>Day</option>
                              <option v-for="d in openDays(s)" :key="d" :value="d">{{ d }}</option>
                            </select>

                            <label class="visually-hidden" :for="`time-${c.id}-${s.volunteerId}`">Time for {{ s.name }}</label>
                            <select
                              :id="`time-${c.id}-${s.volunteerId}`"
                              v-model="timeChoice[keyOf(c.id, s.volunteerId)]"
                              class="form-select form-select-sm w-auto"
                              data-test="time-select"
                            >
                              <option :value="undefined" disabled>Time</option>
                              <option
                                v-for="o in timeOptions(c, s, dayChoice[keyOf(c.id, s.volunteerId)])"
                                :key="o.time"
                                :value="o.time"
                                :disabled="o.disabled"
                              >
                                {{ o.label }}
                              </option>
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
                              <template v-if="busyKey === keyOf(c.id, s.volunteerId)">Saving…</template>
                              <template v-else-if="s.assigned"><i class="bi bi-plus-lg"></i> Add day</template>
                              <template v-else>Assign</template>
                            </button>
                          </div>

                          <span v-else-if="!s.availability.length" class="small text-muted-cb">
                            Set this volunteer's days on the Volunteers page first
                          </span>
                          <span v-else class="small text-muted-cb">
                            Booked on all of {{ firstName(s.name) }}'s free days
                          </span>

                          <button
                            v-if="s.assigned"
                            type="button"
                            class="btn btn-sm btn-outline-danger"
                            :disabled="busyKey !== ''"
                            data-test="unassign-btn"
                            @click="unassign(c, s)"
                          >
                            Unassign all days
                          </button>
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

/* A booked day, e.g. "Mon 16:00 x" */
.slot-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 10px;
  border-radius: 999px;
  background: #e8f5ee;
  border: 1px solid rgba(25, 135, 84, 0.35);
  font-size: 0.8rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.chip-btn {
  display: inline-grid;
  place-items: center;
  width: 1.3rem;
  height: 1.3rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  font-size: 0.7rem;
}
.chip-edit {
  color: var(--cb-primary);
}
.chip-remove {
  color: #b4473b;
}
.chip-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.07);
}
.chip-btn:focus-visible {
  outline: 2px solid var(--cb-primary);
}
.slot-editor {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: var(--cb-primary-soft);
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