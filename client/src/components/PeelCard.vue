<!-- PeelCard — collapsible card using grid-template-rows: 0fr → 1fr.
     Header has a kueh gradient surface. Arrow springs 180° when open.
     Pass :open + @toggle for controlled (accordion) mode; omit for self-managed. -->
<script setup>
import { ref, computed } from 'vue'
import '@/css/main/components.css' // the look of the small parts

const props = defineProps({
  title:       { type: String,  required: true },
  icon:        { type: String,  default: '' },
  initialOpen: { type: Boolean, default: true },
  open:        { type: Boolean, default: undefined }, // controlled mode
})
const emit = defineEmits(['toggle'])

const localOpen = ref(props.initialOpen)
const isOpen = computed(() => props.open !== undefined ? props.open : localOpen.value)

function toggle() {
  if (props.open !== undefined) emit('toggle')
  else localOpen.value = !localOpen.value
}
</script>

<template>
  <div class="peel-card lapis-card mb-4" :class="{ 'peel-card--open': isOpen }">
    <button
      type="button"
      class="peel-header"
      :aria-expanded="String(isOpen)"
      @click="toggle"
    >
      <span class="peel-title">
        <i v-if="icon" class="bi me-2" :class="icon"></i>{{ title }}
      </span>
      <i class="bi bi-chevron-down peel-arrow" :class="{ 'peel-arrow--open': isOpen }" />
    </button>

    <div class="peel-body" :class="{ 'peel-body--open': isOpen }">
      <div class="peel-body-inner">
        <slot />
      </div>
    </div>
  </div>
</template>
