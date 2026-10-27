<!-- Page title + optional buttons on the right -->
<script setup>
defineProps({
  title:    { type: String, required: true },
  subtitle: String,
})
</script>

<template>
  <div class="lapis-page-header d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
    <div>
      <h1 class="page-title mb-1">{{ title }}</h1>
      <p v-if="subtitle" class="page-subtitle mb-0">{{ subtitle }}</p>
    </div>
    <div class="d-flex flex-wrap gap-2">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.lapis-page-header {
  padding: 1.25rem 0 0.5rem;
}

.page-title {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  font-size: 2rem;
  color: var(--lapis-plum);
  letter-spacing: -0.02em;
}

.page-subtitle {
  color: var(--lapis-muted);
  font-weight: 600;
  font-size: 0.95rem;
}
</style>
