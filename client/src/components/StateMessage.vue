<script setup>
import '@/css/main/components.css' // the look of the small parts
defineProps({
  type:    { type: String, default: 'empty' }, // 'loading' | 'error' | 'empty'
  message: String,
})
</script>

<template>
  <!-- Loading -->
  <div v-if="type === 'loading'" class="lapis-state text-center py-5" role="status">
    <div class="state-ring" aria-hidden="true"></div>
    <div class="state-msg">{{ message || 'Loading...' }}</div>
  </div>

  <!-- Error -->
  <div v-else-if="type === 'error'" class="state-error" role="alert">
    <i class="bi bi-exclamation-triangle"></i>{{ message }}
  </div>

  <!-- Empty -->
  <div v-else class="state-empty">
    <div class="state-icon"><i class="bi bi-inbox"></i></div>
    <div class="state-msg">{{ message || 'Nothing here yet.' }}</div>
    <div class="mt-2"><slot></slot></div>
  </div>
</template>
