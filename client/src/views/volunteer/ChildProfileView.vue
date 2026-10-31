<!-- =============================================================
  Child profile = the PRE-SESSION BRIEFING page.      Owner: Yuqi
  (Session history list + homework section: Ning Xuan's components)
  (Charts: Jachin's components)
  -------------------------------------------------------------
  Already loads: child, sessions, homework, handover (AI summary, cached, with fallback)
  TODO (Yuqi):
   [x] HandoverCard: POST /handover/:id (auto-updates, no refresh button)
  TODO (Ning Xuan):
    [done] wire SessionCard @edit / @delete (DELETE /sessions/:id, then reload)
============================================================= -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import { daysSince } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import StateMessage from '@/components/StateMessage.vue'
import HandoverCard from '@/components/HandoverCard.vue'
import SessionCard from '@/components/SessionCard.vue'
import HomeworkQuestCard from '@/components/HomeworkQuestCard.vue'
import SkillProgressChart from '@/components/charts/SkillProgressChart.vue'
import TopicSummaryChart from '@/components/charts/TopicSummaryChart.vue'
import PeelCard from '@/components/PeelCard.vue'
import ChildInitial from '@/components/ChildInitial.vue'
import '@/css/volunteer/volunteershared.css' // what the volunteer pages have in common
import '@/css/volunteer/childprofilepage.css' // the look of this page for a volunteer
import '@/css/main/labels.css' // the capital-letter captions

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const childId = route.params.id

const child = ref(null)
const sessions = ref([])
const homework = ref([])
const handover = ref(null)
const handoverLoading = ref(false)
const loading = ref(true)
const success = ref('')
const error = ref('')

// the homework in the order a volunteer needs it: overdue, to do, waiting to be checked, checked
function homeworkRank(h) {
  if (h.status === 'verified') return 3
  if (h.status === 'submitted') return 2
  return daysSince(h.dueDate) > 0 ? 0 : 1
}

const activeHomework = computed(() =>
  [...homework.value]
    .filter(h => h.status !== 'verified')
    .sort((a, b) => homeworkRank(a) - homeworkRank(b))
)

const completedHomework = computed(() =>
  [...homework.value]
    .filter(h => h.status === 'verified')
    .sort((a, b) => {
      const dateA = a.completedAt || ''
      const dateB = b.completedAt || ''
      return dateB.localeCompare(dateA)
    })
)

async function loadHandover() {
  handoverLoading.value = true
  try {
    const response = await api.post(`/handover/${childId}`, { audience: 'volunteer' })
    handover.value = response.data
  } catch {
    handover.value = null // the rest of the page still works without the summary
  }
  handoverLoading.value = false
}

async function loadData() {
  try {
    const [c, s, h] = await Promise.all([
      api.get(`/children/${childId}`),
      api.get('/sessions', { params: { childId } }),
      api.get('/homework', { params: { childId } }),
    ])
    child.value = c.data
    sessions.value = s.data
    homework.value = h.data
    loadHandover()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

function editSession(sessionId) {
  router.push({ name: 'session-edit', params: { sessionId } })
}

function editHomework(homeworkId) {
  router.push({ name: 'homework-edit', params: { id: childId, homeworkId } })
}
// The child handed a quest in; the volunteer checks it and the child is paid the berries (PUT /homework/:id/verify)
const checkingQuestId = ref(null)
async function verifyQuest(homeworkId) {
  checkingQuestId.value = homeworkId
  try {
    await api.put(`/homework/${homeworkId}/verify`)
    const h = await api.get('/homework', { params: { childId } })
    homework.value = h.data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    checkingQuestId.value = null
  }
}

async function deleteHomework(homeworkId) {
  try {
    await api.delete(`/homework/${homeworkId}`)
    homework.value = homework.value.filter((h) => h.id !== homeworkId)
  } catch (err) {
    error.value = errorMessage(err)
  }
}

async function deleteSession(sessionId) {
  try {
    await api.delete(`/sessions/${sessionId}`)

    success.value = 'Session deleted successfully'

    await loadData() // reload data after successful deletion
  } catch (err) {
    error.value = errorMessage(err)
  }
}

onMounted(() => {
  success.value = route.query.success || ''

  // remove success message from URL after reading it
  if (route.query.success) {
    router.replace({
      name: 'child-profile',
      params: {id: childId}
    })
  }

  loadData()
})
</script>

<template>
  <div class="container py-4 childprofilepage">
    <StateMessage v-if="loading" type="loading" />

    <template v-else>
      <div v-if="success" class="alert alert-success">{{ success }}</div>
      <StateMessage v-else-if="error" type="error" :message="error" />

      <RouterLink v-if="auth.role === 'volunteer'" class="back-link" :to="{ name: 'volunteer-home' }">
        <i class="bi bi-chevron-left"></i>My children
      </RouterLink>

      <PageHeader :title="child.name" :subtitle="`${child.level} · ${child.school}`">
        <template #lead>
          <ChildInitial v-if="auth.role === 'volunteer'" :child="child" />
        </template>
        <RouterLink
          v-if="auth.role === 'volunteer'"
          :to="{ name: 'session-new', params: { id: child.id } }"
          class="btn btn-primary"
          data-test="record-session"
        >
          <i class="bi bi-plus-lg me-1"></i>Record session
        </RouterLink>
        <RouterLink
          v-if="auth.role === 'volunteer'"
          :to="{ name: 'homework-new', params: { id: child.id } }"
          class="btn btn-outline-primary"
          data-test="assign-homework"
        >
          <i class="bi bi-journal-plus me-1"></i>Give homework
        </RouterLink>
        <!-- Teachers only: volunteers can't use Messages (chat is parent <-> teacher) -->
        <RouterLink
          v-if="auth.role === 'teacher'"
          :to="{ name: 'messages', params: { childId: child.id } }"
          class="btn btn-outline-secondary"
        >
          <i class="bi bi-chat-dots me-1"></i>Message parent
        </RouterLink>
      </PageHeader>

      <!-- the sandy board that holds the sections -->
      <div class="board">
        <div class="row g-4">
          <div class="col-lg-7">
            <HandoverCard :handover="handover" :loading="handoverLoading" class="mb-4" />

              <StateMessage v-if="sessions.length === 0" message="No sessions recorded yet." />
              <div class="d-flex flex-column gap-3">
                <SessionCard
                  v-for="s in sessions"
                  :key="s.id"
                  :session="s"
                  :can-edit="s.volunteerId === auth.user?.id || auth.role === 'teacher'"
                  @edit="editSession"
                  @delete="deleteSession"
                />
              </div>
          </div>

          <div class="col-lg-5 d-flex flex-column gap-4">
            <PeelCard title="Skill progress" icon="bi-graph-up-arrow" :initial-open="true">
              <SkillProgressChart :sessions="sessions" :calm="auth.role === 'volunteer'" />
            </PeelCard>

            <PeelCard title="Topic summary" icon="bi-pie-chart" :initial-open="true">
              <TopicSummaryChart :sessions="sessions" :calm="auth.role === 'volunteer'" />
            </PeelCard>

            <PeelCard
              :title="`Pending Homework (${activeHomework.length})`"
              icon="bi-journal-check"
              :initial-open="true"
            >
              <div class="d-flex flex-column gap-2">
                <HomeworkQuestCard
                  v-for="h in activeHomework"
                  :key="h.id"
                  :homework="h"
                  mode="volunteer"
                  :busy="checkingQuestId !== null"
                  @verify="verifyQuest"
                  @edit="editHomework"
                  @delete="deleteHomework"
                />
              </div>
            </PeelCard>
          
            <PeelCard
            v-if="completedHomework.length"
            :title="`Completed Homework (${completedHomework.length})`"
            icon="bi-check-circle-fill"
            :initial-open="true"
            >
            <div class="d-flex flex-column gap-2">
            <HomeworkQuestCard
            v-for="h in completedHomework"
            :key="h.id"
            :homework="h"
            mode="volunteer"
            />
            </div>
            </PeelCard>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>