<!-- PeelCard — collapsible card using grid-template-rows: 0fr → 1fr.
     Header has a kueh gradient surface. Arrow springs 180° when open. -->
<script setup>
import { ref } from 'vue'
import '@/css/main/components.css' // the look of the small parts

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
