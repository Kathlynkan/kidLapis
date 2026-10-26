<!-- HomeworkQuestCard - homework shown as a "quest".     Owner: Jachin -->
<script setup>
import { computed } from 'vue'
import { formatDate, daysSince } from '@/utils/format'
import { HOMEWORK_STATUS } from '@/utils/constants'

const props = defineProps({
  homework: { type: Object, required: true },
  mode:     { type: String, default: 'child' },
})
const emit = defineEmits(['submit', 'verify', 'delete'])

const status = computed(() => HOMEWORK_STATUS[props.homework.status])
const isOverdue = computed(
  () => props.homework.status === 'assigned' && daysSince(props.homework.dueDate) > 0,
)
</script>

<template>
  <div
    class="cb-card cb-card-yellow cb-card-top p-3 h-100 d-flex flex-column"
    data-test="homework-card"
    :style="isOverdue ? 'border-color:var(--topic-alert)' : ''"
  >
    <div class="d-flex justify-content-between align-items-start gap-2">
      <h3 class="h6 mb-1" style="text-shadow:none;color:var(--lapis-plum)">{{ homework.title }}</h3>
      <span
        class="badge"
        style="background:var(--lapis-yellow);color:var(--lapis-plum)"
      >+{{ homework.points }} ⭐</span>
    </div>

    <div class="small mb-2" style="color:var(--cb-muted)">
      {{ homework.subject }} &middot; due {{ formatDate(homework.dueDate) }}
      <span
        v-if="isOverdue"
        class="badge ms-1"
        style="background:var(--topic-alert);color:var(--lapis-plum)"
      >Overdue</span>
    </div>

    <p class="small mb-3" style="color:var(--lapis-plum)">{{ homework.details }}</p>

    <div class="mt-auto d-flex flex-column gap-2">
      <span
        class="badge"
        :style="`background:${status?.badge?.includes('success') ? 'var(--lapis-lime)' : status?.badge?.includes('warning') ? 'var(--lapis-yellow)' : 'var(--lapis-orange)'};color:var(--lapis-plum)`"
      >{{ status?.label }}</span>

      <p
        v-if="mode === 'child' && homework.status === 'submitted'"
        class="small mb-0 mt-1"
        style="color:var(--cb-muted)"
        data-test="waiting-message"
      >
        ⏳ Your volunteer will check this — then you'll get your ⭐ stars!
      </p>

      <button
        v-if="mode === 'child' && homework.status === 'assigned'"
        class="btn btn-primary btn-lg w-100 mt-1"
        data-test="submit-quest-btn"
        @click="emit('submit', homework.id)"
      >
        🎉 I'm done!
      </button>
      <button
        v-if="mode === 'volunteer' && homework.status === 'submitted'"
        class="btn btn-outline-primary w-100 mt-1"
        data-test="verify-quest-btn"
        @click="emit('verify', homework.id)"
      >
        ✅ Verify &amp; give points
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
