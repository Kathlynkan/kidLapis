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

const submittedCount = computed(() => homework.value.filter(h => h.status === 'submitted').length)

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

async function rejectQuest(homeworkId) {
  try {
    await api.put(`/homework/${homeworkId}/reject`)
    const h = await api.get('/homework', { params: { childId } })
    homework.value = h.data
  } catch (err) {
    error.value = errorMessage(err)
  }
}

async function deleteSession(sessionId) {
  try {
    await api.delete(`/sessions/${sessionId}`)

    success.value = 'Session deleted successfully'

    await loadData() // reload data after successful deletion
    loadHandover() // the summary changes when a session is deleted
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

  // start both at the same time: the summary only needs childId,
  // so it does not have to wait for the child, sessions and homework
  loadData()
  loadHandover()
})
</script>

<template>
  <div class="container py-4 childprofilepage">
    <StateMessage v-if="loading" type="loading" />

    <template v-else>
      <div v-if="success" class="alert alert-success">{{ success }}</div>
      <StateMessage v-else-if="error" type="error" :message="error" />

      <RouterLink
        v-if="auth.role === 'volunteer' || auth.role === 'coordinator'"
        class="back-link"
        :to="{ name: auth.role === 'coordinator' ? 'manage-children' : 'volunteer-home' }"
      >
        <i class="bi bi-chevron-left"></i>{{ auth.role === 'coordinator' ? 'Children' : 'My children' }}
      </RouterLink>

      <PageHeader :title="child.name" :subtitle="`${child.level} · ${child.school}`">
        <template #lead>
          <ChildInitial :child="child" />
        </template>
        <RouterLink
          v-if="auth.role === 'volunteer'"
          :to="{ name: 'session-new', params: { id: child.id } }"
          class="btn btn-primary"
          data-test="record-session"
        >
          <i class="bi bi-plus-lg me-1"></i>Record Session
        </RouterLink>
        <RouterLink
          v-if="auth.role === 'volunteer'"
          :to="{ name: 'homework-new', params: { id: child.id } }"
          class="btn btn-outline-primary"
          data-test="assign-homework"
        >
          <i class="bi bi-journal-plus me-1"></i>Assign Homework
        </RouterLink>
        <!-- Coordinators only: volunteers can't use Messages (chat is parent <-> coordinator) -->
        <RouterLink
          v-if="auth.role === 'coordinator'"
          :to="{ name: 'messages', params: { childId: child.id } }"
          class="btn btn-outline-secondary"
        >
          <i class="bi bi-chat-dots me-1"></i>Message Parent
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
                  :can-edit="s.volunteerId === auth.user?.id || auth.role === 'coordinator'"
                  @edit="editSession"
                  @delete="deleteSession"
                />
              </div>
          </div>

          <div class="col-lg-5 d-flex flex-column gap-4">
            <PeelCard title="Skill Progress" icon="bi-graph-up-arrow" :initial-open="true">
              <SkillProgressChart :sessions="sessions" :calm="auth.role === 'volunteer'" />
            </PeelCard>

            <PeelCard title="Subject Summary" icon="bi-pie-chart" :initial-open="true">
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
                  @reject="rejectQuest"
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

<style>
/* INTERNAL CSS: only this page uses these styles, so they live here in the .vue file. (CSS shared by several pages is in src/css/.) */

/* Styles for one child's page as a volunteer or a coordinator sees it (ChildProfileView.vue, SessionCard.vue,
   HomeworkQuestCard.vue, HandoverCard.vue and PeelCard.vue).
   Every rule starts with .childprofilepage, so the other pages that use the same cards (the child's quests) are not changed.
   The colours of each role are the variables (--cp-...) in main.css.
   The colours of the volunteer:
     #213C31 dark green       text
     #446C59 green            the name, the line under it and the labels
     #4A735F deep green       main buttons, icons and arrows
     #9BD3B2 mint             the child's letter
     #CDE9D8 pale mint        soft buttons
     #E1F2E9 lightest mint    the back button
     #B7D8D7 muted teal       the handover box, the subject and score pills, "waiting to be checked"
                              (the same as "Being checked" on the parent page)
     #E4F0EF pale teal        small tags on the teal box
     #F7F4EE warm cream       the cards inside a section
     #EEDFA6 muted yellow     "struggled with" and the topics that keep coming back
     #EE9F96 soft red         overdue and delete (the same soft red for both)
     #2E8B57 / #E6F4EC        checked homework (the only strong green)
     #CFC9BC                  the edge of a card with nothing special about it
     #F9F1E6 sand             the board that holds the sections (the same as on the parent page)
   Look: a cream page, a sandy board with white cards on it, no outlines, soft corners (18px to 22px, round pills)
   and a very light shadow. */

