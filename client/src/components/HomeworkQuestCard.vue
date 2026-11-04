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

// where the homework is now, for the volunteer's view: late, todo, waiting (to be checked) or done
const state = computed(() => {
  if (props.homework.status === 'verified') return 'done'
  if (props.homework.status === 'submitted') return 'waiting'
  return isOverdue.value ? 'late' : 'todo'
})
const STATE_LABELS = { late: 'Overdue', todo: 'To do', waiting: 'Being checked', done: 'Checked' }

// stars shown in the top-right chip for child assigned quests
const chipStars = computed(() =>
  isOverdue.value
    ? Math.ceil(props.homework.points / 2)
    : (props.homework.pointsAwarded ?? props.homework.points),
)

// compact due chip label + matching icon for the child's card
const dueLabel = computed(() => {
  if (props.homework.status === 'submitted') return 'In review'
  if (props.homework.status === 'verified') {
    const pts = props.homework.pointsAwarded ?? props.homework.points
    return `+${pts} ★`
  }
  const days = daysSince(props.homework.dueDate)
  if (days < -1) return `${-days}d left`
  if (days === -1) return 'Tomorrow'
  if (days === 0) return 'Today'
  if (days === 1) return '1d late'
  return `${days}d late`
})

const dueIcon = computed(() => {
  if (props.homework.status === 'verified')  return 'bi-patch-check-fill'
  if (props.homework.status === 'submitted') return 'bi-hourglass-split'
  const days = daysSince(props.homework.dueDate)
  if (days > 0)  return 'bi-exclamation-triangle-fill'
  if (days === 0) return 'bi-clock-fill'
  return 'bi-clock'
})

const dueUrgency = computed(() => {
  if (props.homework.status === 'verified') return 'done'
  if (props.homework.status !== 'assigned') return 'neutral'
  const days = daysSince(props.homework.dueDate)
  if (days > 0)  return 'overdue'
  if (days === 0) return 'today'
  if (days >= -2) return 'soon'
  return 'ok'
})

// only show description when the child still needs to act on the quest
const showDesc = computed(() => props.mode === 'volunteer' || props.homework.status === 'assigned')

const expanded = ref(false)
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
    <!-- top row: subject left, reward/state chip right — both on the same baseline -->
    <div class="d-flex justify-content-between align-items-center mb-2 gap-2">
      <span class="quest-subject" :style="subjectStyle(homework.subject)">{{ homework.subject }}</span>

      <!-- child: star chip only on assigned quests; color of the due line handles state for the rest -->
      <span v-if="mode === 'child' && homework.status === 'assigned'" class="quest-star-chip" :class="`quest-star-${state}`">
        <s v-if="isOverdue" class="quest-star-original">{{ homework.points }}</s>
        {{ chipStars }} <i class="bi bi-star-fill"></i>
      </span>
      <!-- volunteer: always show the status pill -->
      <span v-if="mode === 'volunteer'" class="badge quest-pill" :class="`quest-pill-${state}`">{{ STATE_LABELS[state] }}</span>
    </div>

    <!-- title -->
    <strong class="quest-title mb-1">{{ homework.title }}</strong>

    <!-- volunteer: exact date + points -->
    <div v-if="mode === 'volunteer'" class="small quest-meta mt-1 mb-1">
      due {{ formatDate(homework.dueDate) }} &middot; {{ homework.pointsAwarded ?? homework.points }} <i class="bi bi-star-fill"></i>
    </div>

    <!-- description: only when the child still needs to read it (assigned); always for volunteer -->
    <p v-if="showDesc" class="small quest-details" :class="{ 'quest-details-clamp': mode === 'child' && !expanded }">{{ homework.details }}</p>
    <div class="mb-2">
      <button
        v-if="mode === 'child' && homework.status === 'assigned' && homework.details && homework.details.length > 100"
        class="quest-read-more"
        @click="expanded = !expanded"
      >{{ expanded ? 'Show less' : 'Read more' }}</button>
    </div>

    <!-- child: compact due chip — below description so urgency sits next to the action button -->
    <div v-if="mode === 'child'" class="quest-due mb-2" :class="`quest-due-${dueUrgency}`">
      <i :class="`bi ${dueIcon}`"></i>{{ dueLabel }}
    </div>

    <!-- child actions -->
    <div v-if="mode === 'child'" class="mt-auto d-flex flex-column gap-2">
      <span v-if="homework.rejectedAt && homework.status === 'assigned'" class="badge quest-returned">
        <i class="bi bi-arrow-return-left me-1"></i>Returned
      </span>
      <p v-if="homework.rejectMessage && homework.status === 'assigned'" class="quest-reject-message">
        {{ homework.rejectMessage }}
      </p>

      <button
        v-if="homework.status === 'assigned'"
        class="btn btn-primary btn-sm quest-submit"
        data-test="submit-quest-btn"
        @click="emit('submit', homework.id)"
      >
        <i class="bi bi-check-lg me-1"></i>Submit
      </button>

      <button
        v-if="homework.status === 'submitted'"
        class="btn btn-sm quest-undo"
        data-test="undo-quest-btn"
        @click="emit('unsubmit', homework.id)"
      >
        <i class="bi bi-arrow-counterclockwise me-1"></i>Undo
      </button>
    </div>

    <!-- volunteer actions -->
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
/* star reward chip — top-right for assigned quests in child mode */
.quest-star-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.quest-star-todo { background: #FFF0DC; color: #B86A00; }
.quest-star-late { background: #FBE3DF; color: #9A3F36; }

.quest-star-original { opacity: 0.55; font-weight: 600; text-decoration: line-through; }

/* due chip: icon + compact label in a colored pill */
.quest-due {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1px;
}
.quest-due .bi { font-size: 10px; }

.quest-due-ok      { background: #E6F4EC; color: #2E8B57; }
.quest-due-done    { background: #E6F4EC; color: #2E8B57; }
.quest-due-soon    { background: #FFF0DC; color: #B86A00; }
.quest-due-today   { background: #FEF3C7; color: #C47A00; }
.quest-due-overdue { background: #FEE2E2; color: #9A3F36; }
.quest-due-neutral { background: #F3F0EE; color: #8D7F77; }

/* description: 2-line clamp in child mode */
.quest-details-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* submit button: full width */
.quest-submit { width: 100%; }

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
