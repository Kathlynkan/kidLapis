<!-- Child home: "My Quests" (gamified homework)         Owner: Jachin -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import StateMessage from '@/components/StateMessage.vue'
import ChildAvatar from '@/components/ChildAvatar.vue'
import HomeworkQuestCard from '@/components/HomeworkQuestCard.vue'
import { BADGES, levelFor, earnedBadges, badgeProgress } from '@/utils/gamification'

const auth = useAuthStore()

const me       = ref(null)
const homework = ref([])
const loading  = ref(true)
const error    = ref('')
const celebrating  = ref(false)
const submitError  = ref('')

// ── Computed ─────────────────────────────────────────────────
const level     = computed(() => levelFor(me.value?.points || 0))
const earned    = computed(() => me.value ? earnedBadges(me.value, homework.value) : [])
const earnedIds = computed(() => new Set(earned.value.map((b) => b.id)))
const todo      = computed(() => homework.value.filter((h) => h.status === 'assigned'))
const done      = computed(() => homework.value.filter((h) => h.status !== 'assigned'))
const showDone  = ref(false)

const emptyQuestMessage = computed(() =>
  homework.value.length === 0
    ? 'No quests yet — your teacher will add some soon!'
    : 'All quests done — great work!',
)

// the kueh lapis in the hero: every level adds a layer, and 4 layers is a finished cake
const layers = computed(() => Math.min(level.value.level - 1, 4))

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
    }
    showDone.value    = true
    celebrating.value = true
    setTimeout(() => (celebrating.value = false), 2200)
  } catch (err) {
    submitError.value = errorMessage(err)
  }
}

