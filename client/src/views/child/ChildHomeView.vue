<!-- Child home: "My Quests" (gamified homework)         Owner: Jachin -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import StateMessage from '@/components/StateMessage.vue'
import HomeworkQuestCard from '@/components/HomeworkQuestCard.vue'
import { BADGES, levelFor, earnedBadges, badgeProgress } from '@/utils/gamification'
import { formatDate } from '@/utils/format'

const auth = useAuthStore()

const me       = ref(null)
const homework = ref([])
const loading  = ref(true)
const error    = ref('')
const celebrating     = ref(false)
const submitError     = ref('')
const badgeQueue      = ref([])    // badges waiting to be shown one by one
const newBadge        = computed(() => badgeQueue.value[0] || null)
const justUnlockedId  = ref(null)  // id of the tile to pulse in the grid
const toastQueue      = ref([])    // notification toasts: [{ id, icon, message, color }]
let   toastCounter    = 0

// Track which badge popups this child has already dismissed (per device, per child)
const SEEN_KEY    = `seen-badges-${auth.user.childId}`
const seenBadgeIds = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'))

function dismissBadge() {
  const badge = badgeQueue.value[0]
  if (badge) {
    seenBadgeIds.add(badge.id)
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seenBadgeIds]))
  }
  badgeQueue.value.shift()
}
function showNextBadge(badge) { badgeQueue.value.push(badge) }

// Queue popups for every earned badge the child has not yet dismissed.
// Skips badges already sitting in the queue to avoid duplicates across poll cycles.
function queueUnseen(delay) {
  const inQueue = new Set(badgeQueue.value.map((b) => b.id))
  const toShow  = earned.value.filter((b) => !seenBadgeIds.has(b.id) && !inQueue.has(b.id))
  if (!toShow.length) return
  setTimeout(() => { toShow.forEach(showNextBadge) }, delay)
}

function showToast(icon, message, color) {
  const id = ++toastCounter
  toastQueue.value.push({ id, icon, message, color })
  setTimeout(() => { toastQueue.value = toastQueue.value.filter((t) => t.id !== id) }, 4500)
}

const CONFETTI = [
  { color: '#E8A0B8', tx:  -70, ty: -150 },
  { color: '#9BD3B2', tx:   70, ty: -150 },
  { color: '#D5CBEA', tx: -155, ty:  -70 },
  { color: '#AED9D8', tx:  155, ty:  -70 },
  { color: '#F5DF98', tx: -165, ty:   25 },
  { color: '#E8A0B8', tx:  165, ty:   25 },
  { color: '#9BD3B2', tx: -120, ty:  135 },
  { color: '#AED9D8', tx:  120, ty:  135 },
  { color: '#D5CBEA', tx:  -40, ty:  165 },
  { color: '#F5DF98', tx:   40, ty:  165 },
  { color: '#E8A0B8', tx: -175, ty:  -20 },
  { color: '#9BD3B2', tx:  175, ty:  -20 },
  { color: '#AED9D8', tx:  -28, ty: -175 },
  { color: '#D5CBEA', tx:   28, ty: -175 },
]

// ── Computed ─────────────────────────────────────────────────
const displayPoints = computed(() => me.value?.points || 0)
const level     = computed(() => levelFor(displayPoints.value))
const earned    = computed(() => me.value ? earnedBadges(me.value, homework.value) : [])
const earnedIds = computed(() => new Set(earned.value.map((b) => b.id)))
const todo      = computed(() => homework.value.filter((h) => h.status === 'assigned'))
const done      = computed(() => homework.value.filter((h) => h.status !== 'assigned'))
const showDone  = ref(false)

const emptyQuestMessage = computed(() =>
  homework.value.length === 0
    ? 'No quests yet — your coordinator will add some soon!'
    : 'All quests done — great work!',
)

// the kueh lapis resets every 200 pts (one full cake) — each restart is a new "season"
const SEASON_PTS = 200
const STEP       = 50
const season       = computed(() => Math.floor(displayPoints.value / SEASON_PTS) + 1)
const cakeProgress = computed(() => levelFor(displayPoints.value % SEASON_PTS))
const layers       = computed(() => Math.min(cakeProgress.value.level - 1, 4))

