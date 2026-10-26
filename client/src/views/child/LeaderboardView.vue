<!-- Leaderboard                                          Owner: Jachin -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import StateMessage from '@/components/StateMessage.vue'
import { firstName } from '@/utils/format'

const auth = useAuthStore()
const allTime = ref([])
const improved = ref([])
const loading = ref(true)
const loadingImproved = ref(false)
const improvedLoaded = ref(false)
const error = ref('')
const activeTab = ref('alltime')

const current = computed(() => (activeTab.value === 'alltime' ? allTime.value : improved.value))
const podium = computed(() => current.value.slice(0, 3))
const rest = computed(() => current.value.slice(3))
const isInList = computed(() => current.value.some((e) => e.childId === auth.user?.childId))

async function loadImproved() {
  if (improvedLoaded.value) return
  loadingImproved.value = true
  try {
    const res = await api.get('/homework/leaderboard', { params: { period: 'week' } })
    improved.value = res.data
    improvedLoaded.value = true
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loadingImproved.value = false
  }
}

function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'week') loadImproved()
}

onMounted(async () => {
  try {
    const res = await api.get('/homework/leaderboard')
    allTime.value = res.data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container py-4">
    <PageHeader title="🏆 Leaderboard" subtitle="Complete quests to earn stars and climb the ranks!" />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <!-- Tabs -->
      <ul class="nav nav-pills mb-4 gap-2">
        <li class="nav-item">
          <button
            class="nav-link"
            :class="{ active: activeTab === 'alltime' }"
            data-test="tab-alltime"
            @click="switchTab('alltime')"
          >
            ⭐ All-time stars
          </button>
        </li>
        <li class="nav-item">
          <button
            class="nav-link"
            :class="{ active: activeTab === 'week' }"
            data-test="tab-improved"
            @click="switchTab('week')"
          >
            🔥 This week
          </button>
        </li>
      </ul>

      <StateMessage v-if="loadingImproved" type="loading" />

      <template v-else>
        <StateMessage
          v-if="current.length === 0"
          :message="
            activeTab === 'week'
              ? 'No quests verified this week yet — complete one to appear!'
              : 'No scores yet — complete a quest to appear!'
          "
        />

        <template v-else>
          <!-- Podium top 3 -->
          <div class="d-flex justify-content-center align-items-end gap-3 mb-4 mt-2">
            <template v-for="(entry, i) in podium" :key="entry.childId">
              <div
                class="text-center podium-col"
                :style="{ order: [2, 1, 3][i] }"
                :data-test="'podium-' + (i + 1)"
              >
                <div class="fs-1 mb-1">{{ entry.avatar }}</div>
                <div class="fw-heavy">
                  {{ firstName(entry.name) }}
                  <span v-if="entry.childId === auth.user?.childId" class="badge bg-primary ms-1" style="font-size:0.6rem">You</span>
                </div>
                <div class="small text-muted-cb mb-1">⭐ {{ entry.points }}</div>
                <div
                  class="podium-bar d-flex align-items-center justify-content-center fw-heavy"
                  :style="{ height: [100, 70, 55][i] + 'px' }"
                >
                  {{ ['🥇', '🥈', '🥉'][i] }}
                </div>
              </div>
            </template>
          </div>

          <!-- 4th place onwards -->
          <div v-if="rest.length" class="cb-card">
            <table class="table table-sm mb-0">
              <tbody>
                <tr
                  v-for="(entry, i) in rest"
                  :key="entry.childId"
                  :class="{ 'table-active fw-bold': entry.childId === auth.user?.childId }"
                  data-test="leaderboard-row"
                >
                  <td class="text-muted-cb ps-3" style="width: 40px">{{ i + 4 }}</td>
                  <td>{{ entry.avatar }} {{ firstName(entry.name) }}</td>
                  <td class="text-end pe-3 fw-bold">⭐ {{ entry.points }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p v-if="isInList" class="small text-muted-cb text-center mt-3">
            Your row is highlighted above.
          </p>
        </template>
      </template>
    </template>
  </div>
</template>

<style scoped>
.podium-col {
  min-width: 88px;
}
.podium-bar {
  background: var(--role-accent-soft, var(--lapis-cream));
  border-radius: var(--cb-radius) var(--cb-radius) 0 0;
  font-size: 1.6rem;
  width: 100%;
}
</style>
