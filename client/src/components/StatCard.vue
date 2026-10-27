<!-- KPI number card — e.g. on the coordinator dashboard -->
<script setup>
import '@/css/main/components.css' // the look of the small parts
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  icon:  { type: String, default: 'bi-bar-chart' },
  hint:  String,
  color: { type: String, default: 'pink' }, // pink | lime | yellow | orange | purple
})
</script>

<template>
  <div class="lapis-card lapis-card-hover lapis-card-top p-3 h-100 d-flex align-items-center gap-3" :class="`lapis-card-${color}`">
    <div class="stat-icon" :data-color="color">
      <i class="bi" :class="icon"></i>
    </div>
    <div>
      <div class="stat-value">{{ value }}</div>
      <div class="stat-label">{{ label }}</div>
      <div v-if="hint" class="stat-hint">{{ hint }}</div>
    </div>
  </div>
</template>