// pending points: submitted but not yet verified (uses half-points if late, same as backend)
const pendingPoints = computed(() =>
  homework.value
    .filter((h) => h.status === 'submitted')
    .reduce((sum, h) => {
      const late = h.completedAt && h.dueDate && h.completedAt > h.dueDate
      return sum + (late ? Math.floor(h.points / 2) : h.points)
    }, 0),
)
// how much of the current layer those pending points would fill (capped at remaining space)
const pendingProgress = computed(() => {
  if (pendingPoints.value === 0) return 0
  const verifiedInLayer = (displayPoints.value % SEASON_PTS) % STEP
  const spaceLeft = STEP - verifiedInLayer
  return Math.round((Math.min(pendingPoints.value, spaceLeft) / STEP) * 100)
})

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

// ── Tabs ──────────────────────────────────────────────────────
const activeTab = ref('quests') // 'quests' | 'tin'

// the label under the tin shows the kueh you tapped, or else the next one to earn
const picked = ref(null)
const shown = computed(() => picked.value || nextBadge.value?.badge || BADGES[0])
const shownProgress = computed(() => badgeProgress(shown.value, me.value, homework.value))

// ── Actions ──────────────────────────────────────────────────
async function submitQuest(homeworkId) {
  submitError.value = ''
  try {
    await api.put(`/homework/${homeworkId}/submit`)
    const h = homework.value.find((hw) => hw.id === homeworkId)
    if (h) {
      h.status      = 'submitted'
      h.completedAt = new Date().toISOString().slice(0, 10)
      h.rejectedAt  = null
    }
    showDone.value    = true
    celebrating.value = true
    setTimeout(() => (celebrating.value = false), 2200)
  } catch (err) {
    submitError.value = errorMessage(err)
  }
}

async function unsubmitQuest(homeworkId) {
  submitError.value = ''
  try {
    await api.put(`/homework/${homeworkId}/unsubmit`)
    const h = homework.value.find((hw) => hw.id === homeworkId)
    if (h) {
      h.status = 'assigned'
      h.completedAt = null
    }
  } catch (err) {
    submitError.value = errorMessage(err)
  }
}

async function refreshData() {
  try {
    const prevPoints      = me.value?.points || 0
    const prevLevel       = level.value.level
    const prevEarnedIds   = new Set(earned.value.map((b) => b.id))
    const prevHwIds       = new Set(homework.value.map((h) => h.id))
    const prevRejectedIds = new Set(homework.value.filter((h) => h.rejectedAt).map((h) => h.id))

    const [c, h] = await Promise.all([
      api.get(`/children/${auth.user.childId}`),
      api.get('/homework', { params: { childId: auth.user.childId } }),
    ])
    const gained = c.data.points - prevPoints
    me.value       = c.data
    homework.value = h.data

    // Quest verified → points gained
    if (gained > 0) {
      showToast('bi-patch-check-fill', `Quest checked! +${gained} ★`, '#2E8B57')
    }

    // Quest returned by volunteer
    const newlyRejected = h.data.filter((hw) => hw.rejectedAt && !prevRejectedIds.has(hw.id))
    if (newlyRejected.length) {
      showToast('bi-arrow-return-left', 'A quest was returned — check your quests!', '#B05030')
    }

    // New homework allocated
    const newHw = h.data.filter((hw) => !prevHwIds.has(hw.id))
    if (newHw.length) {
      const msg = newHw.length === 1 ? 'New quest added!' : `${newHw.length} new quests added!`
      showToast('bi-map', msg, '#3A7FAE')
    }

    // Level up
    if (level.value.level > prevLevel) {
      showToast('bi-trophy-fill', `Level up! You're now Level ${level.value.level}!`, '#9B7820')
    }

    // Badge unlocks: pulse the kueh tin tile for badges earned in this cycle
    const justUnlocked = earned.value.filter((b) => !prevEarnedIds.has(b.id))
    if (justUnlocked.length) {
      justUnlockedId.value = justUnlocked[0].id
      setTimeout(() => { justUnlockedId.value = null }, 1400)
    }
    // Show popup for any earned badge not yet dismissed (new this cycle, or missed on a previous load)
    queueUnseen(gained > 0 ? 4000 : 2400)
  } catch {
    // silent — background refresh
  }
}

