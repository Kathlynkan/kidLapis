<!-- =============================================================
  ChildCard - one child in a list.                 Owner: Yuqi
  Its styles are in css/volunteer/volunteerpage.css
============================================================= -->
<script setup>
import { computed } from 'vue'
import { relativeDay, accuracy } from '@/utils/format'
import ChildInitial from '@/components/ChildInitial.vue'

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
  <div class="child-card" role="button" data-test="child-card" @click="emit('open', child.id)">
    <div class="child-top">
      <ChildInitial :child="child" />
      <div>
        <h2 class="child-name">{{ child.name }}</h2>
        <div class="muted">{{ child.level }} &middot; {{ child.school }}</div>
        <span v-if="needsAttention" class="needs-attention" data-test="needs-attention">
          <i class="bi bi-exclamation-triangle me-1"></i>Needs attention
        </span>
      </div>
    </div>

    <div v-if="lastSession" class="child-facts">
      <div>
        <i class="bi bi-bookmark"></i>Last topic:
        <strong>{{ lastSession.subject }} - {{ lastSession.topic }}</strong>
      </div>
      <div>
        <i class="bi bi-check2-circle"></i>Last result:
        {{ lastSession.correct }}/{{ lastSession.attempted }} ({{ accuracy(lastSession) }}%)
      </div>
    </div>
    <div v-else class="child-facts muted">No sessions recorded yet.</div>

    <div class="child-bottom">
      <span class="last-seen">Last session: {{ lastSeen }}</span>
      <i class="bi bi-arrow-right-circle child-arrow"></i>
    </div>
  </div>
</template>
