<!-- =============================================================
  Skills-based matchmaking                            Owner: Yu Xuan
  Route: /coordinator/matchmaking/:childId?
  -------------------------------------------------------------
  Flow: pick a child -> see suggested volunteers ranked by score
        -> pick a day -> "Assign" -> child.volunteerIds + child.schedule updated
    [x] GET /matchmaking/:childId -> ranked suggestions with matched skills
    [x] show WHY: "Matches: Fractions, Primary Math · Free on Mon"
    [x] assign (with day) / unassign -> PUT /matchmaking/:childId/assign
    [x] unassigned children listed first (Sofia in the demo data)
============================================================= -->
<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import PageHeader from '@/components/PageHeader.vue'
import ChildInitial from '@/components/ChildInitial.vue'
import StateMessage from '@/components/StateMessage.vue'
import { firstName } from '@/utils/format'
import '@/css/teacher/teacherpage.css' // the styles of the teacher pages

const route = useRoute()
const router = useRouter()

const children = ref([])
const loading = ref(true)
const error = ref('')

// Start from the URL, so /coordinator/matchmaking/c_6 opens Sofia directly
// (handy for linking from a dashboard alert).
const selectedId = ref(route.params.childId || '')

const suggestions = ref([])
const loadingSuggestions = ref(false)
const suggestionsError = ref('')

const dayChoice = ref({}) // { volunteerId: 'Mon' } - the day picked in each card's dropdown
const busyId = ref(null) // volunteer currently being assigned/unassigned
const actionError = ref('')

const isAssigned = (c) => (c.volunteerIds || []).length > 0

// Unassigned children first, then alphabetical.
const sortedChildren = computed(() =>
  [...children.value].sort(
    (a, b) => Number(isAssigned(a)) - Number(isAssigned(b)) || a.name.localeCompare(b.name),
  ),
)

const unassignedCount = computed(() => children.value.filter((c) => !isAssigned(c)).length)
const selectedChild = computed(() => children.value.find((c) => c.id === selectedId.value))

onMounted(async () => {
  try {
    const res = await api.get('/children')
    children.value = res.data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
  if (selectedId.value) loadSuggestions()
})

// Picking a child: update the URL and load that child's suggestions.
watch(selectedId, (id) => {
  router.replace({ params: { childId: id || undefined } })
  loadSuggestions()
})

async function loadSuggestions() {
  suggestions.value = []
  suggestionsError.value = ''
  actionError.value = ''
  dayChoice.value = {}
  if (!selectedId.value) return

  loadingSuggestions.value = true
  try {
    const res = await api.get(`/matchmaking/${selectedId.value}`)
    suggestions.value = res.data.suggestions
    replaceChild(res.data.child) // keeps the dropdown's "unassigned" order up to date
  } catch (err) {
    suggestionsError.value = errorMessage(err)
  } finally {
    loadingSuggestions.value = false
  }
}

function replaceChild(updated) {
  const i = children.value.findIndex((c) => c.id === updated.id)
  if (i !== -1) children.value[i] = updated
}

async function changeAssignment(s, body) {
  busyId.value = s.volunteerId
  actionError.value = ''
  try {
    await api.put(`/matchmaking/${selectedId.value}/assign`, { volunteerId: s.volunteerId, ...body })
    // Reload: scores, workloads and the child's assigned state all change after an assignment.
    await loadSuggestions()
  } catch (err) {
    actionError.value = errorMessage(err)
  } finally {
    busyId.value = null
  }
}

const assign = (s) => changeAssignment(s, { action: 'assign', day: dayChoice.value[s.volunteerId] })
const unassign = (s) => changeAssignment(s, { action: 'unassign' })
</script>

<template>
  <div class="container py-4 teacherpage">
    <PageHeader title="Matchmaking" subtitle="Match each child with volunteers who have the right skills." />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <!-- the sandy board: the child picker and the white cards -->
    <div v-else class="board">
      <div class="t-card pick">
        <label class="fact-key" for="child">Child</label>
        <select id="child" v-model="selectedId" class="form-select" data-test="child-select">
          <option value="" disabled>Choose a child</option>
          <option v-for="c in sortedChildren" :key="c.id" :value="c.id">
            {{ isAssigned(c) ? '' : '[No volunteer] ' }}{{ c.name }} ({{ c.level }}) - needs:
            {{ (c.needs || []).join(', ') }}
          </option>
        </select>
        <div v-if="unassignedCount" class="person-sub">
          <i class="bi bi-exclamation-circle me-1"></i>
          {{ unassignedCount }} {{ unassignedCount === 1 ? 'child has' : 'children have' }} no volunteer yet,
          shown first.
        </div>
      </div>

      <div v-if="!selectedId" class="t-card empty">
        <strong>Choose a child</strong>
        Pick a child above to see the volunteers who could work with them.
      </div>

      <StateMessage v-else-if="loadingSuggestions && !suggestions.length" type="loading" />
      <StateMessage v-else-if="suggestionsError" type="error" :message="suggestionsError" />

      <template v-else-if="selectedChild">
        <h2 class="section-title">
          Suggested volunteers for {{ firstName(selectedChild.name) }}
          <span class="muted">(best match first)</span>
        </h2>

        <div v-if="actionError" class="note note-bad" data-test="action-error">{{ actionError }}</div>

        <div class="suggestions">
          <article v-for="s in suggestions" :key="s.volunteerId" class="t-card person" data-test="suggestion-card">
            <div class="suggest-top">
              <div class="person-top">
                <ChildInitial class="is-volunteer" :child="{ name: s.name }" />
                <div>
                  <div class="suggest-title">
                    <h3 class="person-name">{{ s.name }}</h3>
                    <span v-if="s.assigned" class="tag tag-ok" data-test="assigned-badge">
                      Assigned{{ s.scheduledDays.length ? ` on ${s.scheduledDays.join(', ')}` : '' }}
                    </span>
                  </div>
                  <div class="person-sub">
                    Score {{ s.score }}: skills +{{ s.breakdown.skills }}, days +{{ s.breakdown.days }},
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
                  :disabled="busyId !== null"
                  data-test="unassign-btn"
                  @click="unassign(s)"
                >
                  {{ busyId === s.volunteerId ? 'Removing…' : 'Unassign' }}
                </button>

                <template v-else-if="s.availability.length">
                  <label class="visually-hidden" :for="`day-${s.volunteerId}`">Session day for {{ s.name }}</label>
                  <select
                    :id="`day-${s.volunteerId}`"
                    v-model="dayChoice[s.volunteerId]"
                    class="form-select skill-select"
                    data-test="day-select"
                  >
                    <option :value="undefined" disabled>Pick a day</option>
                    <option v-for="d in s.availability" :key="d" :value="d">{{ d }}</option>
                  </select>
                  <button
                    type="button"
                    class="t-btn"
                    :disabled="!dayChoice[s.volunteerId] || busyId !== null"
                    data-test="assign-btn"
                    @click="assign(s)"
                  >
                    {{ busyId === s.volunteerId ? 'Assigning…' : 'Assign' }}
                  </button>
                </template>

                <span v-else class="person-sub">Set this volunteer's days on the Volunteers page first</span>
              </div>
            </div>

            <!-- WHY this volunteer -->
            <div class="facts" data-test="match-reason">
              <div class="fact">
                <span class="fact-key">Matches</span>
                <span class="fact-value">{{ s.matchedSkills.join(', ') || 'No matching skills' }}</span>
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
          </article>
        </div>
      </template>
    </div>
  </div>
</template>
