<!-- Loading / error / empty states in one component -->
<script setup>
defineProps({
  type:    { type: String, default: 'empty' }, // 'loading' | 'error' | 'empty'
  message: String,
})
</script>

<template>
  <!-- Loading -->
  <div v-if="type === 'loading'" class="lapis-state text-center py-5">
    <div class="lapis-state-strips mb-3" aria-hidden="true">
      <div class="state-strip" style="background:var(--lapis-pink)"></div>
      <div class="state-strip" style="background:var(--lapis-lime)"></div>
      <div class="state-strip" style="background:var(--lapis-yellow)"></div>
    </div>
    <div class="spinner-border mb-2" role="status" style="color:var(--lapis-pink)"></div>
    <div class="state-msg">{{ message || 'Loading...' }}</div>
  </div>

  <!-- Error -->
  <div v-else-if="type === 'error'" class="alert alert-danger" role="alert">
    <i class="bi bi-exclamation-triangle me-2"></i>{{ message }}
  </div>

  <!-- Empty -->
  <div v-else class="cb-card lapis-state text-center py-5 px-3" style="padding-top: 2rem !important;">
    <div class="lapis-state-strips mb-3" aria-hidden="true">
      <div class="state-strip" style="background:var(--lapis-pink)"></div>
      <div class="state-strip" style="background:var(--lapis-lime)"></div>
      <div class="state-strip" style="background:var(--lapis-yellow)"></div>
      <div class="state-strip" style="background:var(--lapis-orange)"></div>
    </div>
    <i class="bi bi-inbox fs-2 d-block mb-2" style="color:var(--lapis-purple)"></i>
    <div class="state-msg">{{ message || 'Nothing here yet.' }}</div>
    <div class="mt-2"><slot></slot></div>
  </div>
</template>

<style scoped>
.lapis-state { color: var(--lapis-plum); }

/* Stack of kueh strips as the illustration */
.lapis-state-strips {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.state-strip {
  width: 80px;
  height: 8px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(74, 63, 58, 0.10);
}

.state-msg {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--cb-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>
