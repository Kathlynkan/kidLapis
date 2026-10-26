<!-- =============================================================
  Volunteer home: "My Children"                       Owner: Yuqi
  -------------------------------------------------------------
  WORKING reference for "load data from the API and show it":
    onMounted -> axios (api.get) -> ref -> computed -> v-for + component
============================================================= -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth' // get auth sotre from Pinia
import PageHeader from '@/components/PageHeader.vue'
import ChildCard from '@/components/ChildCard.vue'
import StateMessage from '@/components/StateMessage.vue'
import { firstName } from '@/utils/format'

const auth = useAuthStore() // open auth store
const router = useRouter()

const children = ref([])
const sessions = ref([])
const loading = ref(true)
const error = ref('')

const activeTab = ref('today') // 'today' or 'all'
const searchText = ref('')
const selectedLevel = ref('') // by default "All levels"

async function loadData() {
  loading.value = true
  error.value = ''

  try {
    // get the children assigned to me (volunteer)
    const childResponse = await api.get('/children')
    children.value = childResponse.data

    // get the sessions of all my children (newest first)
    const sessionResponse = await api.get('/sessions')
    sessions.value = sessionResponse.data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

// find each child's latest session to show under my children tab
const lastSessionByChild = computed(() => {
  const map = {}
  for (const s of sessions.value) {
    if (!map[s.childId]) {
      map[s.childId] = s // store session in obj if child session not stored
    }
  }
  return map
})

// ---------- Today tab / Calendar ----------
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] // Mon-first display order
const today = DAY_NAMES[new Date().getDay()] // e.g. 'Fri'

const selectedDay = ref(today) // calendar selection, defaults to today

// my volunteering days, e.g. ['Mon', 'Wed']
const myDays = computed(() => {
  if (auth.user?.availability) {
    return auth.user.availability
  }
  return []
})

// is today one of my days?
const workingToday = computed(() => {
  return myDays.value.includes(today)
})

// children scheduled with me on a given day
function childrenOnDay(day) {
  const result = []
  for (const child of children.value) {
    const schedule = child.schedule || []
    for (const slot of schedule) {
      if (slot.volunteerId === auth.user?.id && slot.day === day) {
        result.push(child)
        break
      }
    }
  }
  return result
}

// children for the currently selected calendar day
const selectedDayChildren = computed(() => childrenOnDay(selectedDay.value))

// which children have the same struggle 2+ times in their last 5 sessions?
// e.g. { c_1: true, c_3: true, c_4: false }   (same rule as findRecurring on the server)
const needsAttentionByChild = computed(() => {
  const result = {}
  for (const child of children.value) {
    // get latest 5 sessions of this child, sorted newest-first so we don't flag resolved struggles
    const childSessions = sessions.value
      .filter((s) => s.childId === child.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)

    const counts = {}
    let repeated = false
    for (const s of childSessions) {
      for (const struggle of s.struggles) { //each struggle in sessions.struggles
        if (counts[struggle]) {
          counts[struggle] = counts[struggle] + 1
          repeated = true // seen before -> this struggle keeps coming back
        } else {
          counts[struggle] = 1
        }
      }
    }
    result[child.id] = repeated
  }
  return result
})

// ---------- All my children tab ----------
// search + level filter
const filteredChildren = computed(() => {
  const search = searchText.value.toLowerCase()
  let result = children.value.filter((child) => child.name.toLowerCase().includes(search))
  if (selectedLevel.value !== '') {
    result = result.filter((child) => child.level === selectedLevel.value)
  }
  return result
})

// only show levels of all my(volunteer's) children
const levelOptions = computed(() => {
  const levels = []
  for (const child of children.value) {
    if (!levels.includes(child.level)) {
      levels.push(child.level) // include child's level if its not in the array
    }
  }
  return levels.sort()
})

function clearFilters() {
  searchText.value = ''
  selectedLevel.value = ''
}

function openChild(childId) {
  router.push({ name: 'child-profile', params: { id: childId } })
}

onMounted(loadData)
</script>

<template>
  <div class="container py-4">
    <PageHeader
      :title="`Hi ${firstName(auth.user?.name)} 👋`"
      subtitle="Open a child to see their handover before your session."
    />
    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <!-- Toggle Tabs -->
      <ul class="nav nav-tabs mb-3">
        <!-- schedule tab -->
        <li class="nav-item">
          <button
            type="button"
            class="nav-link"
            :class="activeTab === 'today' ? 'active bg-primary text-white' : ''"
            data-test="tab-today"
            @click="activeTab = 'today'"
          >
            <i class="bi bi-calendar-check me-1"></i>My Schedule
            <span class="badge ms-1" :class="activeTab === 'today' ? 'text-bg-light' : 'text-bg-secondary'">
              {{ selectedDayChildren.length }}
            </span>
          </button>
        </li>
        <!-- all children -->
        <li class="nav-item">
          <button
            type="button"
            class="nav-link"
            :class="activeTab === 'all' ? 'active bg-primary text-white' : ''"
            data-test="tab-all"
            @click="activeTab = 'all'"
          >
            <i class="bi bi-people me-1"></i>All my children
            <span class="badge ms-1" :class="activeTab === 'all' ? 'text-bg-light' : 'text-bg-secondary'">
              {{ children.length }}
            </span>
          </button>
        </li>
      </ul>

      <!-- ===== SCHEDULE TAB ===== -->
      <div v-if="activeTab === 'today'">
        <!-- no children at all -->
        <div v-if="children.length === 0" class="cb-card p-4 text-center">
          <i class="bi bi-person-plus fs-2 text-muted-cb"></i>
          <p class="mb-5 mt-2">No children assigned to you yet. Your teacher will assign them.</p>
        </div>

        <template v-else>
          <!-- Week calendar strip -->
          <div class="d-flex gap-2 mb-4">
            <button
              v-for="day in WEEK"
              :key="day"
              type="button"
              class="btn btn-sm flex-fill text-center px-1"
              :class="[
                selectedDay === day
                  ? 'btn-primary'
                  : myDays.includes(day)
                    ? 'btn-outline-primary'
                    : 'btn-outline-secondary opacity-50',
              ]"
              data-test="cal-day"
              @click="selectedDay = day"
            >
              <div class="fw-semibold">{{ day }}</div>
              <div class="small lh-1 mt-1">
                <span
                  v-if="day === today"
                  class="d-block"
                  style="font-size: 0.6rem; letter-spacing: 0.03em"
                  :class="selectedDay === day ? 'text-white' : 'text-primary'"
                >TODAY</span>
                <span
                  class="badge rounded-pill"
                  :class="selectedDay === day ? 'text-bg-light' : 'text-bg-secondary'"
                >{{ childrenOnDay(day).length }}</span>
              </div>
            </button>
          </div>

          <!-- selected day heading -->
          <div class="mb-3 d-flex align-items-center gap-2">
            <h6 class="mb-0 text-muted-cb">
              {{ selectedDay === today ? `Today (${today})` : selectedDay }}
            </h6>
            <span v-if="!myDays.includes(selectedDay)" class="badge text-bg-secondary">Day off</span>
            <span v-else-if="selectedDayChildren.length === 0" class="badge text-bg-secondary">No children</span>
            <span v-else class="badge text-bg-primary">{{ selectedDayChildren.length }} child{{ selectedDayChildren.length !== 1 ? 'ren' : '' }}</span>
          </div>

          <!-- nobody scheduled on selected day -->
          <div v-if="selectedDayChildren.length === 0" class="cb-card p-4 text-center" data-test="not-today">
            <i class="bi bi-calendar-x fs-2 text-muted-cb"></i>
            <p class="mb-1 mt-2">
              <strong v-if="myDays.includes(selectedDay)">No children scheduled with you on {{ selectedDay }}.</strong>
              <strong v-else>You're not volunteering on {{ selectedDay }}.</strong>
            </p>
            <p class="small text-muted-cb">
              Your days: {{ myDays.length > 0 ? myDays.join(', ') : 'not set' }}
            </p>
            <button type="button" class="btn btn-outline-primary btn-sm" @click="activeTab = 'all'">
              View all my children
            </button>
          </div>

          <!-- selected day's children -->
          <div v-else class="row g-3">
            <div v-for="child in selectedDayChildren" :key="child.id" class="col-sm-6 col-lg-4">
              <ChildCard
              :child="child"
              :last-session="lastSessionByChild[child.id]"
              :needs-attention="needsAttentionByChild[child.id]"
              @open="openChild" />
            </div>
          </div>
        </template>
      </div>

      <!-- ===== ALL MY CHILDREN TAB ===== -->
      <div v-else>
        <StateMessage
          v-if="children.length === 0"
          message="No children assigned to you yet. Your teacher will assign them."
        />

        <template v-else>
          <!-- search + filter -->
          <div class="cb-card cb-card-lime p-3 mb-3">
            <div class="row g-2 align-items-end">
              <div class="col-12 col-md-7">
                <label for="search" class="form-label small mb-1">Search</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-search"></i></span>
                  <input
                    id="search"
                    v-model.trim="searchText"
                    type="text"
                    class="form-control"
                    placeholder="Type a child's name"
                    data-test="child-search"
                  />
                </div>
              </div>
              <!-- filter by level -->
              <div class="col-8 col-md-3">
                <select v-model="selectedLevel" class="form-select" data-test="level-filter">
                  <option value="">All levels</option>
                  <option v-for="level in levelOptions" :key="level" :value="level">{{ level }}</option>
                </select>
              </div>
              <div class="col-4 col-md-2 d-grid">
                <button type="button" class="btn btn-outline-secondary" @click="clearFilters">Clear</button>
              </div>
            </div>
          </div>

          <StateMessage v-if="filteredChildren.length === 0" message="No children match your search." />

          <div v-else class="row g-3">
            <div v-for="child in filteredChildren" :key="child.id" class="col-sm-6 col-lg-4">
              <ChildCard
              :child="child"
              :last-session="lastSessionByChild[child.id]"
              :needs-attention="needsAttentionByChild[child.id]"
              @open="openChild" />
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
