<!-- =============================================================
  HandoverCard - "Today's Handover" box.             Owner: Yuqi
============================================================= -->
<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  handover: { type: Object, default: null },
  loading:  { type: Boolean, default: false },
  title:    { type: String, default: "Today's Handover" },
  audience: { type: String, default: 'volunteer' },
})

const VOLUNTEER_ROWS = [
  { key: 'continueTopic', label: 'Continue',       icon: 'bi-arrow-right-circle' },
  { key: 'struggle',      label: 'Last Struggle',  icon: 'bi-exclamation-circle' },
  { key: 'whatWorked',    label: 'What worked',    icon: 'bi-lightbulb' },
  { key: 'lastResult',    label: 'Last session',   icon: 'bi-check2-square' },
  { key: 'nextStep',      label: 'Next step',      icon: 'bi-flag' },
]

const PARENT_ROWS = [
  { key: 'continueTopic', label: 'Working on',     icon: 'bi-book' },
  { key: 'struggle',      label: 'Finding tricky', icon: 'bi-emoji-neutral' },
  { key: 'whatWorked',    label: 'What helped',    icon: 'bi-lightbulb' },
  { key: 'lastResult',    label: 'Latest score',   icon: 'bi-star' },
  { key: 'nextStep',      label: 'Coming up next', icon: 'bi-flag' },
]

const rows = computed(() => props.audience === 'parent' ? PARENT_ROWS : VOLUNTEER_ROWS)

const recurringLabel = computed(() =>
  props.audience === 'parent' ? 'Keep practising' : 'Recurring Struggles'
)

const open = ref(true)
</script>

<template>
  <div class="cb-card cb-card-blue handover-card" data-test="handover-card">
    <button type="button" class="handover-header" :aria-expanded="String(open)" @click="open = !open">
      <div class="d-flex flex-wrap align-items-center gap-2">
        <h2 class="handover-title mb-0">
          <i class="bi bi-arrow-left-right me-2"></i>{{ title }}
        </h2>
        <span
          v-if="handover"
          class="badge handover-badge"
          :style="handover.source === 'ai'
            ? 'background:var(--lapis-purple);color:var(--lapis-cream)'
            : 'background:var(--lapis-lime);color:var(--lapis-plum)'"
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
          {{ audience === 'parent' ? 'Getting the update...' : 'Preparing handover...' }}
        </div>

        <dl v-else-if="handover" class="row mb-0">
          <template v-for="row in rows" :key="row.key">
            <dt class="col-12 col-sm-4 small handover-key">
              <i class="bi me-1" :class="row.icon"></i>{{ row.label }}
            </dt>
            <dd class="col-12 col-sm-8 fw-semibold handover-value" style="color:var(--lapis-plum)">
              {{ handover[row.key] }}
            </dd>
          </template>

          <template v-if="handover.recurring && handover.recurring.length > 0">
            <dt class="col-12 col-sm-4 small handover-key">
              <i class="bi bi-arrow-repeat me-1"></i>{{ recurringLabel }}
            </dt>
            <dd class="col-12 col-sm-8 handover-value">
              <span
                v-for="item in handover.recurring"
                :key="item"
                class="badge handover-badge me-1 mb-1"
                style="background:var(--lapis-yellow);color:var(--lapis-plum)"
                data-test="recurring-badge"
              >{{ item }}</span>
            </dd>
          </template>
        </dl>

        <p v-else class="small text-muted-cb mb-0">No handover available yet.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.handover-card {
  border-left: 6px solid var(--topic-academic);
  padding: 0;
  overflow: hidden;
}

.handover-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem 0.75rem;
  background: linear-gradient(160deg, var(--lapis-cream) 0%, rgba(68, 144, 184, 0.08) 100%);
  border: none;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid transparent;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.handover-card .peel-body--open ~ * .handover-header,
.handover-header:hover {
  background: linear-gradient(160deg, var(--lapis-cream) 0%, rgba(68, 144, 184, 0.15) 100%);
}

.peel-body--open + * .handover-header,
.handover-card:has(.peel-body--open) .handover-header {
  border-bottom-color: var(--lapis-cream-dark);
}

.handover-header:has(+ .peel-body--open),
.peel-body--open .handover-header {
  border-bottom-color: var(--lapis-cream-dark);
}

/* separator line appears when open */
.handover-card:has(.peel-body--open) .handover-header {
  border-bottom: 3px solid var(--lapis-cream-dark);
}

.peel-arrow {
  color: var(--lapis-purple);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
}

.peel-arrow--open { transform: rotate(-180deg); }

/* accordion body */
.peel-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.peel-body--open { grid-template-rows: 1fr; }

.peel-body-inner {
  overflow: hidden;
  padding: 1.25rem;
  transform: translateY(-6px);
  opacity: 0;
  transition:
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s ease;
}

.peel-body--open .peel-body-inner {
  transform: translateY(0);
  opacity: 1;
}

.handover-badge {
  white-space: normal;
  max-width: 100%;
  text-align: left;
  overflow-wrap: anywhere;
}

.handover-value {
  overflow-wrap: anywhere;
  margin-bottom: 0.6rem;
}

.handover-title {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--lapis-plum);
}

.handover-key {
  color: var(--cb-muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.72rem;
}

.loading-msg {
  color: var(--cb-muted);
  font-weight: 600;
  font-size: 0.9rem;
}
</style>
