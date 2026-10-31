<!-- HomeworkQuestCard - homework shown as a "quest".     Owner: Jachin
     mode "child": the child's gamified view. mode "volunteer": the volunteer checks or removes it.
     The look for a volunteer is in css/volunteer/childprofilepage.css -->
<script setup>
import { ref, computed } from 'vue'
import { formatDate, daysSince } from '@/utils/format'
import { HOMEWORK_STATUS } from '@/utils/constants'
import '@/css/main/components.css' // the look of the small parts

const props = defineProps({
  homework: { type: Object, required: true },
  mode:     { type: String, default: 'child' },
})
const emit = defineEmits(['submit', 'verify', 'edit', 'delete'])

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
const STATE_LABELS = { late: 'Overdue', todo: 'To do', waiting: 'Waiting to be checked', done: 'Checked' }

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
      <h3 class="h6 mb-1 quest-title">{{ homework.title }}</h3>
      <span v-if="mode === 'child'" class="badge quest-points">+{{ homework.points }} <i class="bi bi-star-fill"></i></span>
      <span v-else class="badge quest-pill" :class="`quest-pill-${state}`">
        <i v-if="state === 'done'" class="bi bi-check-lg me-1"></i>{{ STATE_LABELS[state] }}
      </span>
    </div>

    <div class="small mb-2 quest-meta">
      {{ homework.subject }} &middot; due {{ formatDate(homework.dueDate) }}
      <template v-if="mode === 'volunteer'"> &middot; {{ homework.points }} stars</template>
      <span v-if="isOverdue && mode === 'child'" class="badge quest-overdue ms-1">Overdue</span>
    </div>

    <p class="small mb-3 quest-details">{{ homework.details }}</p>

    <div class="mt-auto d-flex flex-column gap-2">
      <span v-if="mode === 'child'" class="badge quest-status" :class="{ 'quest-status-done': homework.status === 'verified' }">
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

      <div v-if="mode === 'volunteer' && homework.status !== 'verified'" 
      class="mt-2 d-flex align-items-center">

        <button
          v-if="homework.status === 'submitted'"
          class="btn btn-sm btn-primary"
          data-test="verify-homework-btn"
          @click="emit('verify', homework.id)">
          <i class="bi bi-check-circle"></i> Mark as Checked
        </button>

        <div v-else>
          <button
            class="btn btn-sm btn-outline-primary"
            data-test="edit-homework-btn"
            @click="emit('edit', homework.id)">
            <i class="bi bi-pencil"></i> Edit
          </button>

          <button
            class="btn btn-sm btn-outline-danger ms-2"
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