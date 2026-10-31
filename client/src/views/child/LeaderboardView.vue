<!-- Leaderboard                                          Owner: Jachin
     A podium for the first three places, then a white row for everyone else, on the sandy board.
     Children with the same stars share a place (1, 2, 2, 4). -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import ChildAvatar from '@/components/ChildAvatar.vue'
import StateMessage from '@/components/StateMessage.vue'
import { firstName } from '@/utils/format'
import '@/css/child/leaderboard.css' // the styles of this page

const auth = useAuthStore()
const entries = ref([])
const loading = ref(true)
const error   = ref('')

const myId = computed(() => auth.user?.childId)

// every child with the place they share, and the child just ahead of them (the next one with more stars)
const ranked = computed(() =>
  entries.value.map((entry, i) => {
    const place = entries.value.findIndex((other) => other.points === entry.points) + 1
    const ahead = entries.value.slice(0, i).reverse().find((other) => other.points > entry.points) || null
    return { ...entry, place, ahead }
  }),
)

// the three steps: second place on the left, first in the middle, third on the right.
// When fewer than three children have stars, the empty steps are free places.
const slots = computed(() =>
  [1, 0, 2].map((i) => {
    const entry = ranked.value[i] || null
    const place = entry ? entry.place : i + 1
    let note = 'Do a quest to join'
    if (entry) {
      note = place === 1 ? 'Top of the week' : `${entry.ahead.points - entry.points} behind ${firstName(entry.ahead.name)}`
    }
    return { entry, place, note }
  }),
)

const rest   = computed(() => ranked.value.slice(3))
const hasMe  = computed(() => entries.value.some((entry) => entry.childId === myId.value))

// what the child needs to move up a place
function passNote(entry) {
  return entry.ahead ? `${entry.ahead.points - entry.points + 1} more stars to pass ${firstName(entry.ahead.name)}` : ''
}

onMounted(async () => {
  try {
    const res = await api.get('/homework/leaderboard', { params: { period: 'week' } })
    entries.value = res.data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container py-4 leaderboardpage">
    <PageHeader title="Leaderboard" subtitle="Stars earned this week — resets every Monday!" />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <div v-else class="board">
      <template v-if="entries.length === 0">
        <StateMessage message="No quests verified this week yet — complete one to appear!" />
        <div class="lb-foot">
          <RouterLink :to="{ name: 'child-home' }" class="lb-go"><i class="bi bi-map"></i>Go do a quest</RouterLink>
        </div>
      </template>

      <template v-else>
        <!-- the podium: a white card with the first three places -->
        <div class="lb-card podium-card">
          <div class="podium">
            <div
              v-for="slot in slots"
              :key="slot.place"
              class="pcol"
              :class="{ free: !slot.entry }"
              :data-rank="slot.place"
              :data-test="slot.entry ? `podium-${slot.place}` : null"
            >
              <div class="pavatar-wrap">
                <svg v-if="slot.entry && slot.place === 1" class="crown" viewBox="0 0 30 22" aria-hidden="true">
                  <path fill="#F2CB5C" d="M2 6l7 6 6-10 6 10 7-6-3 15H5z" />
                  <circle cx="2" cy="6" r="2" fill="#F2CB5C" />
                  <circle cx="15" cy="2" r="2" fill="#F2CB5C" />
                  <circle cx="28" cy="6" r="2" fill="#F2CB5C" />
                </svg>
                <div class="pavatar">
                  <ChildAvatar v-if="slot.entry" :avatar="slot.entry.avatar" />
                  <template v-else>?</template>
                </div>
              </div>

              <div class="pname">
                <span class="pname-text">{{ slot.entry ? firstName(slot.entry.name) : 'Free place' }}</span>
                <span v-if="slot.entry && slot.entry.childId === myId" class="lb-you">You</span>
              </div>

              <div class="step">
                <span class="step-rank">{{ slot.place }}</span>
                <span v-if="slot.entry" class="lb-stars"><i class="bi bi-star-fill"></i>{{ slot.entry.points }}</span>
              </div>

              <div class="pnote">{{ slot.note }}</div>
            </div>
          </div>
        </div>

        <!-- 4th place onwards: one white row for each child -->
        <div v-if="rest.length" class="lb-list">
          <div
            v-for="entry in rest"
            :key="entry.childId"
            class="lb-card lb-row"
            :class="{ 'lb-me': entry.childId === myId }"
            data-test="leaderboard-row"
          >
            <span class="lb-rank">{{ entry.place }}</span>
            <span class="row-avatar"><ChildAvatar :avatar="entry.avatar" /></span>
            <span class="row-name">{{ firstName(entry.name) }}</span>
            <span v-if="entry.childId === myId" class="lb-you">You</span>
            <span v-if="entry.childId === myId && passNote(entry)" class="row-hint">{{ passNote(entry) }}</span>
            <span class="lb-stars"><i class="bi bi-star-fill"></i>{{ entry.points }}</span>
          </div>
        </div>

        <p v-if="!hasMe" class="lb-hint">You are not on the board yet. Do a quest to earn stars and join!</p>

        <div class="lb-foot">
          <RouterLink :to="{ name: 'child-home' }" class="lb-go"><i class="bi bi-map"></i>Go do a quest</RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>
