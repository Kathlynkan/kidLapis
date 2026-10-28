<!-- HomeworkQuestCard - homework shown as a "quest".     Owner: Jachin
     mode "child": the child's gamified view. mode "volunteer": the volunteer checks or removes it.
     The look for a volunteer is in css/volunteer/childprofilepage.css -->
<script setup>
import { computed } from 'vue'
import { formatDate, daysSince } from '@/utils/format'
import { HOMEWORK_STATUS } from '@/utils/constants'
import '@/css/main/components.css' // the look of the small parts

const props = defineProps({
  homework: { type: Object, required: true },
  mode:     { type: String, default: 'child' },
})
const emit = defineEmits(['submit', 'verify', 'delete'])

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

      <p
        v-if="mode === 'child' && homework.status === 'submitted'"
        class="small mb-0 mt-1 quest-meta"
        data-test="waiting-message"
      >
        <i class="bi bi-hourglass-split me-1"></i>Your volunteer will check this — then you'll earn your stars!
      </p>

      <button
        v-if="mode === 'child' && homework.status === 'assigned'"
        class="btn btn-primary btn-lg w-100 mt-1 quest-submit"
        data-test="submit-quest-btn"
        @click="emit('submit', homework.id)"
      >
        <i class="bi bi-check-circle-fill me-1"></i>I'm done!
      </button>
      <button
        v-if="mode === 'volunteer' && homework.status === 'submitted'"
        class="btn btn-outline-primary w-100 mt-1"
        data-test="verify-quest-btn"
        @click="emit('verify', homework.id)"
      >
        Check and give points
      </button>
      <button
        v-if="mode === 'volunteer' && homework.status !== 'verified'"
        class="btn btn-outline-secondary btn-sm mt-1"
        data-test="delete-homework-btn"
        @click="emit('delete', homework.id)"
      >
        Remove
      </button>
    </div>
  </div>
</template>