/* the text of the page: the same size and weight as a volunteer sees (volunteershared.css), in the coordinator's colours */
.role-coordinator .childprofilepage {
  color: var(--cp-text);
}

.role-coordinator .childprofilepage .lapis-page-header .page-title {
  color: #5B4B8A;
}

/* the Edit buttons on a session and on a homework: the same pale green as a volunteer sees */
.role-coordinator .childprofilepage .btn-outline-primary {
  background: #CDE9D8;
}

.role-coordinator .childprofilepage .btn-outline-primary:hover {
  background: #9BD3B2;
}

.role-coordinator .childprofilepage .lapis-page-header .page-subtitle {
  color: #7D7690;
}

/* ---------- the whole page ---------- */

/* the board: the sandy box that holds the sections */
.childprofilepage .alert {
  border: 0;
  border-radius: 14px;
  background: var(--cp-teal);
  color: var(--cp-text);
}

/* ---------- the way back, the name and the buttons ---------- */

.childprofilepage .back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 14px 3px 10px;
  border-radius: 999px;
  background: var(--cp-lightest);
  color: var(--cp-text);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.childprofilepage .back-link:hover {
  background: var(--cp-soft);
}

.childprofilepage .back-link i {
  color: var(--cp-deep);
}

.childprofilepage .child-initial {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--cp-letter);
  font-size: 22px;
  font-weight: 700;
}

/* the buttons of the page: round pills, no capital letters */
.childprofilepage .btn {
  border: 0;
  border-radius: 5px;
  box-shadow: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.childprofilepage .btn-primary {
  background: var(--cp-main);
  color: var(--cp-main-text);
}

.childprofilepage .btn-primary:hover {
  background: var(--cp-main-hover);
  color: var(--cp-main-text);
}

.childprofilepage .btn-outline-primary,
.childprofilepage .btn-outline-secondary {
  background: var(--cp-soft);
  color: var(--cp-text);
}

.childprofilepage .btn-outline-primary:hover,
.childprofilepage .btn-outline-secondary:hover {
  background: var(--cp-letter);
  color: var(--cp-text);
}

/* Edit and Mark as Checked are the same pale green for a volunteer, so they are told apart by size and icon:
   the action that matters (Mark as Checked, Return) is bigger, the everyday ones (Edit, Delete) are smaller */
.childprofilepage .quest-check,
.childprofilepage .quest-return {
  padding: 3px 9px;
  font-size: 13px;
}

.childprofilepage .quest-edit,
.childprofilepage .quest-delete {
  padding: 3px 9px;
  font-size: 13px;
}

.role-volunteer .childprofilepage .quest-check {
  background: var(--cp-soft);
  color: #000000;
}

.role-volunteer .childprofilepage .quest-check:hover {
  background: var(--cp-letter);
  color: #000000;
}

/* delete and overdue are the same soft red */
.childprofilepage .btn-outline-danger {
  background: #EE9F96;
  color: var(--cp-text);
}

.childprofilepage .btn-outline-danger:hover {
  background: #E68C81;
  color: var(--cp-text);
}

/* Return: black words on a deeper soft red, like the black words of Mark as Checked */
.childprofilepage .btn-outline-danger.quest-return {
  background: #D9776B;
  color: #000000;
}

.childprofilepage .btn-outline-danger.quest-return:hover {
  background: #CC6659;
  color: #000000;
}

.childprofilepage .btn-link {
  color: var(--cp-deep);
  font-size: 13px;
  text-decoration: underline;
}

/* ---------- the sections (the handover and the PeelCard sections) ---------- */

.childprofilepage .peel-card,
.childprofilepage .handover-card {
  border: 0;
  border-radius: 22px;
  background: #FFFFFF;
  box-shadow: 0 1px 6px var(--cp-shadow);
}

.childprofilepage .handover-card {
  background: var(--cp-teal);
  box-shadow: none;
}

.childprofilepage .peel-header,
.childprofilepage .handover-header {
  padding: 16px 20px;
  background: transparent;
}

.childprofilepage .peel-header:hover,
.childprofilepage .handover-header:hover {
  background: transparent;
}

.childprofilepage .peel-card--open .peel-header,
.childprofilepage .handover-card--open .handover-header {
  border-bottom: 0;
}

.childprofilepage .peel-title,
.childprofilepage .handover-title {
  font-family: inherit;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--cp-text);
}

