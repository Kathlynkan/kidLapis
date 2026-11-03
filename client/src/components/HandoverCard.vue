<!-- =============================================================
  HandoverCard - the AI summary box.                  Owner: Yuqi
    volunteer / coordinator (ChildProfileView) -> "Handover Notes" for the next session
    parent (ParentHomeView)                -> the weekly summary, with arrows to look at earlier weeks
                                              (the card sends 'change-week' and ParentHomeView loads that week)
  (the server also picks the summary by role, so both always match)
============================================================= -->
<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth' // the logged-in user
import '@/css/main/components.css' // the look of the small parts

const props = defineProps({
  handover: { type: Object, default: null },
  loading:  { type: Boolean, default: false },
})

const emit = defineEmits(['change-week']) // e.g. emit('change-week', '2026-10-19')

const auth = useAuthStore()

const VOLUNTEER_ROWS = [
  { key: 'nextStep',   label: 'Teach next', icon: 'bi-flag' },
  { key: 'struggle',   label: 'Why',        icon: 'bi-question-circle' },
  { key: 'lastResult', label: 'Progress',   icon: 'bi-graph-up-arrow' },
  { key: 'whatWorked', label: 'What helps', icon: 'bi-lightbulb' },
  { key: 'watchFor',   label: 'Mood',       icon: 'bi-emoji-smile' },
]

// weekly summary (Mon - Fri, learning + social)
const PARENT_ROWS = [
  { key: 'headline',     label: 'Overview',      icon: 'bi-calendar-week' },
  { key: 'learning',     label: 'Learning',      icon: 'bi-book' },
  { key: 'friends',      label: 'Friends',       icon: 'bi-people' },
  { key: 'worthKnowing', label: 'Worth knowing', icon: 'bi-info-circle' },
  { key: 'celebrate',    label: 'Proud moment',  icon: 'bi-trophy' },
  { key: 'atHome',       label: 'Try at home',   icon: 'bi-house-heart' },
]

// a parent sees the weekly summary, everyone else sees the handover note
const isParent = computed(() => auth.role === 'parent')

// the rows to show
const rows = computed(() => (isParent.value ? PARENT_ROWS : VOLUNTEER_ROWS))

// the title: 'Handover Notes', or e.g. 'Last week at student care'
const title = computed(() => {
  if (!isParent.value) return 'Handover Notes'
  let week = 'This week'
  if (props.handover && props.handover.weekTitle) {
    week = props.handover.weekTitle // 'This week', 'Last week' or 'Latest week'
  }
  return `${week} at student care`
})

// the small badge next to the title
const sourceText = computed(() => {
  if (props.handover && props.handover.source === 'ai') return 'AI summary'
  return isParent.value ? 'From the session notes' : 'From last session'
})

const loadingText = computed(() => (isParent.value ? 'Getting the update...' : 'Preparing handover...'))
const emptyText = computed(() => (isParent.value ? 'No summary yet.' : 'No handover available yet.'))

const open = ref(true)

// ---------- parents: step through the weeks that have sessions ----------
// handover.weeks = ['2026-10-26', '2026-10-19', ...] (Mondays, newest first, at most 8)
// handover.weekStart = the Monday of the week shown
const weekList = computed(() => {
  if (!isParent.value || !props.handover || !props.handover.weeks) return []
  return props.handover.weeks
})
const weekIndex = computed(() => weekList.value.indexOf(props.handover?.weekStart))

// the week before the one shown ('' if this is the oldest)
const earlierWeek = computed(() => {
  if (weekIndex.value < 0) return ''
  return weekList.value[weekIndex.value + 1] || ''
})

// the week after the one shown ('' if this is the newest)
const laterWeek = computed(() => {
  if (weekIndex.value <= 0) return ''
  return weekList.value[weekIndex.value - 1]
})
</script>

<template>
  <div
    class="lapis-card lapis-card-blue handover-card"
    :class="{ 'handover-card--open': open, 'handover-card--parent': isParent }"
    data-test="handover-card"
  >
    <button type="button" class="handover-header" :aria-expanded="String(open)" @click="open = !open">
      <div>
        <div class="d-flex flex-wrap align-items-center gap-2">
          <h2 class="handover-title mb-0">
            <i class="bi me-2" :class="isParent ? 'bi-calendar-week' : 'bi-arrow-left-right'"></i>{{ title }}
          </h2>
          <span
            v-if="handover"
            class="badge handover-badge"
            :class="handover.source === 'ai' ? 'handover-source-ai' : 'handover-source-last'"
          >
            {{ sourceText }}
          </span>
        </div>
        <!-- parents: which week it covers, e.g. Mon 26 Oct to Fri 30 Oct -->
        <div v-if="isParent && handover && handover.periodLabel" class="handover-period">
          {{ handover.periodLabel }}
        </div>
      </div>
      <i class="bi bi-chevron-down peel-arrow" :class="{ 'peel-arrow--open': open }" />
    </button>

    <div class="peel-body" :class="{ 'peel-body--open': open }">
      <div class="peel-body-inner">
        <!-- parents: earlier / later week (only weeks with sessions, so a holiday is skipped) -->
        <div v-if="weekList.length > 1" class="handover-week-nav" data-test="week-nav">
          <button
            type="button"
            class="handover-week-button"
            :disabled="!earlierWeek || loading"
            data-test="week-earlier"
            @click="emit('change-week', earlierWeek)"
          >
            <i class="bi bi-chevron-left me-1"></i>Earlier week
          </button>
          <button
            type="button"
            class="handover-week-button"
            :disabled="!laterWeek || loading"
            data-test="week-later"
            @click="emit('change-week', laterWeek)"
          >
            Later week<i class="bi bi-chevron-right ms-1"></i>
          </button>
        </div>

        <div v-if="loading" class="loading-msg">
          <span class="spinner-border spinner-border-sm me-2"></span>
          {{ loadingText }}
        </div>

        <!-- parents: why an older week is shown, e.g. 'No sessions since Wed 14 Oct. ...' -->
        <p v-if="!loading && isParent && handover && handover.awayNote" class="handover-away" data-test="away-note">
          <i class="bi bi-info-circle me-1"></i>{{ handover.awayNote }}
        </p>

        <dl v-if="!loading && handover" class="row mb-0">
          <template v-for="row in rows" :key="row.key">
            <!-- skip a row with nothing to say -->
            <template v-if="handover[row.key] && handover[row.key] !== '-'">
              <dt class="col-12 col-sm-3 col-lg-2 small handover-key">
                <i class="bi me-1" :class="row.icon"></i>{{ row.label }}
              </dt>
              <dd class="col-12 col-sm-9 col-lg-10 fw-semibold handover-value">
                {{ handover[row.key] }}
              </dd>
            </template>
          </template>
        </dl>

        <p v-if="!loading && !handover" class="small lapis-muted mb-0">{{ emptyText }}</p>
      </div>
    </div>
  </div>
</template>

<style>
/* parents: the earlier / later week buttons at the top of the summary */
.handover-week-nav {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
}

.handover-week-button {
  padding: 4px 14px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  color: inherit;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
}

.handover-week-button:hover:not(:disabled) {
  background: #FFFFFF;
}

/* no earlier / later week: still there (so the buttons don't jump), but faded */
.handover-week-button:disabled {
  opacity: 0.4;
}

/* 'No sessions since ...' */
.handover-away {
  margin-bottom: 12px;
  font-size: 14px;
}
</style>