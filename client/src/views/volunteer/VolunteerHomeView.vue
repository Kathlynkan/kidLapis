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
import '@/css/volunteer/volunteershared.css' // what the volunteer pages have in common
import '@/css/main/labels.css' // the capital-letter captions

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
      <!-- the sandy board: the tabs and the white cards -->
      <div class="board">
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
      </div>
    </template>
  </div>
</template>

<style>
/* INTERNAL CSS: only this page uses these styles, so they live here in the .vue file. (CSS shared by several pages is in src/css/.) */

/* Styles for the volunteer home page (VolunteerHomeView.vue and ChildCard.vue).
   Every rule starts with .volunteerpage so it only affects that page.
   Colours:
     #213C31 dark green       text
     #446C59 green            the title and the line under it
     #4A735F deep green       counts, icons and the arrow
     #9BD3B2 mint             the selected day, the child's letter (the volunteer layer, as in --layer-volunteer)
     #CDE9D8 pale mint        small numbers and buttons
     #E1F2E9 lightest mint    the tabs track, the days, the search box
     #B7D8D7 muted teal       the last session tag (the same as "Being checked" on the parent page)
     #E4F0EF pale teal        the search box and the "No children" tag
     #3E6B6A dark teal        the small icons, the arrows and the search focus line
     #FBE7A1 yellow           needs attention (the same yellow as "due" on the parent page)
     #6B8177 grey green       small text
     #D9E8DF                  thin borders
     #F9F1E6 sand             the board (the same as on the parent page)
   Look: a cream page, a sandy board with white cards on it, no outlines, soft corners (14px to 22px, round pills)
   and a very light shadow. */

/* ---------- the whole page ---------- */

.volunteerpage h1,
.volunteerpage h2,
.volunteerpage h3 {
  font-family: inherit;
  color: #213C31;
  text-shadow: none;
}

.volunteerpage .muted {
  color: #6B8177;
  font-size: 13px;
}

/* ---------- the board: the sandy box that holds the tabs and the white cards (the same as on the parent page) ---------- */

/* ---------- the two tabs: two pills in a pale track ---------- */

.volunteerpage .tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  padding: 4px;
  border-radius: 999px;
  background: #E1F2E9;
}

.volunteerpage .tab {
  flex: 1;
  min-height: 42px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #213C31;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
}

.volunteerpage .tab:hover {
  background: rgba(255, 255, 255, 0.55);
}

.volunteerpage .tab.active {
  background: #FFFFFF;
  box-shadow: 0 1px 4px rgba(33, 60, 49, 0.15);
}

.volunteerpage .tab-count {
  display: inline-block;
  margin-left: 6px;
  padding: 0 7px;
  border-radius: 999px;
  background: #4A735F;
  color: #FFFFFF;
  font-size: 12px;
  line-height: 20px;
}

/* ---------- the week ---------- */

.volunteerpage .week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 18px;
}

.volunteerpage .week-day {
  min-width: 0;
  padding: 7px 0 9px;
  border: 0;
  border-radius: 14px;
  background: #E1F2E9;
  color: #213C31;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

.volunteerpage .week-day:hover {
  background: #CDE9D8;
}

/* a day when I do not volunteer is faded, unless I opened it (the selected rule comes after, so it wins) */
.volunteerpage .week-day.off {
  opacity: 0.55;
}

.volunteerpage .week-day.selected {
  background: #9BD3B2;
  opacity: 1;
}

.volunteerpage .week-name,
.volunteerpage .week-today,
.volunteerpage .week-count {
  display: block;
}

.volunteerpage .week-today {
  min-height: 14px;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
}

.volunteerpage .week-count {
  width: fit-content;
  min-width: 20px;
  margin: 2px auto 0;
  padding: 0 6px;
  border-radius: 999px;
  background: #CDE9D8;
  font-size: 12px;
  line-height: 20px;
}

.volunteerpage .week-day.selected .week-count {
  background: #FFFFFF;
}

/* ---------- the heading of the chosen day ---------- */

.volunteerpage .day-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.volunteerpage .day-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.volunteerpage .pill {
  padding: 2px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.volunteerpage .pill-green {
  background: #4A735F;
  color: #FFFFFF;
}

.volunteerpage .pill-quiet {
  background: #E4F0EF;
}

/* ---------- boxes with a message (nobody today, no children yet) ---------- */

.volunteerpage .empty-box {
  padding: 28px 16px;
  border-radius: 18px;
  background: #FFFFFF;
  box-shadow: 0 1px 6px rgba(33, 60, 49, 0.1);
  text-align: center;
}

.volunteerpage .empty-box i {
  color: #6B8177;
  font-size: 30px;
}

.volunteerpage .empty-box p {
  margin: 8px 0 0;
}

.volunteerpage .empty-box .muted {
  margin-bottom: 14px;
}

/* ---------- the buttons ---------- */

.volunteerpage .soft-button {
  padding: 7px 20px;
  border: 0;
  border-radius: 999px;
  background: #CDE9D8;
  color: #213C31;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
}

.volunteerpage .soft-button:hover {
  background: #9BD3B2;
}

/* ---------- the search box ---------- */

.volunteerpage .filter-box {
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 18px;
  background: #E4F0EF;
}

.volunteerpage .form-label {
  font-size: 14px;
  font-weight: 700;
}

.volunteerpage .form-control,
.volunteerpage .form-select,
.volunteerpage .input-group-text {
  border: 1px solid #D9E8DF;
  background: #FFFFFF;
  color: #213C31;
  font-family: inherit;
  box-shadow: none;
}

.volunteerpage .form-select {
  border-radius: 999px;
}

.volunteerpage .input-group-text {
  border-radius: 999px 0 0 999px;
}

.volunteerpage .input-group .form-control {
  border-radius: 0 999px 999px 0;
}

.volunteerpage .form-control:focus,
.volunteerpage .form-select:focus {
  border-color: #3E6B6A;
  box-shadow: 0 0 0 3px #B7D8D7;
}

/* ---------- one child (ChildCard.vue) ---------- */

.volunteerpage .child-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 18px;
  border-radius: 18px;
  background: #FFFFFF;
  box-shadow: 0 1px 6px rgba(33, 60, 49, 0.1);
  cursor: pointer;
}

.volunteerpage .child-card:hover {
  box-shadow: 0 4px 14px rgba(33, 60, 49, 0.18);
}

.volunteerpage .child-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.volunteerpage .child-top > div {
  min-width: 0;
}

/* the round picture of the child: the first letter of the name */
.volunteerpage .child-initial {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #9BD3B2;
  font-size: 17px;
  font-weight: 700;
}

.volunteerpage .child-name {
  margin: 0;
  font-size: 17px;
}

.volunteerpage .needs-attention {
  display: inline-block;
  margin-top: 4px;
  padding: 1px 10px;
  border-radius: 999px;
  background: #FBE7A1;
  font-size: 12px;
  font-weight: 700;
}

.volunteerpage .child-facts {
  margin-bottom: 12px;
  font-size: 14px;
}

.volunteerpage .child-facts i {
  margin-right: 5px;
  color: #3E6B6A;
}

.volunteerpage .child-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.volunteerpage .last-seen {
  padding: 2px 12px;
  border-radius: 999px;
  background: #B7D8D7;
  font-size: 12px;
  font-weight: 700;
}

.volunteerpage .child-arrow {
  color: #3E6B6A;
  font-size: 20px;
}
</style>
