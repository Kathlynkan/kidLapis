<!-- KPI number card — e.g. on the coordinator dashboard -->
<script setup>
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

<style scoped>
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  box-shadow: 0 1px 3px rgba(74, 63, 58, 0.10);
  flex-shrink: 0;
}

.stat-icon[data-color='pink']   { background: var(--lapis-pink);   color: var(--lapis-cream); border: 1px solid var(--lapis-pink-dark); }
.stat-icon[data-color='lime']   { background: var(--lapis-lime);   color: var(--lapis-plum);  border: 1px solid var(--lapis-lime-dark); }
.stat-icon[data-color='yellow'] { background: var(--lapis-yellow); color: var(--lapis-plum);  border: 1px solid var(--lapis-yellow-dark); }
.stat-icon[data-color='orange'] { background: var(--lapis-orange); color: var(--lapis-plum);  border: 1px solid var(--lapis-orange-dark); }
.stat-icon[data-color='purple'] { background: var(--lapis-purple); color: var(--lapis-cream); border: 1px solid var(--lapis-purple-dark); }

.stat-value {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  font-size: 1.75rem;
  color: var(--lapis-plum);
  line-height: 1;
}

.stat-label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--lapis-muted);
}

.stat-hint {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--lapis-muted);
}
</style>
