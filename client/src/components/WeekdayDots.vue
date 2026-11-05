<script setup>
import { computed } from 'vue'
import { isConfirmed, isPending } from '@/utils/slots'

const props = defineProps({
  schedule: { type: Array, default: () => [] }, // child.schedule: [{ volunteerId, day, time }]
})

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const daysWhere = (test) => new Set((props.schedule || []).filter(test).map((slot) => slot.day))
const coveredDays = computed(() => daysWhere(isConfirmed))
// Waiting for the volunteer, and not already covered by someone else that day.
const pendingDays = computed(() => {
  const days = daysWhere(isPending)
  for (const d of coveredDays.value) days.delete(d)
  return days
})

const covered = computed(() => WEEKDAYS.filter((d) => coveredDays.value.has(d)))
const pending = computed(() => WEEKDAYS.filter((d) => pendingDays.value.has(d)))

const description = computed(() => {
  const parts = [
    covered.value.length
      ? `Volunteer on ${covered.value.join(', ')} (${covered.value.length} of 5 weekdays)`
      : 'No volunteer on any weekday',
  ]
  if (pending.value.length) parts.push(`waiting for a volunteer to accept ${pending.value.join(', ')}`)
  return parts.join('; ')
})

const dayClass = (d) => (coveredDays.value.has(d) ? 'is-on' : pendingDays.value.has(d) ? 'is-pending' : 'is-off')
</script>

<template>
  <span class="weekdays" role="img" :aria-label="description" :title="description" data-test="weekday-dots">
    <span
      v-for="d in WEEKDAYS"
      :key="d"
      class="day"
      :class="dayClass(d)"
      aria-hidden="true"
    >
      {{ d.slice(0, 2) }}
    </span>
    <span class="count" aria-hidden="true">{{ covered.length }}/5</span>
  </span>
</template>

<style scoped>
.weekdays {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  vertical-align: middle;
}
.day {
  display: inline-grid;
  place-items: center;
  min-width: 1.6rem;
  height: 1.3rem;
  padding: 0 0.2rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
}
/* Filled green vs outlined red: different shapes too, not just colours */
.day.is-on {
  background: #2f8a57;
  color: #fff;
  border: 1px solid #2f8a57;
}
.day.is-off {
  background: #fdf0ee;
  color: #b4473b;
  border: 1px solid #e8b4ad;
}
.day.is-pending {
  background: #fffaf0;
  color: #8a5a00;
  border: 1px dashed #e0b45a;
}
.count {
  margin-left: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  opacity: 0.7;
}
</style>