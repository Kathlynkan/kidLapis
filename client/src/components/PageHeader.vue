<!-- Page title + optional buttons on the right (and an optional picture before the title: the "lead" slot) -->
<script setup>
import '@/css/main/components.css' // the look of the small parts
defineProps({
  title:    { type: String, required: true },
  subtitle: String,
})
</script>

<template>
  <div class="lapis-page-header d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
    <div class="d-flex align-items-center gap-3">
      <slot name="lead"></slot>
      <div>
        <h1 class="page-title mb-1">{{ title }}</h1>
        <p v-if="subtitle" class="page-subtitle mb-0">{{ subtitle }}</p>
      </div>
    </div>
    <div class="d-flex flex-wrap gap-2">
      <slot></slot>
    </div>
  </div>
</template>
