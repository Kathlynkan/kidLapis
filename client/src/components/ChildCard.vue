<!-- =============================================================
  ChildCard - one child in a list.                 Owner: Yuqi
============================================================= -->
<script setup>
import { computed } from 'vue'
import { relativeDay, accuracy } from '@/utils/format'

const props = defineProps({
  child:          { type: Object, required: true },
  lastSession:    { type: Object, default: null },
  needsAttention: { type: Boolean, default: false },
})
const emit = defineEmits(['open'])

const lastSeen = computed(() =>
  props.lastSession ? relativeDay(props.lastSession.date) : 'Never'
)
</script>

<template>
  <div
    class="cb-card cb-card-pink cb-card-hover cb-card-top p-3 h-100 d-flex flex-column"
    role="button"
    data-test="child-card"
    @click="emit('open', child.id)"
  >
    <div class="d-flex align-items-center gap-3 mb-3">
      <span class="avatar">{{ child.avatar }}</span>
      <div style="min-width: 0">
        <h2 class="h5 mb-0" style="text-shadow:none">{{ child.name }}</h2>
        <div class="small" style="color:var(--cb-muted)">{{ child.level }} &middot; {{ child.school }}</div>
        <span
          v-if="needsAttention"
          class="badge mt-1"
          style="background:var(--lapis-orange);color:var(--lapis-plum)"
          data-test="needs-attention"
        >
          <i class="bi bi-exclamation-triangle me-1"></i>Needs attention
        </span>
      </div>
    </div>

    <div v-if="lastSession" class="small mb-3" style="color:var(--lapis-plum)">
      <div>
        <i class="bi bi-bookmark me-1" style="color:var(--lapis-purple)"></i>Last topic:
        <strong>{{ lastSession.subject }} - {{ lastSession.topic }}</strong>
      </div>
      <div>
        <i class="bi bi-check2-circle me-1" style="color:var(--lapis-lime)"></i>Last result:
        {{ lastSession.correct }}/{{ lastSession.attempted }} ({{ accuracy(lastSession) }}%)
      </div>
    </div>
    <div v-else class="small mb-3" style="color:var(--cb-muted)">No sessions recorded yet.</div>

    <div class="mt-auto d-flex justify-content-between align-items-center">
      <span
        class="badge"
        style="background:var(--lapis-lime);color:var(--lapis-plum)"
      >Last session: {{ lastSeen }}</span>
      <i class="bi bi-arrow-right-circle fs-5" style="color:var(--lapis-pink)"></i>
    </div>
  </div>
</template>