let pollTimer = null
function onVisible() { if (!document.hidden) refreshData() }

onMounted(async () => {
  try {
    const [c, h] = await Promise.all([
      api.get(`/children/${auth.user.childId}`),
      api.get('/homework', { params: { childId: auth.user.childId } }),
    ])
    me.value       = c.data
    homework.value = h.data
    queueUnseen(1200) // show popups for any earned badges not yet dismissed
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
  document.addEventListener('visibilitychange', onVisible)
  pollTimer = setInterval(() => { if (!document.hidden) refreshData() }, 30_000)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisible)
  clearInterval(pollTimer)
})
</script>

<template>
  <div class="container py-4 childhomepage">
    <!-- Badge unlock reveal -->
    <Transition name="badge-reveal">
      <div
        v-if="newBadge"
        class="badge-unlock-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="`${newBadge.kueh} badge unlocked`"
        @click.self="dismissBadge"
      >
        <div class="badge-unlock-card">
          <span
            v-for="(c, i) in CONFETTI"
            :key="i"
            class="confetti-dot"
            :style="{ background: c.color, '--tx': c.tx + 'px', '--ty': c.ty + 'px', animationDelay: (i * 0.03) + 's' }"
            aria-hidden="true"
          ></span>
          <div class="badge-unlock-label">New kueh unlocked!</div>
          <img :src="`/child_badges_images/${newBadge.image}.webp`" :alt="newBadge.kueh" class="badge-unlock-img" />
          <div class="badge-unlock-body">
            <div class="badge-unlock-name">{{ newBadge.kueh }}</div>
            <div class="badge-unlock-badge">{{ newBadge.name }}</div>
            <div class="badge-unlock-fact">{{ newBadge.fact }}</div>
            <button class="badge-unlock-btn" @click="dismissBadge">Yay!</button>
          </div>
        </div>
      </div>
    </Transition>

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

    <TransitionGroup name="child-toast" tag="div" class="child-toast-stack" aria-live="polite">
      <div
        v-for="t in toastQueue"
        :key="t.id"
        class="child-toast"
        :style="{ background: t.color }"
        role="status"
      >
        <i :class="`bi ${t.icon} me-2`"></i>{{ t.message }}
      </div>
    </TransitionGroup>

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <!-- Hero card -->
      <div class="hero-card p-4 mb-4 d-flex flex-wrap align-items-center justify-content-center gap-4">
        <div class="text-center">
          <h1 class="h2 mb-1">Hi {{ auth.user.name }}!</h1>
          <div class="fs-4 fw-heavy mb-1">
            <span class="with-icon"><i class="bi bi-star-fill"></i>{{ displayPoints }}</span> &middot; Level {{ level.level }}
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
          <div class="small lapis-muted">{{ level.starsToNext }} ★ to Level {{ level.level + 1 }}</div>
        </div>

        <!-- the kueh lapis: a layer for every level, the next one fills up -->
        <div class="text-center">
          <div class="cake-wrap">
            <div class="kueh-cake" role="img" :aria-label="`Your kueh lapis has ${layers} layers`">
              <div
                v-for="n in Math.min(layers + 1, 4)"
                :key="n"
                class="cake-layer"
                :class="[`cake-layer-${n}`, { 'cake-layer-next': n > layers }]"
              >
                <template v-if="n > layers">
                  <div class="cake-fill-verified" :style="{ width: cakeProgress.progress + '%' }"></div>
                  <div
                    v-if="pendingProgress > 0"
                    class="cake-fill-pending"
                    :style="{ left: cakeProgress.progress + '%', width: pendingProgress + '%' }"
                  ></div>
                </template>
              </div>
              <!-- marker sits as a sibling so ::before can escape overflow:hidden on the layer -->
              <div
                v-if="cakeProgress.progress > 0 && layers < 4"
                class="cake-marker"
                :style="{ left: cakeProgress.progress + '%' }"
                aria-hidden="true"
              ></div>
            </div>
            <div class="cake-plate" :class="{ 'cake-plate-gold': season > 1 }" aria-hidden="true"></div>
          </div>
          <div class="cake-caption">
            Kueh Lapis
            <span v-if="season > 1" class="cake-season-badge">Season {{ season }}</span>
            <span v-if="layers < 4" class="cake-progress-label">{{ cakeProgress.starsToNext }} more ★ for next layer</span>
            <span v-else class="cake-progress-label cake-progress-done">Full cake — keep going for Season {{ season + 1 }}!</span>
            <span v-if="pendingPoints > 0" class="cake-pending-label">+{{ pendingPoints }} ★ being checked</span>
          </div>
        </div>
      </div>

      <!-- tab navigation -->
      <div class="child-tabs" role="tablist">
        <button
          role="tab"
          :aria-selected="activeTab === 'quests'"
          class="child-tab"
          :class="{ 'child-tab-active': activeTab === 'quests' }"
          @click="activeTab = 'quests'"
        >
          <i class="bi bi-map"></i> Quests
          <span v-if="todo.length > 0" class="child-tab-count">{{ todo.length }}</span>
        </button>
        <button
          role="tab"
          :aria-selected="activeTab === 'tin'"
          class="child-tab"
          :class="{ 'child-tab-active': activeTab === 'tin' }"
          @click="activeTab = 'tin'"
        >
          <i class="bi bi-award"></i> Kueh Tin
          <span v-if="earned.length" class="child-tab-count">{{ earned.length }}</span>
        </button>
      </div>

      <!-- ── Quests tab ──────────────────────────────────────── -->
      <div v-if="activeTab === 'quests'" class="board">
        <div v-if="submitError" class="alert alert-danger py-2 mb-3" role="alert">
          <i class="bi bi-exclamation-circle me-2"></i>{{ submitError }}
          <button type="button" class="btn-close btn-sm float-end" @click="submitError = ''"></button>
        </div>

        <StateMessage v-if="todo.length === 0" :message="emptyQuestMessage" />
        <div class="row g-3 mb-2">
          <div v-for="h in todo" :key="h.id" class="col-sm-6 col-lg-4">
            <HomeworkQuestCard :homework="h" mode="child" @submit="submitQuest" />
          </div>
        </div>
      </div>

      <!-- ── Kueh Tin tab ───────────────────────────────────── -->
      <div v-if="activeTab === 'tin'" class="board">
        <div class="d-flex align-items-center gap-3 mb-3">
          <h2 class="h4 mt-2">My Kueh Tin</h2>
          <span class="kueh-tin-count kueh-tin-title">{{ earned.length }} of {{ BADGES.length }} kueh</span>
        </div>

        <section class="kueh-tin">
          <div class="kueh-tin-body">
            <div class="kueh-grid">
              <button
                v-for="b in BADGES"
                :key="b.id"
                type="button"
                class="kueh-tile"
                :class="{ 'kueh-locked': !earnedIds.has(b.id), 'kueh-just-unlocked': justUnlockedId === b.id }"
                :aria-pressed="shown.id === b.id"
                @click="picked = b"
              >
                <span class="kueh-cup"><img :src="`/child_badges_images/${b.image}.webp`" alt="" /></span>
                <span class="kueh-name">{{ b.kueh }}</span>
                <span class="kueh-badge-name">{{ b.name }}</span>
                <span class="kueh-state">{{ earnedIds.has(b.id) ? 'Earned!' : 'Locked' }}</span>
              </button>
            </div>

            <div class="kueh-detail" :class="{ 'kueh-locked': !earnedIds.has(shown.id) }">
              <img :src="`/child_badges_images/${shown.image}.webp`" alt="" />
              <div>
                <div class="kueh-detail-badge">{{ shown.name }}</div>
                <h3 class="kueh-detail-name">{{ shown.kueh }}</h3>
                <div class="kueh-detail-rule">{{ shown.rule }}</div>
                <div class="kueh-detail-fact">{{ shown.fact }}</div>
                <span class="kueh-state" :class="{ 'kueh-todo': !earnedIds.has(shown.id) }">
                  {{ earnedIds.has(shown.id) ? 'You earned this kueh!' : `${shownProgress.current} of ${shownProgress.target} done` }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style>
/* INTERNAL CSS: only this page uses these styles, so they live here in the .vue file. (CSS shared by several pages is in src/css/.) */

/* The child home page: hero card with the kueh lapis, quests, the kueh tin (ChildHomeView.vue).
   The soft look of the parent and volunteer pages: a cream page, a sandy board with white cards on it,
   no dark outlines, soft corners (18px to 22px, round pills), pale fills with dark text and a very light shadow. */

/* the very light shadow under the boxes */
.hero-card,
.childhomepage .board,
.childhomepage .quest-card {
  box-shadow: 0 1px 6px rgba(74, 63, 58, 0.10);
}

/* ── Hero card ──────────────────────────────────────────────── */

.hero-card {
  background: var(--role-accent-soft, #FBF8F3);
  border-radius: 22px;
}

.hero-avatar {
  display: inline-block;
}

/* ── The board: the sandy box that holds the white cards ────── */

.level-bar .progress-bar {
  transform-origin: left;
  animation: grow-progress 1.1s cubic-bezier(0.34, 1.1, 0.64, 1) 0.35s backwards;
}

@keyframes grow-progress {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

.level-bar { height: 14px; max-width: 260px; }

/* ── Type: the sizes of the parent and volunteer pages ──────── */

/* the title "Hi Ethan!" has the same size and weight as the title of every other page (32px, bold: from .page-title in main.css) */
.childhomepage .hero-card h1 {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.6px;
}

/* the headings of the sections (Quests to do, My Kueh Tin): semi-bold and not bigger than a title */
.childhomepage h2.h4 {
  font-size: 18px;
  font-weight: 600;
}

/* ── Quest cards ────────────────────────────────────────────── */

/* a white card: no outline, soft corners */
.childhomepage .quest-card {
  background: #FFFFFF;
  border: 0;
  border-radius: 18px;
}

/* pending (submitted, waiting for volunteer check): dotted border */
.childhomepage .quest-card.quest-waiting {
  border: 2px dashed #B7D8D7;
}

/* the I'm done! button: the shape of the Edit and Delete buttons of the volunteer page (small, 5px corners, no outline),
   in pale pink with dark text */
.childhomepage .quest-submit {
  --bs-btn-color: #4A3F3A;
  --bs-btn-bg: #F3C1D3;
  --bs-btn-hover-color: #4A3F3A;
  --bs-btn-hover-bg: #EBAAC2;
  --bs-btn-active-color: #4A3F3A;
  --bs-btn-active-bg: #EBAAC2;
  align-self: flex-end;
  border: 0;
  border-radius: 5px;
  box-shadow: none;
  font-size: 14px;
  font-weight: 700;
}

/* ── Completed quests toggle ────────────────────────────────── */

/* a white pill the whole width of the board, like "Show more days" on the parent page */
.quest-history-toggle {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  border: 0;
  border-radius: 999px;
  background: #FFFFFF;
  color: #4A3F3A;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  gap: 4px;
}

.quest-history-toggle:hover {
  filter: brightness(0.96);
}

.quest-history-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 99px;
  background: var(--role-accent-soft, #FBF8F3);
  color: #4A3F3A;
  font-size: 12px;
  font-weight: 700;
}

/* ── The kueh lapis in the hero: flat layers stacked from the bottom ── */

.cake-wrap {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.kueh-cake {
  position: relative;               /* anchors the .cake-marker */
  display: flex;
  flex-direction: column-reverse;   /* the first layer is at the bottom */
  gap: 2px;                         /* thin gap so each layer reads as distinct */
  width: 220px;
  max-width: 100%;
}

/* the layers touch at the ends: only the bottom of the first layer and the top of the last one are round */
.cake-layer {
  height: 44px;
  background: var(--c);
}

.cake-layer:first-child { border-radius: 0 0 10px 10px; }
.cake-layer:last-child  { border-radius: 10px 10px 0 0; }
.cake-layer:only-child  { border-radius: 10px; }

/* the colours of the layers, bottom to top: coordinator, volunteer, parent, child (the same order as the stripes under the navbar) */
.cake-layer-1 { --c: #D5CBEA; }
.cake-layer-2 { --c: #9BD3B2; }
.cake-layer-3 { --c: #AED9D8; }
.cake-layer-4 { --c: #E8A0B8; }

/* the layer being built: a white bar that fills up */
.cake-layer-next {
  position: relative;
  background: #F5F0E8;
}

/* verified fill: solid colour */
.cake-fill-verified {
  height: 100%;
  background: var(--c);
}

/* pending fill: pale with dotted outline, full height of the layer */
.cake-fill-pending {
  position: absolute;
  top: 0;
  height: 100%;
  background: var(--c);
  opacity: 0.45;
  border: 2px dotted rgba(74, 63, 58, 0.35);
  box-sizing: border-box;
}

/* "you are here" vertical marker — absolutely positioned sibling inside .kueh-cake */
.cake-marker {
  position: absolute;
  top: 0;        /* top of kueh-cake = top of the in-progress layer (column-reverse) */
  height: 44px;  /* same as one layer */
  width: 3px;
  background: #4A3F3A;
  transform: translateX(-50%);
  pointer-events: none;
}

/* downward triangle above the layer — escapes the layer's overflow:hidden because
   the marker is a sibling of the layers, not a child */
.cake-marker::before {
  content: '';
  position: absolute;
  top: -11px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-top: 11px solid #4A3F3A;
}

/* the oval plate the cake sits on */
.cake-plate {
  width: 260px;
  max-width: 110%;
  height: 18px;
  margin-top: 2px;
  background: #E8D8C4;
  border-radius: 0 0 50% 50% / 0 0 100% 100%;
  box-shadow: 0 3px 6px rgba(74, 63, 58, 0.12);
}

.cake-caption {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 700;
  color: #4A3F3A;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.cake-progress-label {
  font-size: 13px;
  font-weight: 600;
  color: #8D7F77;
}

.cake-progress-done {
  color: #2E8B57;
}

.cake-pending-label {
  font-size: 12px;
  font-weight: 600;
  color: #A9577A;
  opacity: 0.85;
}

/* gold plate for season 2+ */
.cake-plate-gold {
  background: linear-gradient(90deg, #F5E070 0%, #DBA82A 50%, #F5E070 100%);
}

.cake-season-badge {
  display: inline-block;
  padding: 2px 11px;
  border-radius: 999px;
  background: #F5E070;
  color: #8B6914;
  font-size: 12px;
  font-weight: 700;
}

/* notification toasts: stacked above the bottom of the screen */
.child-toast-stack {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1050;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.child-toast {
  padding: 10px 20px;
  border-radius: 99px;
  color: #FFFFFF;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.20);
}

.child-toast-enter-active { animation: child-toast-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.child-toast-leave-active { animation: child-toast-in 0.25s ease-in reverse; }

@keyframes child-toast-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── The kueh tin ───────────────────────────────────────────── */

.kueh-tin {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  border-radius: 22px;
  background: var(--role-accent-soft, #FBF8F3);
  box-shadow: 0 1px 3px rgba(74, 63, 58, 0.10);
}

.kueh-tin-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 0;
  font-size: 17.6px;
  font-weight: 700;
  color: #4A3F3A;
}

.kueh-tin-count {
  padding: 2px 12px;
  border-radius: 99px;
  background: #FFFFFF;
  font-size: 12.8px;
}

/* the kueh and the label of the one you picked */
.kueh-tin-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.kueh-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 18px 12px;
}

@media (max-width: 860px) {
  .kueh-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 600px) {
  .kueh-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 420px) {
  .kueh-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.kueh-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 8px;
  border: 0;
  background: transparent;
  color: #4A3F3A;
  font: inherit;
  text-align: center;
}

/* the round white cup the kueh sits in */
.kueh-cup {
  display: grid;
  place-items: center;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #FFFFFF;
  box-shadow: 0 1px 3px rgba(74, 63, 58, 0.10);
  transition: transform 0.2s;
}

.kueh-cup img {
  width: 80%;
  height: 80%;
  object-fit: contain;
}

.kueh-tile:hover .kueh-cup { transform: translateY(-3px); }
.kueh-tile[aria-pressed='true'] .kueh-cup { box-shadow: 0 0 0 3px #A9577A; }

.kueh-name { margin-top: 2px; font-size: 14px; font-weight: 700; line-height: 1.2; }
.kueh-badge-name { font-size: 12px; font-weight: 600; color: #8D7F77; }

.kueh-state {
  display: inline-block;
  padding: 2px 11px;
  border-radius: 999px;
  background: #E6F4EC;
  color: #2E8B57;
  font-size: 12px;
  font-weight: 700;
}

/* a kueh you have not earned yet: faded grey picture */
.kueh-locked img { filter: grayscale(1); opacity: 0.35; }
.kueh-locked .kueh-name { color: #8D7F77; }
.kueh-locked .kueh-state { background: #FFFFFF; color: #8D7F77; }

/* in the label of the kueh you picked, "x of y done" is soft yellow */
.kueh-detail .kueh-state.kueh-todo { background: #FBE7A1; color: #4A3F3A; }

/* the label of the kueh you picked */
.kueh-detail {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 20px;
  align-items: center;
  padding: 20px 22px;
  border-radius: 18px;
  background: #FFFFFF;
}

.kueh-detail img { width: 110px; max-height: 110px; object-fit: contain; }

.kueh-detail-badge {
  font-size: 12px;
  font-weight: 700;
  color: #A9577A;
}

.kueh-detail-name { margin: 0; font-size: 22.4px; font-weight: 700; }
.kueh-detail-rule { margin-top: 8px; font-weight: 600; }
.kueh-detail-fact { margin: 6px 0 10px; font-size: 14px; color: #8D7F77; }

@media (max-width: 520px) {
  .kueh-tin { padding: 16px 12px 20px; }
  .kueh-detail { grid-template-columns: 1fr; }
}

/* ── Celebrate overlay ──────────────────────────────────────── */

.celebrate-overlay {
  position: fixed;
  top: 50%; left: 50%;
  width: 0; height: 0;
  z-index: 9999;
  pointer-events: none;
}

.celebrate-enter-active { animation: celebrate-fade 2.2s ease forwards; }

@keyframes celebrate-fade {
  0%   { opacity: 0; }
  10%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { opacity: 0; }
}

/* central award icon: bounces in and out */
.celebrate-main {
  position: absolute;
  left: 0; top: 0;
  transform: translate(-50%, -50%);
  font-size: 64px;
  color: #F5DF98;
  filter: drop-shadow(0 0 18px rgba(245, 223, 152, 0.95));
  animation: celebrate-main-pop 2.2s ease forwards;
}

@keyframes celebrate-main-pop {
  0%   { transform: translate(-50%, -50%) scale(0.2) rotate(-15deg); }
  30%  { transform: translate(-50%, -50%) scale(1.45) rotate(6deg); }
  50%  { transform: translate(-50%, -50%) scale(1.0) rotate(-2deg); }
  70%  { transform: translate(-50%, -50%) scale(1.1) rotate(0deg); }
  100% { transform: translate(-50%, -50%) scale(0.8); }
}

/* star sparks: shoot outward from center */
.celebrate-spark {
  position: absolute;
  left: 0; top: 0;
  margin: -11px 0 0 -11px; /* the middle of the star is where the burst starts */
  font-size: 22.4px;
  animation: celebrate-spark-fly 1.9s ease-out forwards;
}

.celebrate-s1 { color: #F5DF98; --dx: -88px; --dx2: -132px; --dy2: -132px; --dy: -88px;  animation-delay: 0.10s; }
.celebrate-s2 { color: #E8A0B8;   --dx:  88px; --dx2: 132px; --dy2: -132px; --dy: -88px;  animation-delay: 0.15s; }
.celebrate-s3 { color: #A8CC90;   --dx: -112px; --dx2: -168px; --dy2: 0px; --dy:  0px;  animation-delay: 0.12s; }
.celebrate-s4 { color: #F5B880; --dx:  112px; --dx2: 168px; --dy2: 0px; --dy:  0px;  animation-delay: 0.18s; }
.celebrate-s5 { color: #C0A8D8; --dx: -50px; --dx2: -75px; --dy2: -168px; --dy: -112px; animation-delay: 0.08s; }
.celebrate-s6 { color: #88C0D8;   --dx:  50px; --dx2: 75px; --dy2: -168px; --dy: -112px; animation-delay: 0.20s; }

@keyframes celebrate-spark-fly {
  0%   { transform: translate(0, 0) scale(0)   rotate(0deg);   opacity: 0; }
  20%  { transform: translate(0, 0) scale(1.3) rotate(45deg);  opacity: 1; }
  65%  { transform: translate(var(--dx), var(--dy)) scale(0.9) rotate(210deg); opacity: 0.8; }
  100% { transform: translate(var(--dx2), var(--dy2)) scale(0.2) rotate(360deg); opacity: 0; }
}

/* ── Reduced motion ─────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  .level-bar .progress-bar,
  .celebrate-main,
  .celebrate-spark { animation: none; }
  .level-bar .progress-bar { transform: scaleX(1); }
  .kueh-cup { transition: none; }
}

/* ── Badge unlock overlay ────────────────────────────────── */

.badge-unlock-overlay {
  position: fixed;
  inset: 0;
  background: rgba(251, 248, 243, 0.88);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 20px;
}

.badge-unlock-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 40px 44px 32px;
  border-radius: 28px;
  background: #FFFFFF;
  box-shadow: 0 8px 48px rgba(74, 63, 58, 0.16);
  text-align: center;
  max-width: 300px;
  width: 100%;
  overflow: visible;
  animation: badge-card-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes badge-card-in {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

/* the kueh image is the hero */
.badge-unlock-img {
  width: 140px;
  height: 140px;
  object-fit: contain;
  animation: badge-kueh-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both;
}

@keyframes badge-kueh-pop {
  from { transform: scale(0) rotate(-12deg); }
  to   { transform: scale(1) rotate(0deg);   }
}

/* text rises up after the image lands */
.badge-unlock-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  animation: badge-text-up 0.35s ease 0.32s both;
}

@keyframes badge-text-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0);     }
}

/* small pink label above the image */
.badge-unlock-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #A9577A;
  animation: badge-text-up 0.35s ease 0.28s both;
}

.badge-unlock-name {
  margin-top: 4px;
  font-size: 22px;
  font-weight: 700;
  color: #4A3F3A;
  line-height: 1.2;
}

.badge-unlock-badge {
  font-size: 13px;
  font-weight: 600;
  color: #8D7F77;
}

.badge-unlock-fact {
  margin: 6px 0 12px;
  font-size: 13px;
  color: #8D7F77;
  line-height: 1.5;
}

.badge-unlock-btn {
  padding: 8px 32px;
  border: 0;
  border-radius: 999px;
  background: #E8A0B8;
  color: #4A3F3A;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.15s;
}

.badge-unlock-btn:hover { filter: brightness(0.94); }

/* confetti dots burst from the centre of the card */
.confetti-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  pointer-events: none;
  animation: confetti-burst 1.0s ease-out 0.15s both;
}

@keyframes confetti-burst {
  0%   { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  55%  { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.3); opacity: 0; }
}

/* overlay fade in / out */
.badge-reveal-enter-active { animation: badge-overlay-in 0.2s ease both; }
.badge-reveal-leave-active  { animation: badge-overlay-out 0.18s ease both; }

@keyframes badge-overlay-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes badge-overlay-out { from { opacity: 1; } to { opacity: 0; } }

/* tile pulse when it just unlocked */
.kueh-just-unlocked .kueh-cup {
  animation: tile-unlock-pulse 0.75s ease-out both;
}

@keyframes tile-unlock-pulse {
  0%   { box-shadow: 0 0 0 0   rgba(169, 87, 122, 0.65); transform: scale(1); }
  35%  { transform: scale(1.14); }
  70%  { box-shadow: 0 0 0 14px rgba(169, 87, 122, 0);   }
  100% { transform: scale(1);   }
}

@media (prefers-reduced-motion: reduce) {
  .badge-unlock-card,
  .badge-unlock-img,
  .badge-unlock-body,
  .badge-unlock-label,
  .confetti-dot,
  .kueh-just-unlocked .kueh-cup { animation: none; }
}

/* ── Tabs ─────────────────────────────────────────────────── */

.child-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  padding: 4px;
  border-radius: 18px;
  background: #FFFFFF;
  box-shadow: 0 1px 6px rgba(74, 63, 58, 0.08);
}

.child-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 8px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: #8D7F77;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.child-tab-active {
  background: var(--role-accent-soft, #FBF8F3);
  color: #4A3F3A;
}

.child-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 99px;
  background: #E8A0B8;
  color: #4A3F3A;
  font-size: 11px;
  font-weight: 700;
}


</style>
