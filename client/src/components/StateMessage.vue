<!-- Loading / error / empty states in one component -->
<script setup>
import '@/css/main/components.css' // the look of the small parts
defineProps({
  type:    { type: String, default: 'empty' }, // 'loading' | 'error' | 'empty'
  message: String,
})
</script>

<template>
  <!-- Loading -->
  <div v-if="type === 'loading'" class="lapis-state text-center py-5">
    <div class="lapis-state-strips mb-3" aria-hidden="true">
      <div class="state-strip state-strip-pink"></div>
      <div class="state-strip state-strip-lime"></div>
      <div class="state-strip state-strip-yellow"></div>
    </div>
    <div class="spinner-border mb-2 state-spinner" role="status"></div>
    <div class="state-msg">{{ message || 'Loading...' }}</div>
  </div>

  <!-- Error -->
  <div v-else-if="type === 'error'" class="alert alert-danger" role="alert">
    <i class="bi bi-exclamation-triangle me-2"></i>{{ message }}
  </div>

  <!-- Empty -->
  <div v-else class="lapis-card lapis-state lapis-state-empty text-center py-5 px-3">
    <div class="lapis-state-strips mb-3" aria-hidden="true">
      <div class="state-strip state-strip-pink"></div>
      <div class="state-strip state-strip-lime"></div>
      <div class="state-strip state-strip-yellow"></div>
      <div class="state-strip state-strip-orange"></div>
    </div>
    <i class="bi bi-inbox fs-2 d-block mb-2 state-icon"></i>
    <div class="state-msg">{{ message || 'Nothing here yet.' }}</div>
    <div class="mt-2"><slot></slot></div>
  </div>
</template>
