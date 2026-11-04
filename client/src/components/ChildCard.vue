<!-- =============================================================
  ChildCard - one child in a list.                 Owner: Yuqi
  Its styles are in the style block of views/volunteer/VolunteerHomeView.vue
============================================================= -->
<script setup>
import { computed } from 'vue'
import { relativeDay, accuracy, subjectStyle } from '@/utils/format'
import '@/css/main/components.css' // the subject tag
import ChildInitial from '@/components/ChildInitial.vue'

const props = defineProps({
  child:       { type: Object, required: true },
  lastSession: { type: Object, default: null },
  badge:       { type: String, default: '' }, // e.g. 'Session recorded', 'First session', 'Starts Mon, 9 Nov'
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
        <span v-if="badge" class="child-badge" data-test="child-badge">{{ badge }}</span>
      </div>
    </div>

    <div v-if="lastSession" class="child-facts">
      <div class="fact-caption">Last topic</div>
      <div class="fact-topic">
        <strong>{{ lastSession.topic }}</strong>
        <span class="session-subject" :style="subjectStyle(lastSession.subject)">{{ lastSession.subject }}</span>
      </div>
      <div>
        Last result: {{ lastSession.correct }}/{{ lastSession.attempted }} ({{ accuracy(lastSession) }}%)
      </div>
    </div>
    <div v-else class="child-facts muted">No sessions recorded yet.</div>

    <div class="child-bottom">
      <span class="last-seen">Last Session: {{ lastSeen }}</span>
      <i class="bi bi-arrow-right-circle child-arrow"></i>
    </div>
  </div>
</template>