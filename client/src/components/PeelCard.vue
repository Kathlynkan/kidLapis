<!-- PeelCard — collapsible card using grid-template-rows: 0fr → 1fr.
     Header has a kueh gradient surface. Arrow springs 180° when open. -->
<script setup>
import { ref } from 'vue'

const props = defineProps({
  title:       { type: String,  required: true },
  icon:        { type: String,  default: '' },
  initialOpen: { type: Boolean, default: true },
})

const open = ref(props.initialOpen)
</script>

<template>
  <div class="peel-card lapis-card mb-4" :class="{ 'peel-card--open': open }">
    <button
      type="button"
      class="peel-header"
      :aria-expanded="String(open)"
      @click="open = !open"
    >
      <span class="peel-title">
        <i v-if="icon" class="bi me-2" :class="icon"></i>{{ title }}
      </span>
      <i class="bi bi-chevron-down peel-arrow" :class="{ 'peel-arrow--open': open }" />
    </button>

    <div class="peel-body" :class="{ 'peel-body--open': open }">
      <div class="peel-body-inner">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.peel-card {
  overflow: hidden;
  padding: 0;
}

/* Header uses the lapis strip as a background strip at the top
   (already handled by .lapis-card::before) then cream body */
.peel-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
  padding-top: 1rem;
  background: linear-gradient(
    160deg,
    var(--lapis-cream) 0%,
    rgba(168, 224, 99, 0.08) 100%
  );
  border: none;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid transparent;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.peel-card--open .peel-header {
  border-bottom-color: var(--lapis-cream-dark);
  border-bottom-width: 3px;
  border-bottom-style: solid;
}

.peel-header:hover {
  background: linear-gradient(
    160deg,
    var(--lapis-cream) 0%,
    rgba(255, 217, 61, 0.15) 100%
  );
}

.peel-title {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--lapis-plum);
}

.peel-arrow {
  color: var(--lapis-purple);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
}

.peel-arrow--open { transform: rotate(-180deg); }

/* Accordion: 0fr → 1fr */
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
</style>
