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
import '@/css/volunteerpage.css' // the styles of this page and of the child card

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
  <div class="container py-4 volunteerpage">
    <PageHeader
      :title="`Hi, ${firstName(auth.user?.name)}`"
      subtitle="Open a child to see their handover before your session."
    />
    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <!-- the two tabs -->
      <div class="tabs">
        <!-- schedule tab -->
        <button type="button" class="tab" :class="{ active: activeTab === 'today' }" data-test="tab-today" @click="activeTab = 'today'">
          My Schedule
          <span class="tab-count">{{ selectedDayChildren.length }}</span>
        </button>
        <!-- all children -->
        <button type="button" class="tab" :class="{ active: activeTab === 'all' }" data-test="tab-all" @click="activeTab = 'all'">
          All my children
          <span class="tab-count">{{ children.length }}</span>
        </button>
      </div>

      <!-- ===== SCHEDULE TAB ===== -->
      <div v-if="activeTab === 'today'">
        <!-- no children at all -->
        <div v-if="children.length === 0" class="empty-box">
          <i class="bi bi-person-plus"></i>
          <p>No children assigned to you yet. Your teacher will assign them.</p>
        </div>

        <template v-else>
          <!-- Week calendar strip -->
          <div class="week">
            <button
              v-for="day in WEEK"
              :key="day"
              type="button"
              class="week-day"
              :class="{ selected: selectedDay === day, off: !myDays.includes(day) }"
              data-test="cal-day"
              @click="selectedDay = day"
            >
              <span class="week-name">{{ day }}</span>
              <span class="week-today">{{ day === today ? 'Today' : '' }}</span>
              <span class="week-count">{{ childrenOnDay(day).length }}</span>
            </button>
          </div>

          <!-- selected day heading -->
          <div class="day-heading">
            <h3 class="day-title">
              {{ selectedDay === today ? `Today (${today})` : selectedDay }}
            </h3>
            <span v-if="!myDays.includes(selectedDay)" class="pill pill-quiet">Day off</span>
            <span v-else-if="selectedDayChildren.length === 0" class="pill pill-quiet">No children</span>
            <span v-else class="pill pill-green">{{ selectedDayChildren.length }} child{{ selectedDayChildren.length !== 1 ? 'ren' : '' }}</span>
          </div>

          <!-- nobody scheduled on selected day -->
          <div v-if="selectedDayChildren.length === 0" class="empty-box" data-test="not-today">
            <i class="bi bi-calendar-x"></i>
            <p>
              <strong v-if="myDays.includes(selectedDay)">No children scheduled with you on {{ selectedDay }}.</strong>
              <strong v-else>You're not volunteering on {{ selectedDay }}.</strong>
            </p>
            <p class="muted">
              Your days: {{ myDays.length > 0 ? myDays.join(', ') : 'not set' }}
            </p>
            <button type="button" class="soft-button" @click="activeTab = 'all'">
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
          <div class="filter-box">
            <div class="row g-2 align-items-end">
              <div class="col-12 col-md-7">
                <label for="search" class="form-label mb-1">Search</label>
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
                <button type="button" class="soft-button" @click="clearFilters">Clear</button>
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
