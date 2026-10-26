<!-- =============================================================
  ParentSocialDay - one day at student care, the social side.   Owner: Kat
  Shows (only what the volunteer filled in): photos, what the child did, the meal,
  getting along with others, something positive and a note from the volunteer.
  Props:  session (Object), childName (String)
  Its styles are in assets/parentpage.css
============================================================= -->
<script setup>
import { computed } from 'vue'
import { firstName } from '@/utils/format' // small helper for names

const props = defineProps({
  session: { type: Object, required: true },
  childName: { type: String, default: 'the child' }, // the first name of the child, used in "What Ethan did"
})

// the non-academic things the child did (chess with friends, soccer ...), as a list
const activityList = computed(() => {
  if (props.session.activities && props.session.activities.length > 0) {
    return props.session.activities
  }
  if (props.session.activity) {
    return [props.session.activity]
  }
  return []
})

// the photos: the first one is big, the next two are small, the rest are counted
const photos = computed(() => props.session.photos || [])
const extraPhotos = computed(() => Math.max(0, photos.value.length - 3))

// "Note from Aisha", or "Note from the volunteer" when we do not know the name
const noteLabel = computed(() => {
  if (props.session.volunteerName) return 'Note from ' + firstName(props.session.volunteerName)
  return 'Note from the volunteer'
})

// true when the volunteer wrote nothing about the social side
const empty = computed(() => {
  const s = props.session
  return photos.value.length === 0 && activityList.value.length === 0 && !s.meal && !s.interaction && !s.behaviour && !s.socialNotes
})
</script>

<template>
  <div class="day" data-test="social-day">
    <!-- photos -->
    <div v-if="photos.length > 0" class="day-photos">
      <img class="day-photo-big" :src="photos[0]" alt="Photo from the session" />
      <div v-if="photos.length > 1" class="day-photo-small">
        <img :src="photos[1]" alt="Photo from the session" />
        <div v-if="photos.length > 2" class="day-photo-last">
          <img :src="photos[2]" alt="Photo from the session" />
          <span v-if="extraPhotos > 0" class="day-photo-more">+{{ extraPhotos }}</span>
        </div>
      </div>
    </div>

    <!-- what the child did -->
    <div v-if="activityList.length > 0">
      <span class="day-label">What {{ childName }} did</span>
      <span v-for="activity in activityList" :key="activity" class="day-chip">{{ activity }}</span>
    </div>

    <!-- the short lines -->
    <div v-if="session.meal" class="day-line">
      <span class="day-icon">🍱</span>
      <div><span class="day-label">Meal</span>{{ session.meal }}</div>
    </div>
    <div v-if="session.interaction" class="day-line">
      <span class="day-icon">🤝</span>
      <div><span class="day-label">Getting along with others</span>{{ session.interaction }}</div>
    </div>
    <div v-if="session.behaviour" class="day-line">
      <span class="day-icon">⭐</span>
      <div><span class="day-label">Something positive</span>{{ session.behaviour }}</div>
    </div>

    <!-- the note -->
    <div v-if="session.socialNotes" class="day-note">
      <span class="day-label">{{ noteLabel }}</span>
      "{{ session.socialNotes }}"
    </div>

    <div v-if="empty" class="small text-muted-cb">Nothing extra was noted for this day.</div>
  </div>
</template>
