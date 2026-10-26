<!-- =============================================================
  ParentSessionCard - the session card from the whiteboard design.   Owner: Kat
  Left: a picture (with < > arrows when there is more than one photo).
  Right: the academic details of the session: subject, score, what helped and the next step.
  (The social side of a session is in ParentSocialDay.vue.)
  Props:  session (Object), child (Object)
  Its styles are in assets/parentpage.css
============================================================= -->
<script setup>
import { ref, computed } from 'vue' // ref = a box that holds a value, computed = a value worked out from other values
import { formatDate, accuracy } from '@/utils/format' // small helpers for dates, scores and names

const props = defineProps({
  session: { type: Object, required: true },
  child: { type: Object, required: true },
})

// the photos of the session (none yet, the session form will add them later)
const photos = computed(() => props.session.photos || [])
const photoNumber = ref(0) // which photo we are showing

// the < and > arrows go round the photos
function nextPhoto(step) {
  photoNumber.value = (photoNumber.value + step + photos.value.length) % photos.value.length
}
</script>

<template>
  <div class="parent-session-card kind-academic" data-test="parent-session-card">
    <!-- left: the picture -->
    <div class="session-pic">
      <button v-if="photos.length > 1" type="button" class="pic-arrow" aria-label="Previous photo" @click="nextPhoto(-1)">&lt;</button>
      <img v-if="photos.length > 0" :src="photos[photoNumber]" alt="Photo from the session" />
      <!-- the empty picture box: the photos from the session form go here -->
      <div v-else class="pic-empty">
        <span class="fs-1">{{ child.avatar }}</span>
        <small>No photos yet</small>
      </div>
      <button v-if="photos.length > 1" type="button" class="pic-arrow" aria-label="Next photo" @click="nextPhoto(1)">&gt;</button>
    </div>

    <!-- right: the details -->
    <div class="session-info">
      <div>
        <h3 class="h5 mb-0">{{ session.subject }}: {{ session.topic }}</h3>
        <div class="small text-muted-cb mb-2">{{ formatDate(session.date) }}</div>

        <!-- the details: the AI summary if the page gives one, otherwise the plain details -->
        <div class="session-details">
          <slot name="academic-extra">
            <div>Got {{ session.correct }} out of {{ session.attempted }} right ({{ accuracy(session) }}%)</div>
            <div v-if="session.struggles && session.struggles.length">A bit tricky: {{ session.struggles.join(', ') }}</div>
            <div v-if="session.whatWorked">What helped: {{ session.whatWorked }}</div>
            <div v-if="session.nextStep">Coming up next: {{ session.nextStep }}</div>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>
