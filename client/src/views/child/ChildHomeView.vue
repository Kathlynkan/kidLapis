<!-- Child home: "My Quests" (gamified homework)         Owner: Jachin -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import StateMessage from '@/components/StateMessage.vue'
import HomeworkQuestCard from '@/components/HomeworkQuestCard.vue'
import { BADGES, levelFor, earnedBadges } from '@/utils/gamification'
import '@/css/child/childhome.css' // the styles of this page

const auth = useAuthStore()

const me = ref(null)
const homework = ref([])
const sessions = ref([])
const loading = ref(true)
const error = ref('')
const celebrating = ref(false)

const level = computed(() => levelFor(me.value?.points || 0))
const earned = computed(() =>
  me.value ? earnedBadges(me.value, homework.value, sessions.value) : [],
)
const earnedIds = computed(() => new Set(earned.value.map((b) => b.id)))
const todo = computed(() => homework.value.filter((h) => h.status === 'assigned'))
const done = computed(() => homework.value.filter((h) => h.status !== 'assigned'))

async function submitQuest(homeworkId) {
  try {
    await api.put(`/homework/${homeworkId}/submit`)
    const h = homework.value.find((hw) => hw.id === homeworkId)
    if (h) {
      h.status = 'submitted'
      h.completedAt = new Date().toISOString().slice(0, 10)
    }
    celebrating.value = true
    setTimeout(() => (celebrating.value = false), 2200)
  } catch (err) {
    alert(errorMessage(err))
  }
}

onMounted(async () => {
  try {
    const [c, h, s] = await Promise.all([
      api.get(`/children/${auth.user.childId}`),
      api.get('/homework', { params: { childId: auth.user.childId } }),
      api.get('/sessions', { params: { childId: auth.user.childId } }),
    ])
    me.value = c.data
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
      <div v-if="celebrating" class="celebrate-overlay" aria-hidden="true">🎉 🌟 🎊</div>
    </Transition>

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <!-- Hero card with level + progress bar -->
      <div class="hero-card p-4 mb-4 text-center">
        <div class="display-3">{{ me.avatar }}</div>
        <h1 class="h2 mb-1">Hi {{ auth.user.name }}!</h1>
        <div class="fs-4 fw-heavy mb-3">⭐ {{ me.points }} stars &middot; Level {{ level.level }}</div>
        <div
          class="progress mx-auto level-bar"
          role="progressbar"
          :aria-valuenow="level.progress"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="progress-bar" :style="{ width: level.progress + '%' }"></div>
        </div>
        <div class="small lapis-muted mt-1">
          {{ level.progress }}/100 to Level {{ level.level + 1 }}
        </div>
      </div>

      <!-- Quests to do -->
      <h2 class="h4 mb-3">🗺️ Quests to do</h2>
      <StateMessage v-if="todo.length === 0" message="All quests done! 🎉" />
      <div class="row g-3 mb-4">
        <div v-for="h in todo" :key="h.id" class="col-sm-6 col-lg-4">
          <HomeworkQuestCard :homework="h" mode="child" @submit="submitQuest" />
        </div>
      </div>

      <!-- Finished -->
      <h2 class="h4 mb-3">✅ Finished</h2>
      <div class="row g-3 mb-4">
        <div v-for="h in done" :key="h.id" class="col-sm-6 col-lg-4">
          <HomeworkQuestCard :homework="h" mode="child" />
        </div>
      </div>

      <!-- Badge shelf -->
      <h2 class="h4 mb-3">🏅 Badges</h2>
      <div class="d-flex flex-wrap gap-3">
        <div
          v-for="b in BADGES"
          :key="b.id"
          class="lapis-card p-3 text-center badge-tile"
          :class="{ 'badge-earned': earnedIds.has(b.id) }"
          :title="b.rule"
        >
          <div class="fs-2">{{ b.icon }}</div>
          <div class="small fw-bold">{{ b.name }}</div>
          <div v-if="earnedIds.has(b.id)" class="x-small text-success fw-bold mt-1">Earned!</div>
          <div v-else class="x-small lapis-muted mt-1">{{ b.rule }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
