<!-- Child home: "My Quests" (gamified homework)         Owner: Jachin -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import StateMessage from '@/components/StateMessage.vue'
import HomeworkQuestCard from '@/components/HomeworkQuestCard.vue'
import { BADGES, levelFor, earnedBadges, badgeProgress, currentStreak } from '@/utils/gamification'

// constellation layout — pixel positions on CANVAS_W × CANVAS_H virtual canvas
const CANVAS_W = 1000
const CANVAS_H = 320
const NODES = [
  { x: 82,  y: 108 },  // 0 First Quest    — top-left
  { x: 265, y: 90  },  // 1 On Fire        — top-center
  { x: 450, y: 108 },  // 2 Quest Champion — top-right
  { x: 448, y: 218 },  // 3 Bookworm       — bottom-right
  { x: 265, y: 232 },  // 4 Century        — bottom-center
  { x: 80,  y: 218 },  // 5 Rising Star    — bottom-left
]
const CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]
function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)}, ${parseInt(hex.slice(3,5),16)}, ${parseInt(hex.slice(5,7),16)}`
}
import '@/css/child/childhome.css'

const auth = useAuthStore()

const me       = ref(null)
const homework = ref([])
const sessions = ref([])
const loading  = ref(true)
const error    = ref('')
const celebrating  = ref(false)
const submitError  = ref('')

// badge tooltip — teleported to body so overflow:hidden never clips it
const tooltip = ref(null)
function showTooltip(badge, earned, event) {
  const rect = event.currentTarget.getBoundingClientRect()
  tooltip.value = { badge, earned, x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom, below: rect.top < 200 }
}
function hideTooltip() { tooltip.value = null }

// drag-to-pan for the constellation
const fieldRef  = ref(null)
const panX      = ref(0)
const isDragging = ref(false)
const dragStart  = ref({ x: 0 })

function clampPan() {
  if (!fieldRef.value) return
  const minX = -(CANVAS_W - fieldRef.value.offsetWidth)
  panX.value = Math.max(minX, Math.min(0, panX.value))
}

function startDrag(e) {
  isDragging.value = true
  const pt = e.touches ? e.touches[0] : e
  dragStart.value.x = pt.clientX - panX.value
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup',  endDrag)
}
function onDrag(e) {
  if (!isDragging.value) return
  const pt = e.touches ? e.touches[0] : e
  const minX = fieldRef.value ? -(CANVAS_W - fieldRef.value.offsetWidth) : -(CANVAS_W - 600)
  panX.value = Math.max(minX, Math.min(0, pt.clientX - dragStart.value.x))
}
function endDrag() {
  isDragging.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup',  endDrag)
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup',  endDrag)
  window.removeEventListener('resize',   clampPan)
})

// ── Computed ─────────────────────────────────────────────────
const level     = computed(() => levelFor(me.value?.points || 0))
const streak    = computed(() => currentStreak(homework.value))
const earned    = computed(() => me.value ? earnedBadges(me.value, homework.value, sessions.value) : [])
const earnedIds = computed(() => new Set(earned.value.map((b) => b.id)))
const todo      = computed(() => homework.value.filter((h) => h.status === 'assigned'))
const done      = computed(() => homework.value.filter((h) => h.status !== 'assigned'))
const showDone  = ref(false)

const emptyQuestMessage = computed(() =>
  homework.value.length === 0
    ? 'No quests yet — your teacher will add some soon!'
    : 'All quests done — great work!',
)

// closest unearned badge (highest progress ratio)
const nextBadge = computed(() => {
  if (!me.value) return null
  const unearned = BADGES.filter((b) => !earnedIds.value.has(b.id))
  if (!unearned.length) return null
  return unearned
    .map((b) => ({ badge: b, ...badgeProgress(b, me.value, homework.value) }))
    .reduce((best, curr) =>
      curr.current / curr.target > best.current / best.target ? curr : best,
    )
})

// ── Actions ──────────────────────────────────────────────────
async function submitQuest(homeworkId) {
  submitError.value = ''
  try {
    await api.put(`/homework/${homeworkId}/submit`)
    const h = homework.value.find((hw) => hw.id === homeworkId)
    if (h) {
      h.status      = 'submitted'
      h.completedAt = new Date().toISOString().slice(0, 10)
    }
    showDone.value    = true
    celebrating.value = true
    setTimeout(() => (celebrating.value = false), 2200)
  } catch (err) {
    submitError.value = errorMessage(err)
  }
}

onMounted(async () => {
  window.addEventListener('resize', clampPan)
  try {
    const [c, h, s] = await Promise.all([
      api.get(`/children/${auth.user.childId}`),
      api.get('/homework', { params: { childId: auth.user.childId } }),
      api.get('/sessions', { params: { childId: auth.user.childId } }),
    ])
    me.value       = c.data
    homework.value = h.data
    sessions.value = s.data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container py-4">
    <Transition name="celebrate">
      <div v-if="celebrating" class="celebrate-overlay" aria-hidden="true">
        <i class="bi bi-award-fill celebrate-main"></i>
        <i class="bi bi-star-fill celebrate-spark celebrate-s1"></i>
        <i class="bi bi-star-fill celebrate-spark celebrate-s2"></i>
        <i class="bi bi-star-fill celebrate-spark celebrate-s3"></i>
        <i class="bi bi-star-fill celebrate-spark celebrate-s4"></i>
        <i class="bi bi-star-fill celebrate-spark celebrate-s5"></i>
        <i class="bi bi-star-fill celebrate-spark celebrate-s6"></i>
      </div>
    </Transition>

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <!-- Hero card -->
      <div class="hero-card p-4 mb-4 text-center">
        <div class="hero-avatar display-3">{{ me.avatar }}</div>
        <h1 class="h2 mb-1">Hi {{ auth.user.name }}!</h1>
        <div class="fs-4 fw-heavy mb-1">
          <i class="bi bi-star-fill me-1"></i>{{ me.points }} stars &middot; Level {{ level.level }}
          <span v-if="streak > 0" class="hero-streak-badge">
            <i class="bi bi-fire"></i> {{ streak }}-day streak
          </span>
        </div>
        <div
          class="progress mx-auto level-bar mb-1"
          role="progressbar"
          :aria-valuenow="level.progress"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="progress-bar" :style="{ width: level.progress + '%' }"></div>
        </div>
        <div class="small lapis-muted">{{ level.progress }}/100 to Level {{ level.level + 1 }}</div>
      </div>

      <!-- Quests to do -->
      <h2 class="h4 mb-3"><i class="bi bi-map me-2"></i>Quests to do</h2>

      <div v-if="submitError" class="alert alert-danger py-2 mb-3" role="alert">
        <i class="bi bi-exclamation-circle me-2"></i>{{ submitError }}
        <button type="button" class="btn-close btn-sm float-end" @click="submitError = ''"></button>
      </div>

      <StateMessage v-if="todo.length === 0" :message="emptyQuestMessage" />
      <div class="row g-3 mb-4">
        <div v-for="h in todo" :key="h.id" class="col-sm-6 col-lg-4">
          <HomeworkQuestCard :homework="h" mode="child" @submit="submitQuest" />
        </div>
      </div>

      <!-- My Badges -->
      <h2 class="h4 mb-3 mt-2">My Badges</h2>
      <div class="constellation-cabinet">
        <div class="constellation-header">
          <span class="constellation-name">Badge map</span>
          <div class="constellation-progress" :aria-label="`${earned.length} of ${BADGES.length} badges earned`">
            <div class="constellation-progress-bar" aria-hidden="true">
              <div
                class="constellation-progress-fill"
                :style="{ width: (earned.length / BADGES.length * 100) + '%' }"
              ></div>
            </div>
            <span class="constellation-progress-label">{{ earned.length }} / {{ BADGES.length }}</span>
          </div>
        </div>

        <div
          class="constellation-field"
          ref="fieldRef"
          :class="{ 'is-dragging': isDragging }"
          @mousedown.prevent="startDrag"
          @touchstart.passive="startDrag"
          @touchmove.prevent="onDrag"
          @touchend="endDrag"
          @touchcancel="endDrag"
        >
          <span
            v-for="n in 8" :key="`p-${n}`"
            class="star-particle"
            :style="{ '--px': [12,24,37,50,61,72,83,93][n-1] + '%', '--delay': (n * 0.85) + 's' }"
            aria-hidden="true"
          ></span>

          <div
            class="constellation-canvas"
            :style="{ transform: `translate(${panX}px, 0px)` }"
            draggable="false"
          >
            <svg
              class="constellation-svg"
              :viewBox="`0 0 ${CANVAS_W} ${CANVAS_H}`"
              preserveAspectRatio="none"
              aria-hidden="true"
              draggable="false"
            >
              <defs>
                <filter id="orb-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <line
                v-for="[a, b] in CONNECTIONS"
                :key="`line-${a}-${b}`"
                :x1="NODES[a].x" :y1="NODES[a].y"
                :x2="NODES[b].x" :y2="NODES[b].y"
                class="const-line"
                :class="{ 'const-line-lit': earnedIds.has(BADGES[a].id) && earnedIds.has(BADGES[b].id) }"
              />
              <circle
                v-for="[a, b] in CONNECTIONS.filter(([a,b]) => earnedIds.has(BADGES[a].id) && earnedIds.has(BADGES[b].id))"
                :key="`orb-${a}-${b}`"
                r="4" fill="#FFF5CC" filter="url(#orb-glow)"
              >
                <animateMotion
                  :path="`M${NODES[a].x},${NODES[a].y} L${NODES[b].x},${NODES[b].y}`"
                  :dur="(2.5 + (a + b) * 0.3) + 's'"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>

            <div
              v-for="(node, i) in NODES"
              :key="BADGES[i].id"
              class="const-node"
              :class="{ 'const-node-earned': earnedIds.has(BADGES[i].id) }"
              :style="{
                left: node.x + 'px',
                top: node.y + 'px',
                animationDelay: (i * 0.1) + 's',
                '--badge-color': BADGES[i].color,
                '--badge-rgb': hexToRgb(BADGES[i].color),
              }"
              @mouseenter="showTooltip(BADGES[i], earnedIds.has(BADGES[i].id), $event)"
              @mouseleave="hideTooltip"
            >
              <div class="const-node-ring">
                <template v-if="earnedIds.has(BADGES[i].id)">
                  <i :class="`bi ${BADGES[i].icon}`"></i>
                </template>
                <template v-else>
                  <i :class="`bi ${BADGES[i].icon}`" class="const-icon-ghost" aria-hidden="true"></i>
                  <i class="bi bi-lock-fill const-icon-lock" aria-hidden="true"></i>
                </template>
              </div>
              <span class="const-node-label">{{ BADGES[i].name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Next badge nudge -->
      <div v-if="nextBadge" class="next-badge-nudge mt-3">
        <i :class="`bi ${nextBadge.badge.icon} next-badge-icon`" :style="{ color: nextBadge.badge.color }"></i>
        <div class="next-badge-body">
          <div class="next-badge-label">Up next: <strong>{{ nextBadge.badge.name }}</strong></div>
          <div class="next-badge-rule">{{ nextBadge.badge.rule }}</div>
          <div class="next-badge-track-wrap">
            <div class="next-badge-track">
              <div class="next-badge-fill" :style="{ width: (nextBadge.current / nextBadge.target * 100) + '%' }"></div>
            </div>
            <span class="next-badge-fraction">{{ nextBadge.current }} / {{ nextBadge.target }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="earned.length === BADGES.length" class="next-badge-nudge next-badge-complete mt-3">
        <i class="bi bi-trophy-fill next-badge-icon" style="color: #F5DF98"></i>
        <div class="next-badge-body">
          <div class="next-badge-label"><strong>All badges unlocked!</strong></div>
          <div class="next-badge-rule">You've collected every badge. Amazing work!</div>
        </div>
      </div>

      <!-- Completed quests (collapsed by default, auto-opens after submit) -->
      <div v-if="done.length > 0" class="mt-4">
        <button class="quest-history-toggle" @click="showDone = !showDone">
          <i class="bi bi-check-circle-fill me-2"></i>Completed quests
          <span class="quest-history-count">{{ done.length }}</span>
          <i :class="showDone ? 'bi-chevron-up' : 'bi-chevron-down'" class="bi ms-auto"></i>
        </button>
        <div v-if="showDone" class="row g-3 mt-1">
          <div v-for="h in done" :key="h.id" class="col-sm-6 col-lg-4">
            <HomeworkQuestCard :homework="h" mode="child" />
          </div>
        </div>
      </div>
    </template>
  </div>

  <Teleport to="body">
    <div
      v-if="tooltip"
      class="const-tooltip-fixed"
      :class="{ 'const-tooltip-earned': tooltip.earned }"
      :style="{
        left: tooltip.x + 'px',
        top: tooltip.below ? (tooltip.bottom + 10) + 'px' : (tooltip.top - 10) + 'px',
        transform: tooltip.below ? 'translateX(-50%)' : 'translateX(-50%) translateY(-100%)',
      }"
    >
      <div class="const-tooltip-name">{{ tooltip.badge.name }}</div>
      <div class="const-tooltip-divider"></div>
      <div class="const-tooltip-rule">{{ tooltip.badge.rule }}</div>
      <div class="const-tooltip-status">
        <i :class="`bi ${tooltip.earned ? 'bi-stars' : 'bi-lock-fill'}`"></i>
        {{ tooltip.earned ? 'Unlocked' : 'Locked' }}
      </div>
    </div>
  </Teleport>
</template>
