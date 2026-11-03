<!-- =============================================================
  HandoverCard - the AI summary box.                  Owner: Yuqi
    volunteer / coordinator (ChildProfileView) -> "Handover Notes" for the next session
    parent (ParentHomeView)                -> the weekly summary 
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

const auth = useAuthStore()

const VOLUNTEER_ROWS = [
  { key: 'nextStep',   label: 'Teach Next', icon: 'bi-flag' },
  { key: 'struggle',   label: 'Why',        icon: 'bi-question-circle' },
  { key: 'lastResult', label: 'Progress',   icon: 'bi-graph-up-arrow' },
  { key: 'whatWorked', label: 'What Helps', icon: 'bi-lightbulb' },
  { key: 'watchFor',   label: 'Mood',       icon: 'bi-emoji-smile' },
]

// weekly summary (Mon - Fri, learning + social)
const PARENT_ROWS = [
  { key: 'headline',     label: 'Overview',      icon: 'bi-calendar-week' },
  { key: 'learning',     label: 'Learning',      icon: 'bi-book' },
  { key: 'friends',      label: 'Friends',       icon: 'bi-people' },
  { key: 'worthKnowing', label: 'Worth Knowing', icon: 'bi-info-circle' },
  { key: 'celebrate',    label: 'Proud Moment',  icon: 'bi-trophy' },
  { key: 'atHome',       label: 'Try at Home',   icon: 'bi-house-heart' },
]

// a parent sees the weekly summary, everyone else sees the handover note
const isParent = computed(() => auth.role === 'parent')

// the rows to show
const rows = computed(() => (isParent.value ? PARENT_ROWS : VOLUNTEER_ROWS))

// the title: 'Handover Notes', or e.g. 'Last week at student care'
const title = computed(() => {
  if (!isParent.value) return 'Handover Notes'
  let week = 'This Week'
  if (props.handover && props.handover.weekTitle) {
    week = props.handover.weekTitle // 'This week', 'Last week' or 'Latest week'
  }
  return `${week} at Student Care`
})

// the small badge next to the title
const sourceText = computed(() => {
  if (props.handover && props.handover.source === 'ai') return 'AI summary'
  return isParent.value ? 'From the session notes' : 'From last session'
})

const loadingText = computed(() => (isParent.value ? 'Getting the update...' : 'Preparing handover...'))
const emptyText = computed(() => (isParent.value ? 'No summary yet.' : 'No handover available yet.'))

const open = ref(true)
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
        <div v-if="loading" class="loading-msg">
          <span class="spinner-border spinner-border-sm me-2"></span>
          {{ loadingText }}
        </div>

        <dl v-else-if="handover" class="row mb-0">
          <template v-for="row in rows" :key="row.key">
            <!-- skip a row with nothing to say -->
            <template v-if="handover[row.key] && handover[row.key] !== '-'">
              <dt class="col-12 col-sm-4 small handover-key">
                <i class="bi me-1" :class="row.icon"></i>{{ row.label }}
              </dt>
              <dd class="col-12 col-sm-8 fw-semibold handover-value">
                {{ handover[row.key] }}
              </dd>
            </template>
          </template>
        </dl>

        <p v-else class="small lapis-muted mb-0">{{ emptyText }}</p>
      </div>
    </div>
  </div>
</template>