.childprofilepage .peel-title i,
.childprofilepage .handover-title i,
.childprofilepage .peel-arrow {
  color: var(--cp-deep);
}

.childprofilepage .peel-body-inner {
  padding: 0 20px 20px;
}

/* the charts sit straight on the section, and the section already has the title */
.childprofilepage [data-test='skill-progress-chart'],
.childprofilepage [data-test='topic-summary-chart'] {
  border: 0;
  background: transparent;
  box-shadow: none;
  padding: 0 !important; /* the chart card has the bootstrap class p-3, which is important */
}

.childprofilepage [data-test='skill-progress-chart'] > h2,
.childprofilepage [data-test='topic-summary-chart'] > h2 {
  display: none;
}

/* the topic bars (TopicSummaryChart.vue with calm): the name and the percentage, then a plain teal bar */
.childprofilepage .topic-bars {
  display: grid;
  gap: 12px;
}

.childprofilepage .topic-bar-top {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.childprofilepage .topic-bar-track {
  height: 12px;
  border-radius: 999px;
  background: var(--cp-track);
  overflow: hidden;
}

.childprofilepage .topic-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--cp-bar);
}

/* ---------- the handover ---------- */

.childprofilepage .handover-key {
  font-size: 14px;
  color: var(--cp-key);
}

.childprofilepage .handover-value {
  font-weight: 400;
}

/* the small tags (the source of the summary, the topics that keep coming back, the score, the subject, the homework state): the text sits in the middle */
.childprofilepage .handover-badge,
.childprofilepage .session-score,
.childprofilepage .session-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 999px;
  box-shadow: none;
  font-size: 12px;
  font-weight: 700;
}

.childprofilepage .handover-source-ai,
.childprofilepage .handover-source-last {
  background: var(--cp-teal-soft);
  color: var(--cp-text);
}

/* the topics that keep coming back are struggles too: the same muted yellow as "struggled with" */
.childprofilepage .handover-tag {
  background: #EEDFA6;
  color: var(--cp-text);
}

/* ---------- a session ---------- */

.childprofilepage .session-card,
.childprofilepage .quest-card {
  border: 0;
  border-radius: 18px;
  background: #F7F4EE;
  box-shadow: none;
}

/* a session on the sandy board is a white card (the homework inside a white section stays warm cream) */
.childprofilepage .board .session-card {
  background: #FFFFFF;
  box-shadow: 0 1px 6px var(--cp-shadow);
}

.childprofilepage .session-title {
  font-size: 16px;
}

/* the grey line under a session and under a homework */
.childprofilepage .session-meta,
.childprofilepage .quest-meta {
  font-size: 13px;
  color: var(--cp-grey);
}

/* the date and the mood chip share one white rounded bar, centred on the same line */
.childprofilepage .session-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 8px; /* a gap under the subject and the topic */
  padding: 4px 12px;
  border-radius: 999px;
  background: #FFFFFF;
}

.childprofilepage .session-mood {
  gap: 5px;
  padding: 0;
  background: transparent; /* the white bar behind the date shows through */
  font-size: 12px;
  line-height: 1; /* a tight line, so the face and the word sit on the same middle line */
}

.childprofilepage .session-score {
  padding: 4px 12px;
  background: var(--cp-teal);
  color: var(--cp-text);
  font-size: 13px;
}

.childprofilepage .session-lines {
  font-size: 14px;
  color: var(--cp-text);
}

.childprofilepage .session-icon {
  color: var(--cp-deep);
}

.childprofilepage .session-tag {
  padding: 2px 10px;
  background: #EEDFA6;
  color: var(--cp-text);
  font-weight: 600;
}

/* ---------- a homework: its edge and its tag show where it is ---------- */

.childprofilepage .quest-card {
  border-left: 5px solid #CFC9BC;
}

.childprofilepage .quest-late {
  border-left-color: #EE9F96;
}

.childprofilepage .quest-waiting {
  border-left-color: var(--cp-teal);
  border-left-style: dashed;
}

.childprofilepage .quest-check-alert {
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--cp-teal);
  color: var(--cp-text);
  font-size: 14px;
  font-weight: 600;
}

.childprofilepage .quest-done {
  background: #E6F4EC;
  border-left-color: #2E8B57;
}

.childprofilepage .quest-title {
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
}

.childprofilepage .quest-details {
  font-size: 14px;
}

</style>