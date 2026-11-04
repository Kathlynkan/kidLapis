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
  The server re-checks everything: days the volunteer isn't free, and double-bookings.
  A new day is a REQUEST: it stays "waiting" until the volunteer accepts it from their
  bell (Kai Sen, routes/requests.js). Until then the child still counts as unassigned.
============================================================= -->
<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import PageHeader from '@/components/PageHeader.vue'
import StateMessage from '@/components/StateMessage.vue'
import ChildInitial from '@/components/ChildInitial.vue' // the round picture
import { subjectStyle } from '@/utils/format'
import '@/css/coordinator/coordinatorpage.css' // the styles of the coordinator pages

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
const firstName = (name) => name.split(' ')[0]

// ---------- Waiting for a volunteer to accept ----------
const volunteerNames = ref({}) // { volunteerId: 'Aisha Rahman' }, for "Waiting for Aisha"

// First names of the volunteers who still have to accept a day with this child
function waitingFor(c) {
  const ids = [...new Set((c.schedule || []).filter((s) => s.status === 'pending').map((s) => s.volunteerId))]
  return ids.map((id) => firstName(volunteerNames.value[id] || 'a volunteer'))
}

const isPendingDay = (s, day) => (s.pendingDays || []).includes(day)

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
  const [childRes, volunteerRes] = await Promise.all([
    api.get('/children'),
    api.get('/users', { params: { role: 'volunteer' } }),
  ])
  children.value = childRes.data
  volunteerNames.value = Object.fromEntries(volunteerRes.data.map((v) => [v.id, v.name]))
}

// A volunteer accepted/declined a request (live, via the NavBar): "waiting" changes to the
// answer without a refresh. The open child's suggestions reload too. (Kai Sen)
function onScheduleChanged() {
  loadChildren().catch(() => {})
  if (openId.value) loadSuggestions(openId.value)
}
onUnmounted(() => window.removeEventListener('schedule-changed', onScheduleChanged))

