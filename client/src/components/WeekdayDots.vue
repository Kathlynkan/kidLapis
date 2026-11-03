<!-- Which weekdays a child has a volunteer, e.g. next to a child's name.   Owner: Yu Xuan
  <WeekdayDots :schedule="child.schedule" />
  Green = a volunteer is booked that day, red = nobody. Also shows "2/5" and a
  full sentence for screen readers, so it never relies on colour alone.
-->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  schedule: { type: Array, default: () => [] }, // child.schedule: [{ volunteerId, day, time }]
})

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const coveredDays = computed(() => new Set((props.schedule || []).map((slot) => slot.day)))
const covered = computed(() => WEEKDAYS.filter((d) => coveredDays.value.has(d)))

const description = computed(() =>
  covered.value.length
    ? `Volunteer on ${covered.value.join(', ')} (${covered.value.length} of 5 weekdays)`
    : 'No volunteer on any weekday',
)
</script>

<template>
  <span class="weekdays" role="img" :aria-label="description" :title="description" data-test="weekday-dots">
    <span
      v-for="d in WEEKDAYS"
      :key="d"
      class="day"
      :class="coveredDays.has(d) ? 'is-on' : 'is-off'"
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
.count {
  margin-left: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  opacity: 0.7;
}
</style>