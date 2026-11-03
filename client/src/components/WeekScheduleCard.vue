<!-- The schedule on the dashboard: today's sessions first, the full week one click away.   Owner: Yu Xuan
  <WeekScheduleCard :volunteers="volunteers" :children="children" />
  The full week uses the same WeekGrid as the Schedule page, so both always look the same.
-->
<script setup>
import { ref, computed } from 'vue'
import MiniAvatar from '@/components/MiniAvatar.vue'
import WeekGrid from '@/components/WeekGrid.vue'

const props = defineProps({
  volunteers: { type: Array, default: () => [] },
  children: { type: Array, default: () => [] },
})

const TODAY = new Date().toLocaleDateString('en-US', { weekday: 'short' }) // 'Tue'
const TODAY_LONG = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) // 'Tuesday 3 Nov'
const firstName = (name) => (name || '').split(' ')[0]

const showWeek = ref(false)

const volunteerById = computed(() => Object.fromEntries(props.volunteers.map((v) => [v.id, v])))

// Every session booked for today's weekday, earliest first.
const todaySessions = computed(() =>
  props.children
    .flatMap((child) =>
      (child.schedule || [])
        .filter((s) => s.day === TODAY)
        .map((s) => ({ child, time: s.time || '', volunteer: volunteerById.value[s.volunteerId] })),
    )
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')),
)

// Booked slots that repeat every week (not the same thing as sessions logged this week).
const weeklySlots = computed(() => props.children.reduce((n, c) => n + (c.schedule || []).length, 0))
</script>

<template>
  <section class="t-card week-card" data-test="week-schedule">
    <div class="card-head">
      <h2>Today <span class="today-date">· {{ TODAY_LONG }}</span></h2>
      <span class="head-right">
        <span class="tag">{{ weeklySlots }} weekly slots</span>
        <RouterLink :to="{ name: 'schedule' }" class="edit-link" data-test="edit-schedule">
          Edit schedule <i class="bi bi-arrow-right"></i>
        </RouterLink>
      </span>
    </div>

    <!-- today's sessions -->
    <ul v-if="todaySessions.length" class="today-list" data-test="today-sessions">
      <li v-for="s in todaySessions" :key="`${s.child.id}-${s.volunteer?.id}`">
        <RouterLink :to="{ name: 'child-profile', params: { id: s.child.id } }" class="today-item">
          <span v-if="s.time" class="today-time">{{ s.time }}</span>
          <span v-else class="today-time no-time">No time</span>
          <MiniAvatar :person="s.child" :size="30" />
          <span class="today-text">
            <strong>{{ firstName(s.child.name) }}</strong>
            <span class="with">with {{ firstName(s.volunteer?.name) || 'a volunteer' }}</span>
          </span>
        </RouterLink>
      </li>
    </ul>
    <p v-else class="empty-today">No sessions today.</p>

    <!-- the full week, opened like a matchmaking card -->
    <button
      type="button"
      class="week-toggle"
      :aria-expanded="showWeek"
      aria-controls="dashboard-week"
      data-test="toggle-week"
      @click="showWeek = !showWeek"
    >
      {{ showWeek ? 'Hide full week' : 'Show full week' }}
      <i class="bi bi-chevron-down chevron" :class="{ 'is-open': showWeek }" aria-hidden="true"></i>
    </button>

    <Transition name="expand">
      <div v-if="showWeek" id="dashboard-week" class="week-wrap">
        <WeekGrid :volunteers="volunteers" :children="children" />
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.today-date {
  font-weight: 400;
  color: #7d7690;
}
.head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.edit-link {
  font-size: 14px;
  font-weight: 600;
  color: #6b5ca5;
  text-decoration: none;
  white-space: nowrap;
}
.edit-link:hover {
  text-decoration: underline;
}

/* today's sessions: a row of white pills that wraps */
.today-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.today-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  border-radius: 999px;
  background: #f7f4fb;
  color: #3d3454;
  text-decoration: none;
}
.today-item:hover {
  box-shadow: inset 0 0 0 1.5px #d5cbea;
}
.today-item:focus-visible {
  outline: 2px solid #6b5ca5;
}
.today-time {
  padding: 4px 10px;
  border-radius: 999px;
  background: #6b5ca5;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.today-time.no-time {
  background: #fdf0ee;
  color: #b4473b;
}
.today-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.with {
  font-size: 13px;
  color: #7d7690;
}
.empty-today {
  margin: 0;
  color: #7d7690;
}

/* show / hide the full week */
.week-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding: 6px 2px;
  border: 0;
  background: transparent;
  color: #6b5ca5;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.week-toggle:focus-visible {
  outline: 2px solid #6b5ca5;
  border-radius: 6px;
}
.chevron {
  transition: transform 0.3s ease;
}
.chevron.is-open {
  transform: rotate(180deg);
}
.week-wrap {
  margin-top: 8px;
}
.expand-enter-active,
.expand-leave-active {
  overflow: hidden;
  transition:
    max-height 0.35s ease,
    opacity 0.25s ease;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 1200px;
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .chevron,
  .expand-enter-active,
  .expand-leave-active {
    transition: none;
  }
}
</style>