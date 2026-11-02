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
import ChildInitial from '@/components/ChildInitial.vue' // the round picture
import { subjectStyle } from '@/utils/format'
import '@/css/teacher/teacherpage.css' // the styles of the teacher pages

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
  <div class="container py-4 teacherpage matchpage">
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
                              <span v-if="s.assigned" class="tag tag-ok" data-test="assigned-badge">
                                Assigned{{ s.scheduledSlots.length ? ` · ${slotsLabel(s)}` : '' }}
                              </span>
                            </div>
                            <div class="person-sub">
                              Score {{ s.score }}: subjects +{{ s.breakdown.skills }}, days +{{ s.breakdown.days }},
                              workload {{ s.breakdown.workload }}
                            </div>
                          </div>
                        </div>

                        <!-- Actions -->
                        <div class="suggest-actions">
                          <button
                            v-if="s.assigned"
                            type="button"
                            class="t-btn t-btn-soft"
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
                              class="form-select skill-select"
                              data-test="day-select"
                            >
                              <option :value="undefined" disabled>Day</option>
                              <option v-for="d in s.availability" :key="d" :value="d">{{ d }}</option>
                            </select>

                            <label class="visually-hidden" :for="`time-${c.id}-${s.volunteerId}`">Time for {{ s.name }}</label>
                            <select
                              :id="`time-${c.id}-${s.volunteerId}`"
                              v-model="timeChoice[keyOf(c.id, s.volunteerId)]"
                              class="form-select skill-select"
                              data-test="time-select"
                            >
                              <option :value="undefined" disabled>Time</option>
                              <option v-for="t in TIMES" :key="t" :value="t">{{ t }}</option>
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
                              {{ busyKey === keyOf(c.id, s.volunteerId) ? 'Assigning…' : 'Assign' }}
                            </button>
                          </template>

                          <span v-else class="person-sub">Set this volunteer's days on the Volunteers page first</span>
                        </div>
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
   come from css/teacher/teacherpage.css. Here are only the list of children and the panel that opens under a child. */

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

@media (max-width: 520px) {
  .matchpage .child-toggle .count {
    display: none;
  }
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
