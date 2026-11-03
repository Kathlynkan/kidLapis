<!-- Compact, read-only weekly timetable for the dashboard.   Owner: Yu Xuan
  <WeekScheduleCard :volunteers="volunteers" :children="children" />
  Rows = volunteers, columns = weekdays (Sat/Sun only appear if someone works weekends).
  Editing happens on the Schedule page; the "Edit schedule" link goes there.
-->
<script setup>
import { computed } from 'vue'
import { firstName } from '@/utils/format'

const props = defineProps({
  volunteers: { type: Array, default: () => [] },
  children: { type: Array, default: () => [] },
})

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const TODAY = new Date().toLocaleDateString('en-US', { weekday: 'short' }) // 'Mon'

// Only show Sat/Sun when a volunteer is free or booked then, to keep the card compact.
const days = computed(() => {
  const weekend = ['Sat', 'Sun'].filter(
    (d) =>
      props.volunteers.some((v) => (v.availability || []).includes(d)) ||
      props.children.some((c) => (c.schedule || []).some((s) => s.day === d)),
  )
  return [...WEEKDAYS, ...weekend]
})

// { 'u_vol1|Mon': [{ child, time }, ...] }, sorted by time.
const slotsByCell = computed(() => {
  const map = {}
  for (const child of props.children) {
    for (const s of child.schedule || []) {
      // pending = the volunteer hasn't accepted this day yet (shown dashed, "waiting")
      ;(map[`${s.volunteerId}|${s.day}`] ??= []).push({ child, time: s.time || '', pending: s.status === 'pending' })
    }
  }
  for (const list of Object.values(map)) {
    list.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
  }
  return map
})

const slotsFor = (v, day) => slotsByCell.value[`${v.id}|${day}`] || []
const isFree = (v, day) => (v.availability || []).includes(day)

// Accepted sessions, and the ones still waiting for a volunteer to accept
const sessionCount = computed(() =>
  props.children.reduce((n, c) => n + (c.schedule || []).filter((s) => s.status !== 'pending').length, 0),
)
const waitingCount = computed(() =>
  props.children.reduce((n, c) => n + (c.schedule || []).filter((s) => s.status === 'pending').length, 0),
)
</script>

<template>
  <section class="t-card week-card" data-test="week-schedule">
    <div class="card-head">
      <h2>Weekly schedule</h2>
      <span class="d-flex align-items-center gap-2">
        <span class="tag">{{ sessionCount }} sessions</span>
        <span v-if="waitingCount" class="tag tag-wait" data-test="week-waiting">{{ waitingCount }} waiting to accept</span>
        <RouterLink :to="{ name: 'schedule' }" class="edit-link" data-test="edit-schedule">
          Edit schedule <i class="bi bi-arrow-right"></i>
        </RouterLink>
      </span>
    </div>

    <p v-if="!volunteers.length" class="empty">No volunteers yet.</p>

    <div v-else class="week-scroll">
      <table class="week-table">
        <thead>
          <tr>
            <th scope="col" class="vol-col">Volunteer</th>
            <th v-for="d in days" :key="d" scope="col" :class="{ 'is-today': d === TODAY }">
              {{ d }}<span v-if="d === TODAY" class="visually-hidden"> (today)</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in volunteers" :key="v.id">
            <th scope="row" class="vol-col">{{ firstName(v.name) }}</th>
            <td
              v-for="d in days"
              :key="d"
              :class="{ 'is-off': !isFree(v, d), 'is-today': d === TODAY }"
            >
              <template v-if="isFree(v, d)">
                <RouterLink
                  v-for="slot in slotsFor(v, d)"
                  :key="slot.child.id"
                  :to="{ name: 'child-profile', params: { id: slot.child.id } }"
                  class="pill"
                  :class="{ 'is-pending': slot.pending }"
                  :title="`${slot.child.name} at ${slot.time || 'no time set'}${slot.pending ? ' (waiting for the volunteer to accept)' : ''}`"
                >
                  <span class="pill-time">{{ slot.time || '--:--' }}</span> {{ firstName(slot.child.name) }}
                  <span v-if="slot.pending" class="pill-waiting">waiting</span>
                </RouterLink>
                <span v-if="!slotsFor(v, d).length" class="free">Free</span>
              </template>
              <span v-else class="visually-hidden">Not available</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.edit-link {
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  color: var(--cb-primary);
  white-space: nowrap;
}
.edit-link:hover {
  text-decoration: underline;
}
.week-scroll {
  overflow-x: auto; /* scrolls sideways on small screens instead of squashing */
}
.week-table {
  width: 100%;
  min-width: 620px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-size: 0.85rem;
}
.week-table th,
.week-table td {
  padding: 0.4rem;
  vertical-align: top;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.week-table thead th {
  border-top: 0;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.75;
  text-align: center;
}
.vol-col {
  width: 90px;
  text-align: left !important;
  font-weight: 600;
}
.is-off {
  background: repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.025) 0 6px, rgba(0, 0, 0, 0.05) 6px 12px);
}
td.is-today:not(.is-off) {
  background: var(--cb-primary-soft);
}
th.is-today {
  color: var(--cb-primary);
  opacity: 1 !important;
}
.pill {
  display: block;
  margin-bottom: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: inherit;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pill:hover {
  border-color: var(--cb-primary);
}
/* a session the volunteer hasn't accepted yet */
.pill.is-pending {
  border: 1.5px dashed #C8A028;
  background: #FBF5DC;
}
.pill-waiting {
  font-size: 0.7rem;
  color: #8A6D12;
}
.tag-wait {
  background: #FBF5DC;
  color: #6E5410;
  box-shadow: inset 0 0 0 1px #E3C76A;
}
.pill-time {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.free {
  display: block;
  text-align: center;
  font-size: 0.75rem;
  opacity: 0.55;
}
</style>