onMounted(async () => {
  try {
    const [c, h] = await Promise.all([
      api.get(`/children/${auth.user.childId}`),
      api.get('/homework', { params: { childId: auth.user.childId } }),
    ])
    me.value       = c.data
    homework.value = h.data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container py-4 childhomepage">
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
      <div class="hero-card p-4 mb-4 d-flex flex-wrap align-items-center justify-content-center gap-4">
        <div class="text-center">
          <div class="hero-avatar display-3"><ChildAvatar :avatar="me.avatar" /></div>
          <h1 class="h2 mb-1">Hi {{ auth.user.name }}!</h1>
          <div class="fs-4 fw-heavy mb-1">
            <i class="bi bi-star-fill me-1"></i>{{ me.points }} stars &middot; Level {{ level.level }}
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
          <div v-if="nextBadge" class="small mt-2">
            Next kueh: <strong>{{ nextBadge.badge.kueh }}</strong>. {{ nextBadge.badge.rule }}.
          </div>
        </div>

        <!-- the kueh lapis: a layer for every level, the next one fills up -->
        <div class="text-center">
          <div class="kueh-cake" role="img" :aria-label="`Your kueh lapis has ${layers} layers`">
            <div
              v-for="n in Math.min(layers + 1, 4)"
              :key="n"
              class="cake-layer"
              :class="[`cake-layer-${n}`, { 'cake-layer-next': n > layers }]"
            >
              <div v-if="n > layers" :style="{ width: level.progress + '%' }"></div>
            </div>
          </div>
          <div class="cake-caption">Your kueh lapis</div>
        </div>
      </div>

      <!-- the sandy board: the quests, the kueh tin and the finished quests, on white cards -->
      <div class="board">
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

        <!-- My Kueh Tin: one kueh for every badge -->
        <h2 class="h4 mb-3 mt-2">My Kueh Tin</h2>
        <section class="kueh-tin">
          <h3 class="kueh-tin-title">
            Your Kueh Tin
            <span class="kueh-tin-count">{{ earned.length }} of {{ BADGES.length }} kueh</span>
          </h3>

          <div class="kueh-tin-body">
            <div class="kueh-grid">
              <button
                v-for="b in BADGES"
                :key="b.id"
                type="button"
                class="kueh-tile"
                :class="{ 'kueh-locked': !earnedIds.has(b.id) }"
                :aria-pressed="shown.id === b.id"
                @click="picked = b"
              >
                <span class="kueh-cup"><img :src="`/child_badges_images/${b.image}.webp`" alt="" /></span>
                <span class="kueh-name">{{ b.kueh }}</span>
                <span class="kueh-badge-name">{{ b.name }}</span>
                <span class="kueh-state">{{ earnedIds.has(b.id) ? 'Earned!' : 'Locked' }}</span>
              </button>
            </div>

            <!-- the label of the kueh you picked -->
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

        <!-- Completed quests (collapsed by default, auto-opens after submit) -->
        <div v-if="done.length > 0" class="mt-4">
          <button class="quest-history-toggle" @click="showDone = !showDone">
            <i class="bi bi-check-lg me-2"></i>Completed quests
            <span class="quest-history-count">{{ done.length }}</span>
            <i :class="showDone ? 'bi-chevron-up' : 'bi-chevron-down'" class="bi ms-auto"></i>
          </button>
          <div v-if="showDone" class="row g-3 mt-1">
            <div v-for="h in done" :key="h.id" class="col-sm-6 col-lg-4">
              <HomeworkQuestCard :homework="h" mode="child" />
            </div>
          </div>
        </div>
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
  background: var(--role-accent-soft, var(--lapis-cream));
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

/* the title: 30px, semi-bold, tight (the parent title is 32px bold, the volunteer title is 30px semi-bold) */
.childhomepage .hero-card h1 {
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.6px;
}

/* the headings of the sections (Quests to do, My Kueh Tin): semi-bold and not bigger than a title */
.childhomepage h2.h4 {
  font-size: 20px;
  font-weight: 600;
}

/* ── Quest cards ────────────────────────────────────────────── */

/* a white card: no outline, soft corners */
.childhomepage .quest-card {
  background: #FFFFFF;
  border: 0;
  border-radius: 18px;
}

/* the small tags are round pills: points and "to do" are soft yellow, overdue is soft red, checked is green */
.childhomepage .badge {
  padding: 3px 10px;
  border-radius: 99px;
  box-shadow: none;
  font-size: 12px;
  font-weight: 700;
}

.childhomepage .quest-points,
.childhomepage .quest-status { background: #FBE7A1; }

/* the points stay on one line: the star sits next to the number, never under it */
.childhomepage .quest-points {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  white-space: nowrap;
}
.childhomepage .quest-overdue { background: #EE9F96; }
.childhomepage .quest-status-done { background: #E6F4EC; color: #2E8B57; }

/* the I'm done! button: the shape of the Edit and Delete buttons of the volunteer page (small, 5px corners, no outline),
   in pale pink with dark text */
.childhomepage .quest-submit {
  --bs-btn-color: var(--lapis-plum);
  --bs-btn-bg: #F3C1D3;
  --bs-btn-hover-color: var(--lapis-plum);
  --bs-btn-hover-bg: #EBAAC2;
  --bs-btn-active-color: var(--lapis-plum);
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
  color: var(--lapis-plum);
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
  background: var(--role-accent-soft, var(--lapis-cream));
  color: var(--lapis-plum);
  font-size: 12px;
  font-weight: 700;
}

/* ── The kueh lapis in the hero: flat layers stacked from the bottom ── */

.kueh-cake {
  display: flex;
  flex-direction: column-reverse;   /* the first layer is at the bottom */
  width: 170px;
  max-width: 100%;
  margin: 0 auto;
}

/* the layers touch: only the bottom of the first layer and the top of the last one are round */
.cake-layer {
  height: 24px;
  background: var(--c);
}

.cake-layer:first-child { border-radius: 0 0 8px 8px; }
.cake-layer:last-child { border-radius: 8px 8px 0 0; }
.cake-layer:only-child { border-radius: 8px; }

/* the colours of the layers, bottom to top: teacher, parent, volunteer, child */
.cake-layer-1 { --c: var(--layer-teacher); }
.cake-layer-2 { --c: var(--layer-parent); }
.cake-layer-3 { --c: var(--layer-volunteer); }
.cake-layer-4 { --c: var(--lapis-pink); }

/* the layer being built: a white bar that fills up */
.cake-layer-next {
  overflow: hidden;
  background: #FFFFFF;
}

.cake-layer-next > div {
  height: 100%;
  background: var(--c);
}

.cake-caption {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  color: var(--lapis-plum);
}

/* ── The kueh tin ───────────────────────────────────────────── */

.kueh-tin {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  border-radius: 22px;
  background: var(--role-accent-soft, var(--lapis-cream));
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
  color: var(--lapis-plum);
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
  color: var(--lapis-plum);
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
.kueh-badge-name { font-size: 12px; font-weight: 600; color: var(--lapis-muted); }

.kueh-state {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 99px;
  background: #E6F4EC;
  color: #2E8B57;
  font-size: 11.2px;
  font-weight: 700;
  letter-spacing: 0.7px;
  text-transform: uppercase;
}

/* a kueh you have not earned yet: faded grey picture */
.kueh-locked img { filter: grayscale(1); opacity: 0.35; }
.kueh-locked .kueh-name { color: var(--lapis-muted); }
.kueh-locked .kueh-state { background: #FFFFFF; color: var(--lapis-muted); }

/* in the label of the kueh you picked, "x of y done" is soft yellow */
.kueh-detail .kueh-state.kueh-todo { background: #FBE7A1; color: var(--lapis-plum); }

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
  letter-spacing: 0.7px;
  text-transform: uppercase;
  color: #A9577A;
}

.kueh-detail-name { margin: 0; font-size: 22.4px; font-weight: 700; }
.kueh-detail-rule { margin-top: 8px; font-weight: 600; }
.kueh-detail-fact { margin: 6px 0 10px; font-size: 14px; color: var(--lapis-muted); }

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
  color: var(--lapis-yellow);
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

.celebrate-s1 { color: var(--lapis-yellow); --dx: -88px; --dx2: -132px; --dy2: -132px; --dy: -88px;  animation-delay: 0.10s; }
.celebrate-s2 { color: var(--lapis-pink);   --dx:  88px; --dx2: 132px; --dy2: -132px; --dy: -88px;  animation-delay: 0.15s; }
.celebrate-s3 { color: var(--lapis-lime);   --dx: -112px; --dx2: -168px; --dy2: 0px; --dy:  0px;  animation-delay: 0.12s; }
.celebrate-s4 { color: var(--lapis-orange); --dx:  112px; --dx2: 168px; --dy2: 0px; --dy:  0px;  animation-delay: 0.18s; }
.celebrate-s5 { color: var(--lapis-purple); --dx: -50px; --dx2: -75px; --dy2: -168px; --dy: -112px; animation-delay: 0.08s; }
.celebrate-s6 { color: var(--lapis-blue);   --dx:  50px; --dx2: 75px; --dy2: -168px; --dy: -112px; animation-delay: 0.20s; }

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
</style>
