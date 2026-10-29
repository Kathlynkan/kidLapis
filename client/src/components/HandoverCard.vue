<!-- =============================================================
  HandoverCard - "Today's Handover" box.             Owner: Yuqi
  The look for a volunteer is in css/volunteer/childprofilepage.css
============================================================= -->
<script setup>
import { ref } from 'vue'
import '@/css/main/components.css' // the look of the small parts

defineProps({
  handover: { type: Object, default: null },
  loading:  { type: Boolean, default: false },
})

const ROWS = [
  { key: 'continueTopic', label: 'Continue',       icon: 'bi-arrow-right-circle' },
  { key: 'struggle',      label: 'Last Struggle',  icon: 'bi-exclamation-circle' },
  { key: 'whatWorked',    label: 'What worked',    icon: 'bi-lightbulb' },
  { key: 'lastResult',    label: 'Last session',   icon: 'bi-check2-square' },
  { key: 'nextStep',      label: 'Next step',      icon: 'bi-flag' },
]

const open = ref(true)
</script>

<template>
  <div class="lapis-card lapis-card-blue handover-card" data-test="handover-card">
    <button type="button" class="handover-header" :aria-expanded="String(open)" @click="open = !open">
      <div class="d-flex flex-wrap align-items-center gap-2">
        <h2 class="handover-title mb-0">
          <i class="bi bi-arrow-left-right me-2"></i>Today's Handover
        </h2>
        <span
          v-if="handover"
          class="badge handover-badge"
          :class="handover.source === 'ai' ? 'handover-source-ai' : 'handover-source-last'"
        >
          {{ handover.source === 'ai' ? 'AI summary' : 'From last session' }}
        </span>
      </div>
      <i class="bi bi-chevron-down peel-arrow" :class="{ 'peel-arrow--open': open }" />
    </button>

    <div class="peel-body" :class="{ 'peel-body--open': open }">
      <div class="peel-body-inner">
        <div v-if="loading" class="loading-msg">
          <span class="spinner-border spinner-border-sm me-2"></span>
          Preparing handover...
        </div>

        <dl v-else-if="handover" class="row mb-0">
          <template v-for="row in ROWS" :key="row.key">
            <dt class="col-12 col-sm-4 small handover-key">
              <i class="bi me-1" :class="row.icon"></i>{{ row.label }}
            </dt>
            <dd class="col-12 col-sm-8 fw-semibold handover-value">
              {{ handover[row.key] }}
            </dd>
          </template>

          <template v-if="handover.recurring && handover.recurring.length > 0">
            <dt class="col-12 col-sm-4 small handover-key">
              <i class="bi bi-arrow-repeat me-1"></i>Recurring Struggles
            </dt>
            <dd class="col-12 col-sm-8 handover-value">
              <span
                v-for="item in handover.recurring"
                :key="item"
                class="badge handover-badge handover-tag me-1 mb-1"
                data-test="recurring-badge"
              >{{ item }}</span>
            </dd>
          </template>
        </dl>

        <p v-else class="small lapis-muted mb-0">No handover available yet.</p>
      </div>
    </div>
  </div>
</template>
