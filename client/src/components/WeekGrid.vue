<script setup>
import { computed } from 'vue'
import MiniAvatar from '@/components/MiniAvatar.vue'
import { isActive, isPending } from '@/utils/slots'
import { firstName } from '@/utils/format'

const props = defineProps({
  volunteers: { type: Array, default: () => [] },
  children: { type: Array, default: () => [] },
  editable: { type: Boolean, default: false }, // Schedule page: "+ Add" buttons and remove (x)
  busyKey: { type: String, default: null }, // while a change is saving, the buttons are disabled
})
const emit = defineEmits(['add', 'remove'])

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const TODAY = new Date().toLocaleDateString('en-US', { weekday: 'short' }) // 'Tue'

// Sat/Sun only appear when a volunteer is free or booked then.
const days = computed(() => {
  const weekend = ['Sat', 'Sun'].filter(
    (d) =>
      props.volunteers.some((v) => (v.availability || []).includes(d)) ||
      props.children.some((c) => (c.schedule || []).some((s) => s.day === d && isActive(s))),
  )
  return [...WEEKDAYS, ...weekend]
})

// { 'u_vol1|Mon': [{ child, time, pending }, ...] } built once, sorted by time (no time -> last).
// Declined requests are left out: they aren't sessions and don't hold a time.
const slotsByCell = computed(() => {
  const map = {}
  for (const child of props.children) {
    for (const s of child.schedule || []) {
      if (!isActive(s)) continue
      ;(map[`${s.volunteerId}|${s.day}`] ??= []).push({ child, time: s.time || '', pending: isPending(s) })
    }
  }
  for (const list of Object.values(map)) {
    list.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
  }
  return map
})

const slotsFor = (v, day) => slotsByCell.value[`${v.id}|${day}`] || []
const isFree = (v, day) => (v.availability || []).includes(day)

// every row is as tall as the fullest day, so all the boxes are the same size
const PILL_HEIGHT = 36 // one session pill and the space under it
const ADD_HEIGHT = 34 // the "+ Add" button (Schedule page only)
const rowHeight = computed(() => {
  let most = 0
  for (const v of props.volunteers) {
    for (const d of days.value) most = Math.max(most, isFree(v, d) ? slotsFor(v, d).length : 0)
  }
  return Math.max(84, 18 + most * PILL_HEIGHT + (props.editable ? ADD_HEIGHT : 0))
})
</script>

