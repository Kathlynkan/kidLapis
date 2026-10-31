<!-- Child home: "My Quests" (gamified homework)         Owner: Jachin -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import StateMessage from '@/components/StateMessage.vue'
import ChildAvatar from '@/components/ChildAvatar.vue'
import HomeworkQuestCard from '@/components/HomeworkQuestCard.vue'
import { BADGES, levelFor, earnedBadges, badgeProgress } from '@/utils/gamification'
import '@/css/child/childhome.css'

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
                <span class="kueh-cup"><img :src="`/images/${b.image}.webp`" alt="" /></span>
                <span class="kueh-name">{{ b.kueh }}</span>
                <span class="kueh-badge-name">{{ b.name }}</span>
                <span class="kueh-state">{{ earnedIds.has(b.id) ? 'Earned!' : 'Locked' }}</span>
              </button>
            </div>

            <!-- the label of the kueh you picked -->
            <div class="kueh-detail" :class="{ 'kueh-locked': !earnedIds.has(shown.id) }">
              <img :src="`/images/${shown.image}.webp`" alt="" />
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
