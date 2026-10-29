<!-- Leaderboard                                          Owner: Jachin -->
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

const myId     = computed(() => auth.user?.childId)
const podium   = computed(() => entries.value.slice(0, 3))
const rest     = computed(() => entries.value.slice(3))
const myRank   = computed(() => entries.value.findIndex((e) => e.childId === myId.value) + 1)
const myEntry  = computed(() => entries.value.find((e) => e.childId === myId.value))

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
  <div class="container py-4">
    <PageHeader title="Leaderboard" subtitle="Stars earned this week — resets every Monday!" />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <template v-if="entries.length === 0">
        <StateMessage message="No quests verified this week yet — complete one to appear!" />
        <div class="text-center mt-3">
          <RouterLink :to="{ name: 'child-home' }" class="btn btn-primary px-4">
            <i class="bi bi-map me-2"></i>Go do a quest
          </RouterLink>
        </div>
      </template>

      <template v-else>
        <!-- Your rank chip (only shown when not on the podium) -->
        <div v-if="myRank > 3 && myEntry" class="my-rank-chip mb-3">
          <span class="my-rank-position">#{{ myRank }}</span>
          <span class="my-rank-name"><ChildAvatar :avatar="myEntry.avatar" /> You</span>
          <span class="my-rank-pts"><i class="bi bi-star-fill me-1"></i>{{ myEntry.points }}</span>
        </div>

        <!-- Podium top 3 -->
        <div class="podium-stage mb-0">
          <div class="d-flex justify-content-center align-items-end gap-3">
            <template v-for="(entry, i) in podium" :key="entry.childId">
              <div
                class="text-center podium-col"
                :style="{ order: [2, 1, 3][i] }"
                :data-rank="i + 1"
              >
                <div class="podium-avatar mb-2"><ChildAvatar :avatar="entry.avatar" /></div>
                <div class="fw-heavy">
                  {{ firstName(entry.name) }}
                  <span v-if="entry.childId === myId" class="badge bg-primary ms-1 leaderboard-you">You</span>
                </div>
                <div class="small lapis-muted mb-1"><i class="bi bi-star-fill me-1"></i>{{ entry.points }}</div>
                <div
                  class="podium-bar d-flex align-items-center justify-content-center fw-heavy"
                  :style="{ height: [160, 100, 70][i] + 'px' }"
                >{{ i + 1 }}</div>
              </div>
            </template>
          </div>
        </div>

        <!-- 4th place onwards -->
        <div v-if="rest.length" class="lapis-card">
          <table class="table table-sm mb-0">
            <tbody>
              <tr
                v-for="(entry, i) in rest"
                :key="entry.childId"
                :class="{ 'table-active fw-bold': entry.childId === myId }"
                data-test="leaderboard-row"
              >
                <td class="lapis-muted ps-3 leaderboard-rank">{{ i + 4 }}</td>
                <td><ChildAvatar :avatar="entry.avatar" /> {{ firstName(entry.name) }}</td>
                <td class="text-end pe-3 fw-bold"><i class="bi bi-star-fill me-1"></i>{{ entry.points }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="text-center mt-4">
          <RouterLink :to="{ name: 'child-home' }" class="btn btn-outline-primary px-4">
            <i class="bi bi-map me-2"></i>Go do a quest
          </RouterLink>
        </div>
      </template>
    </template>
  </div>
</template>