onMounted(async () => {
  window.addEventListener('schedule-changed', onScheduleChanged)
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
  editing.value = null
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
      if (slot.status === 'declined') continue // a declined request doesn't hold the time
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

// ---------- Assign / add day / remove ----------

// Returns true if the change was saved, so callers can close an editor only on success.
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

// Assigns a new volunteer, or adds another day for one who is already assigned.
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

// Save only unlocks once the day or time has actually changed.
const canSaveEdit = computed(
  () =>
    editing.value &&
    editing.value.day &&
    editing.value.time &&
    (editing.value.day !== editing.value.fromDay || editing.value.time !== editing.value.fromTime),
)

// One "move" request changes the day/time in a single step, so a clash can never
// leave the child with the old day deleted and no new day.
async function saveEdit(child, s) {
  const { fromDay, day, time } = editing.value
  const saved = await changeAssignment(child, s, { action: 'move', fromDay, day, time })
  if (saved) editing.value = null
}
</script>

<template>
  <div class="container py-4 coordinatorpage matchpage">
    <PageHeader title="Matchmaking" subtitle="Match each child with volunteers who teach the subjects they need." />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <!-- the sandy board: the search and a white card for each child -->
    <div v-else class="board">
      <div class="toolbar">
        <label for="child-search" class="visually-hidden">Search children</label>
        <input
          id="child-search"
          v-model="search"
          type="search"
          class="search"
          placeholder="Search by name, level, school or subject"
          data-test="child-search"
        />
        <span class="tag">
          Showing {{ filteredChildren.length }} of {{ children.length }}
          <template v-if="unassignedCount"> · {{ unassignedCount }} without a volunteer, shown first</template>
        </span>
      </div>

      <div v-if="!filteredChildren.length" class="t-card empty" data-test="no-children">
        <strong>No match</strong>
        No children match "{{ search }}".
      </div>

      <!-- Children -->
      <div class="children">
        <div
          v-for="c in filteredChildren"
          :id="`child-${c.id}`"
          :key="c.id"
          class="t-card child-item"
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
            <ChildInitial :child="c" />

            <span class="child-main">
              <span class="person-name">{{ c.name }} <span class="muted">({{ c.level }})</span></span>
              <span class="tags">
                <span v-for="n in c.needs" :key="n" class="tag" :style="subjectStyle(n)">{{ n }}</span>
              </span>
            </span>

            <span v-if="waitingFor(c).length" class="tag tag-wait" data-test="waiting-badge">
              <i class="bi bi-hourglass-split"></i> Waiting for {{ waitingFor(c).join(', ') }} to accept
            </span>
            <span v-if="!isAssigned(c)" class="tag tag-red" data-test="no-volunteer-badge">No volunteer</span>
            <span v-else class="person-sub count">
              {{ c.volunteerIds.length }} {{ c.volunteerIds.length === 1 ? 'volunteer' : 'volunteers' }}
            </span>

            <i class="bi bi-chevron-down chevron" aria-hidden="true"></i>
          </button>

          <Transition name="expand">
            <div v-if="openId === c.id" :id="`panel-${c.id}`" class="child-panel" data-test="child-panel">
              <div class="child-panel-inner">
                <StateMessage v-if="loadingId === c.id && !suggestions[c.id]" type="loading" />

                <div v-if="panelError[c.id]" class="note note-bad" data-test="action-error">
                  {{ panelError[c.id] }}
                </div>

                <template v-if="suggestions[c.id]">
                  <h3 class="section-title">
                    Suggested volunteers for {{ firstName(c.name) }}
                    <span class="muted">(best match first)</span>
                  </h3>

                  <div class="suggestions">
                    <div
                      v-for="s in suggestions[c.id]"
                      :key="s.volunteerId"
                      class="suggestion"
                      :class="{ 'is-assigned': s.assigned }"
                      data-test="suggestion-card"
                    >
                      <div class="suggest-top">
                        <div class="person-top">
                          <ChildInitial class="is-volunteer" :child="{ name: s.name, avatar: s.avatar }" />
                          <div>
                            <div class="suggest-title">
                              <h4 class="person-name">{{ s.name }}</h4>
                              <span v-if="s.assigned" class="tag tag-ok" data-test="assigned-badge">Assigned</span>
                              <span v-if="s.pendingDays.length" class="tag tag-wait" data-test="waiting-badge">
                                Waiting to accept
                              </span>
                            </div>
                            <div class="person-sub">
                              Score {{ s.score }}: subjects +{{ s.breakdown.skills }}, days +{{ s.breakdown.days }},
                              workload {{ s.breakdown.workload }}
                            </div>
                          </div>
                        </div>

                        <!-- Actions: assign a new volunteer, or add another day for an assigned one -->
                        <div class="suggest-actions">
                          <template v-if="openDays(s).length">
                            <label class="visually-hidden" :for="`day-${c.id}-${s.volunteerId}`">Day for {{ s.name }}</label>
                            <select
                              :id="`day-${c.id}-${s.volunteerId}`"
                              v-model="dayChoice[keyOf(c.id, s.volunteerId)]"
                              class="form-select skill-select"
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
                              class="form-select skill-select"
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
                              class="t-btn"
                              :disabled="
                                !dayChoice[keyOf(c.id, s.volunteerId)] ||
                                !timeChoice[keyOf(c.id, s.volunteerId)] ||
                                busyKey !== ''
                              "
                              data-test="assign-btn"
                              @click="assign(c, s)"
                            >
                              <template v-if="busyKey === keyOf(c.id, s.volunteerId)">Saving…</template>
                              <template v-else-if="s.assigned || s.pendingDays.length"><i class="bi bi-plus-lg"></i> Add day</template>
                              <template v-else>Assign</template>
                            </button>
                          </template>

                          <span v-else-if="!s.availability.length" class="person-sub">
                            Set this volunteer's days on the Volunteers page first
                          </span>
                          <span v-else class="person-sub">Booked on all of {{ firstName(s.name) }}'s free days</span>

                          <button
                            v-if="s.assigned || s.pendingDays.length"
                            type="button"
                            class="t-btn t-btn-soft"
                            :disabled="busyKey !== ''"
                            data-test="unassign-btn"
                            @click="unassign(c, s)"
                          >
                            {{ s.assigned ? 'Unassign all days' : 'Cancel request' }}
                          </button>
                        </div>
                      </div>

                      <!-- The days already booked: each can be edited (pencil) or removed (x) -->
                      <div v-if="s.scheduledSlots.length" class="sessions">
                        <span class="fact-key">Booked</span>
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
                              class="form-select skill-select"
                              data-test="edit-day-select"
                              @change="onEditDayChange(c, s)"
                            >
                              <option v-for="d in editDays(s, slot.day)" :key="d" :value="d">{{ d }}</option>
                            </select>

                            <label class="visually-hidden" :for="`edit-time-${c.id}-${s.volunteerId}`">New time</label>
                            <select
                              :id="`edit-time-${c.id}-${s.volunteerId}`"
                              v-model="editing.time"
                              class="form-select skill-select"
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
                              class="t-btn"
                              :disabled="!canSaveEdit || busyKey !== ''"
                              data-test="save-edit-btn"
                            >
                              {{ busyKey === keyOf(c.id, s.volunteerId) ? 'Saving…' : 'Save' }}
                            </button>
                            <button
                              type="button"
                              class="t-btn t-btn-soft"
                              :disabled="busyKey !== ''"
                              @click="editing = null"
                            >
                              Cancel
                            </button>
                          </form>

                          <!-- normal chip -->
                          <span
                            v-else
                            class="slot-chip"
                            :class="{ 'is-pending': isPendingDay(s, slot.day) }"
                            data-test="slot-chip"
                          >
                            {{ slot.day }} {{ slot.time || '--:--' }}
                            <span v-if="isPendingDay(s, slot.day)" class="slot-waiting">· waiting</span>
                            <button
                              type="button"
                              class="chip-btn chip-edit"
                              :disabled="busyKey !== '' || editing !== null"
                              :aria-label="`Change ${slot.day} with ${s.name}`"
                              title="Change day or time"
                              data-test="edit-day-btn"
                              @click="startEdit(c, s, slot)"
                            >
                              <i class="bi bi-pencil"></i>
                            </button>
                            <button
                              type="button"
                              class="chip-btn chip-remove"
                              :disabled="busyKey !== '' || editing !== null"
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

                      <!-- WHY this volunteer -->
                      <div class="facts" data-test="match-reason">
                        <div class="fact">
                          <span class="fact-key">Teaches</span>
                          <span v-if="s.matchedSkills.length" class="tags">
                            <span v-for="skill in s.matchedSkills" :key="skill" class="tag" :style="subjectStyle(skill)">{{ skill }}</span>
                          </span>
                          <span v-else class="fact-value">No matching subjects</span>
                        </div>
                        <div class="fact">
                          <span class="fact-key">Free on</span>
                          <span class="fact-value">{{ s.availability.join(', ') || 'No days set' }}</span>
                        </div>
                        <div class="fact">
                          <span class="fact-key">Works with</span>
                          <span class="fact-value">
                            {{ s.workload === 0 ? 'No other children' : `${s.workload} other ${s.workload === 1 ? 'child' : 'children'}` }}
                          </span>
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
    </div>
  </div>
</template>

<style>
/* INTERNAL CSS: only this page uses these styles, so they live here in the .vue file. (CSS shared by several pages is in src/css/.) */

/* The matchmaking page (MatchmakingView.vue). The board, the white cards, the tags, the buttons and the facts
   come from css/coordinator/coordinatorpage.css. Here are only the list of children and the panel that opens under a child. */

.matchpage .children {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* a child: the white card is the button, and the panel opens under it */
.matchpage .child-item {
  overflow: hidden;
}

.matchpage .child-item.is-open {
  box-shadow: 0 0 0 2px #D5CBEA, 0 1px 6px rgba(61, 52, 84, 0.1);
}

.matchpage .child-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.matchpage .child-toggle:hover {
  background: #F0EAF8;
}

.matchpage .child-toggle:focus-visible {
  outline: 2px solid #6B5CA5;
  outline-offset: -2px;
}

.matchpage .child-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.matchpage .child-main .person-name {
  font-size: 16px;
  font-weight: 600;
}

/* the line under the search can be long: it wraps on a small screen */
.matchpage .toolbar .tag {
  border-radius: 14px;
  white-space: normal;
}

.matchpage .count {
  white-space: nowrap;
}

.matchpage .chevron {
  flex-shrink: 0;
  color: #7D7690;
  transition: transform 0.3s ease;
}

.matchpage .is-open .chevron {
  transform: rotate(180deg);
}

/* the panel under a child */
.matchpage .child-panel-inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 16px 16px;
}

.matchpage .expand-enter-active,
.matchpage .expand-leave-active {
  overflow: hidden;
  transition: max-height 0.35s ease, opacity 0.25s ease;
}

.matchpage .expand-enter-from,
.matchpage .expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.matchpage .expand-enter-to,
.matchpage .expand-leave-from {
  max-height: 1500px;
  opacity: 1;
}

/* a suggested volunteer: a pale lavender box inside the white card */
.matchpage .suggestion {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: #F7F4FB;
}

.matchpage .suggestion.is-assigned {
  box-shadow: inset 0 0 0 1.5px #A9D9BC;
}

.matchpage .suggestion .fact {
  background: #FFFFFF;
}

/* the day and time boxes sit next to the button, and wrap on a small screen */
.matchpage .suggest-actions {
  flex-wrap: wrap;
}

/* the booked days: "Booked  Mon 16:00 ✎ ✕   Wed 18:00 ✎ ✕" */
.matchpage .sessions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.matchpage .slot-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 4px 3px 12px;
  border-radius: 999px;
  background: #FFFFFF;
  box-shadow: inset 0 0 0 1.5px #A9D9BC;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* a day the volunteer hasn't accepted yet: dashed, with "· waiting" */
.matchpage .slot-chip.is-pending {
  box-shadow: none;
  border: 1.5px dashed #C8A028;
  background: #FBF5DC;
}

.matchpage .slot-waiting {
  margin: 0 4px 0 2px;
  color: #8A6D12;
  font-weight: 500;
}

/* "Waiting for Aisha to accept" / "Waiting to accept" */
.matchpage .tag-wait {
  background: #FBF5DC;
  color: #6E5410;
  box-shadow: inset 0 0 0 1px #E3C76A;
  white-space: nowrap;
}

.matchpage .chip-btn {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  font-size: 12px;
}

.matchpage .chip-edit {
  color: #6B5CA5;
}

.matchpage .chip-remove {
  color: #B4473B;
}

.matchpage .chip-btn:hover:not(:disabled) {
  background: #F0EAF8;
}

.matchpage .chip-btn:focus-visible {
  outline: 2px solid #6B5CA5;
}

.matchpage .chip-btn:disabled {
  opacity: 0.4;
}

/* a booked day being edited: day, time, Save, Cancel */
.matchpage .slot-editor {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 14px;
  background: #F0EAF8;
}

/* Small screens: photo | name, subjects and status underneath | arrow */
@media (max-width: 520px) {
  .matchpage .child-toggle {
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      'avatar main   chevron'
      'avatar status chevron'
      'avatar wait   chevron';
    align-items: center;
    column-gap: 12px;
    row-gap: 6px;
    padding: 12px;
  }
  .matchpage .child-toggle .tag-wait {
    grid-area: wait;
    justify-self: start;
    white-space: normal; /* the sentence can wrap on a narrow screen */
  }
  .matchpage .child-toggle > :first-child {
    grid-area: avatar; /* the round photo */
  }
  .matchpage .child-main {
    grid-area: main;
  }
  .matchpage .child-toggle .tag-red,
  .matchpage .child-toggle .count {
    grid-area: status;
    justify-self: start;
  }
  .matchpage .child-toggle .chevron {
    grid-area: chevron;
  }
}

/* Never let the name be squeezed narrower than a few letters */
.matchpage .child-main {
  min-width: 8ch;
}

/* people who turn animations off in their device settings */
@media (prefers-reduced-motion: reduce) {
  .matchpage .chevron,
  .matchpage .expand-enter-active,
  .matchpage .expand-leave-active {
    transition: none;
  }
}
</style>