<template>
  <div class="wg-scroll">
    <table class="wg" data-test="schedule-table">
      <thead>
        <tr>
          <th scope="col" class="wg-vol-col">Volunteer</th>
          <th v-for="d in days" :key="d" scope="col" :class="{ 'is-today': d === TODAY }">
            {{ d }}
            <span v-if="d === TODAY" class="today-label">Today</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="v in volunteers" :key="v.id" :style="{ height: rowHeight + 'px' }" data-test="schedule-row">
          <!-- the volunteer: photo, name, subjects -->
          <th scope="row" class="wg-vol-col">
            <span class="wg-vol">
              <MiniAvatar :person="v" :size="32" />
              <span class="wg-vol-text">
                <span class="wg-vol-name">{{ firstName(v.name) }}</span>
                <span class="wg-vol-sub">{{ (v.skills || []).join(', ') || 'No subjects set' }}</span>
                <RouterLink
                  v-if="editable && !(v.availability || []).length"
                  :to="{ name: 'manage-volunteers' }"
                  class="wg-vol-sub"
                >
                  Set available days
                </RouterLink>
              </span>
            </span>
          </th>

          <td
            v-for="d in days"
            :key="d"
            :class="{ 'is-off': !isFree(v, d), 'is-today': d === TODAY }"
            :data-day="d"
            data-test="schedule-cell"
          >
            <template v-if="isFree(v, d)">
              <!-- a session: face, time, first name (click to open the child) -->
              <div
                v-for="slot in slotsFor(v, d)"
                :key="slot.child.id"
                class="wg-pill"
                :class="{ 'is-pending': slot.pending }"
                data-test="schedule-slot"
              >
                <RouterLink
                  :to="{ name: 'child-profile', params: { id: slot.child.id } }"
                  class="wg-pill-link"
                  :title="`${slot.child.name}${slot.time ? ` at ${slot.time}` : ', no time set'}${
                    slot.pending ? ` (waiting for ${firstName(v.name)} to accept)` : ''
                  }`"
                >
                  <MiniAvatar :person="slot.child" />
                  <span v-if="slot.time" class="wg-time">{{ slot.time }}</span>
                  <span v-else class="wg-time wg-no-time">No time</span>
                  <span class="wg-name">{{ firstName(slot.child.name) }}</span>
                  <span v-if="slot.pending" class="wg-pending" data-test="pending-tag">Pending</span>
                </RouterLink>
                <button
                  v-if="editable"
                  type="button"
                  class="wg-remove"
                  :disabled="busyKey !== null"
                  :aria-label="`Remove ${slot.child.name} from ${v.name} on ${d}`"
                  data-test="remove-slot"
                  @click="emit('remove', v, d, slot)"
                >
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>

              <!-- add a session: only on the Schedule page (the dashboard is read-only) -->
              <button
                v-if="editable"
                type="button"
                class="wg-add"
                :aria-label="`Add a session for ${v.name} on ${d}`"
                data-test="add-slot"
                @click="emit('add', v, d)"
              >
                <i class="bi bi-plus-lg"></i> Add
              </button>
            </template>
            <span v-else class="visually-hidden">Not available</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.wg-scroll {
  position: relative; /* keeps the hidden "Not available" labels inside the scroll box */
  overflow-x: auto; /* scrolls sideways on small screens instead of squashing */
  max-width: 100%;
  min-width: 0; /* lets the grid shrink inside the card, so only the grid scrolls, not the whole page */
}
.wg {
  width: 100%;
  min-width: 720px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-size: 14px;
}
.wg th,
.wg td {
  padding: 8px;
  vertical-align: top;
  border-top: 1px solid rgba(61, 52, 84, 0.07);
}

/* header row */
.wg thead th {
  border-top: 0;
  padding-bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7d7690;
  text-align: center;
}
.wg thead th.is-today {
  color: #6b5ca5;
  background: #f0eaf8;
  border-radius: 12px 12px 0 0;
}
.today-label {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 7px;
  border-radius: 999px;
  background: #6b5ca5;
  color: #fff;
  font-size: 10px;
  letter-spacing: 0.04em;
  vertical-align: 1px;
}

/* volunteer column */
.wg-vol-col {
  width: 170px;
  text-align: left !important;
}
.wg-vol {
  display: flex;
  align-items: center;
  gap: 10px;
}
.wg-vol-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.wg-vol-name {
  font-weight: 700;
  color: #3d3454;
}
.wg-vol-sub {
  font-size: 12px;
  font-weight: 400;
  color: #7d7690;
  line-height: 1.3;
}

/* cells: unavailable days are a flat pale fill, today's column is lavender */
.wg td.is-off {
  background: rgba(61, 52, 84, 0.035);
}
.wg td.is-today {
  background: #f0eaf8;
}
.wg td.is-today.is-off {
  background: #e9e2f3;
}

/* a session pill */
.wg-pill {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(61, 52, 84, 0.1);
}
.wg-pill-link {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  color: #3d3454;
  text-decoration: none;
}
.wg-pill-link:hover {
  box-shadow: inset 0 0 0 1.5px #d5cbea;
}
.wg-pill-link:focus-visible {
  outline: 2px solid #6b5ca5;
}
.wg-time {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.wg-no-time {
  font-weight: 600;
  font-size: 12px;
  color: #b4473b;
}
.wg-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wg-remove {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-right: 4px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #b4473b;
  font-size: 11px;
}
.wg-remove:hover:not(:disabled) {
  background: #fdf0ee;
}

/* a pending request: dashed outline instead of a shadow, until the volunteer accepts */
.wg-pill.is-pending {
  background: #fffaf0;
  box-shadow: none;
  outline: 1.5px dashed #e0b45a;
  outline-offset: -1.5px;
}
.wg-pending {
  flex-shrink: 0;
  padding: 1px 7px;
  border-radius: 999px;
  background: #fbefd2;
  color: #8a5a00;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* "+ Add": dashed, so it reads as a space to fill rather than a session */
.wg-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  padding: 4px;
  border: 1.5px dashed #d5cbea;
  border-radius: 999px;
  background: transparent;
  color: #6b5ca5;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.wg-add:hover {
  background: #fff;
  border-color: #6b5ca5;
}
.wg-add:focus-visible {
  outline: 2px solid #6b5ca5;
}
</style>