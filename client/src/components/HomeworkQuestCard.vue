<!-- HomeworkQuestCard - homework shown as a "quest".     Owner: Jachin
     mode "child": the child's gamified view. mode "volunteer": the volunteer checks or removes it.
     The look for a volunteer is in the style block of views/volunteer/ChildProfileView.vue -->
<script setup>
import { ref, computed } from 'vue'
import { formatDate, daysSince, subjectStyle } from '@/utils/format'
import { HOMEWORK_STATUS } from '@/utils/constants'
import '@/css/main/components.css' // the look of the small parts
import '@/css/main/labels.css' // the capital-letter captions

const props = defineProps({
  homework: { type: Object, required: true },
  mode:     { type: String, default: 'child' },
  busy:     { type: Boolean, default: false },
})
const emit = defineEmits(['submit', 'unsubmit', 'verify', 'reject', 'edit', 'delete'])

const status = computed(() => HOMEWORK_STATUS[props.homework.status])
const isOverdue = computed(
  () => props.homework.status === 'assigned' && daysSince(props.homework.dueDate) > 0,
)
const isLateSubmission = computed(
  () => props.homework.completedAt &&
        props.homework.dueDate &&
        props.homework.completedAt > props.homework.dueDate,
)

// where the homework is now, for the volunteer's view: late, todo, waiting (to be checked) or done
const state = computed(() => {
  if (props.homework.status === 'verified') return 'done'
  if (props.homework.status === 'submitted') return 'waiting'
  return isOverdue.value ? 'late' : 'todo'
})
const STATE_LABELS = { late: 'Overdue', todo: 'To do', waiting: 'Being checked', done: 'Checked' }

const starsToEarn = computed(() => {
  if (props.homework.status === 'verified') return props.homework.pointsAwarded ?? props.homework.points
  if (isOverdue.value || isLateSubmission.value) return Math.ceil(props.homework.points / 2)
  return props.homework.points
})

const showDeleteModal = ref(false)

function handleDelete() { showDeleteModal.value = true }
function confirmDelete() { emit('delete', props.homework.id); showDeleteModal.value = false }
function cancelDelete()  { showDeleteModal.value = false }
</script>

<template>
  <div
    class="lapis-card lapis-card-yellow lapis-card-top quest-card p-3 h-100 d-flex flex-column"
    :class="`quest-${state}`"
    data-test="homework-card"
  >

  <div class="d-flex justify-content-between align-items-start gap-2">
    <div>
      <span class="quest-subject" :style="subjectStyle(homework.subject)">{{ homework.subject }}</span>
      <strong class="quest-title">{{ homework.title }}</strong>

      <div class="small quest-meta mt-1">
        due {{ formatDate(homework.dueDate) }}
        · {{ starsToEarn }} <i class="bi bi-star-fill"></i>

        <template v-if="mode === 'volunteer' && isLateSubmission && homework.status !== 'verified'">
          <span class="quest-late-penalty"> (submitted late)</span>
        </template>
      </div>
    </div>

      <span
      v-if="state !== 'todo'"
      class="badge quest-pill" :class="`quest-pill-${state}`">
        {{ STATE_LABELS[state] }}
      </span>
    </div>

    <p class="small mb-3 quest-details">{{ homework.details }}</p>

    <div class="mt-auto d-flex flex-column gap-2">
      <span
        v-if="mode === 'child' && homework.rejectedAt && homework.status === 'assigned'"
        class="badge quest-returned">
        <i class="bi bi-arrow-return-left me-1"></i>Returned — please redo!
      </span>

      <span v-if="mode === 'child' && isOverdue" class="badge quest-late-info">
        Late • {{ Math.ceil(homework.points / 2) }} ★ only
      </span>

      <span v-if="mode === 'child' && isLateSubmission" class="badge quest-late-info">
        Late — {{ Math.ceil(homework.points / 2) }} ★ only
      </span>

      <!-- the status line is only for a quest that is waiting or checked: a quest to do already says so at the top right -->
      <span v-if="mode === 'child' && homework.status !== 'assigned'" class="badge quest-status" :class="`quest-pill-${state}`">
        {{ status?.label }}
      </span>

      <button
        v-if="mode === 'child' && homework.status === 'assigned'"
        class="btn btn-primary btn-sm mt-1 quest-submit"
        data-test="submit-quest-btn"
        @click="emit('submit', homework.id)"
      >
        <i class="bi bi-check-lg me-1"></i>I'm done!
      </button>

      <button
        v-if="mode === 'child' && homework.status === 'submitted'"
        class="btn btn-sm mt-1 quest-undo"
        data-test="undo-quest-btn"
        @click="emit('unsubmit', homework.id)"
      >
        <i class="bi bi-arrow-counterclockwise me-1"></i>Undo
      </button>

      <div v-if="mode === 'volunteer' && homework.status !== 'verified'"
      class="mt-2 d-flex align-items-center gap-2">

        <template v-if="homework.status === 'submitted'">
          <button
            class="btn btn-sm btn-primary quest-check"
            data-test="verify-homework-btn"
            :disabled="busy"
            @click="emit('verify', homework.id)">
            <span v-if="busy" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            <i v-else class="bi bi-check-circle"></i>
            {{ busy ? 'Checking...' : 'Mark as Checked' }}
          </button>
          <button
            class="btn btn-sm btn-outline-danger quest-return"
            data-test="reject-homework-btn"
            @click="emit('reject', homework.id)">
            <i class="bi bi-arrow-return-left"></i> Return
          </button>
        </template>

        <div v-else>
          <button
            class="btn btn-sm btn-outline-primary quest-edit"
            data-test="edit-homework-btn"
            @click="emit('edit', homework.id)">
            <i class="bi bi-pencil"></i> Edit
          </button>

          <button
            class="btn btn-sm btn-outline-danger ms-2 quest-delete"
            data-test="delete-homework-btn"
            @click="handleDelete">
            <i class="bi bi-trash"></i> Delete
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete confirm modal -->
  <Teleport to="body">
      <div v-if="showDeleteModal" class="modal fade show d-block" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Delete Homework</h5>
          </div>
          <div class="modal-body session-delete-text">
            <p>Are you sure you want to delete this homework?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" @click="cancelDelete">
              <i class="bi bi-x-circle"></i> Cancel</button>
            <button type="button" class="btn btn-danger btn-sm" @click="confirmDelete">
              <i class="bi bi-trash"></i> Delete</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showDeleteModal" class="modal-backdrop fade show"></div>
  </Teleport>
</template>

<style scoped>
.quest-undo {
  --bs-btn-color: #4A3F3A;
  --bs-btn-bg: #EDE8E0;
  --bs-btn-hover-color: #4A3F3A;
  --bs-btn-hover-bg: #E0D8CE;
  --bs-btn-active-bg: #E0D8CE;
  align-self: flex-end;
  border: 0;
  border-radius: 5px;
  box-shadow: none;
  font-size: 13px;
  font-weight: 600;
}

/* the two notes sit on the left, as wide as their words */
.quest-returned,
.quest-late-warn {
  align-self: flex-start;
}

.quest-late-info {
  background: #FFE082;
  color: #5C3D00;
  border: 1.5px solid #F5B840;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  align-self: flex-start;
}

.quest-late-penalty {
  color: #e87a6e;
  font-weight: 600;
}
</style>