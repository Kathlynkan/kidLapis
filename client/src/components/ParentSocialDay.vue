<!-- =============================================================
  ParentSocialDay - one day at student care, the social side.   Owner: Kat
  Shows (only what the volunteer filled in): photos, what the child did, the meal,
  getting along with others, something positive and a note from the volunteer.
  Props:  session (Object), childName (String)
  Its styles are in css/parent/parentpage.css
============================================================= -->
<script setup>
import { computed, ref } from 'vue'
import { firstName } from '@/utils/format' // small helper for names
import LineIcon from '@/components/LineIcon.vue' // a small drawn icon, instead of an emoji

const props = defineProps({
  session: { type: Object, required: true },
  childName: { type: String, default: 'the child' }, // the first name of the child, used in "What Ethan did"
})

// the non-academic things the child did (chess with friends, soccer ...), as a list
const activityList = computed(() => {
  const activity = props.session.activity // a list like ['Chess', 'Drawing'] (older sessions have one word)
  if (Array.isArray(activity)) {
    return activity
  }
  if (activity) {
    return [activity]
  }
  return []
})

// the short lines, each with an icon (a line is left out when the volunteer did not fill it in)
const lines = computed(() => {
  const all = [
    { icon: 'bowl', label: 'Meal', text: props.session.meal },
    { icon: 'people', label: 'Getting along with others', text: props.session.interaction },
    { icon: 'star', label: 'Something positive', text: props.session.behaviour },
  ]
  return all.filter((line) => line.text)
})

// the photos: a gallery of square pictures. Three are shown, the last one says how many more there are
// and opens them all when it is pressed
const SHOWN_PHOTOS = 3
const photos = computed(() => props.session.photos || [])
const showAllPhotos = ref(false)
const shownPhotos = computed(() => (showAllPhotos.value ? photos.value : photos.value.slice(0, SHOWN_PHOTOS)))
const extraPhotos = computed(() => Math.max(0, photos.value.length - SHOWN_PHOTOS))

// a photo opens full size in a new tab, except the last one while more are hidden: that one shows them
// A photo a volunteer uploaded is kept as text (data:...) and a browser does not follow a link to that,
// so it is shown in a new tab with an image tag instead.
function pressPhoto(index, event) {
  const isMoreButton = !showAllPhotos.value && extraPhotos.value > 0 && index === SHOWN_PHOTOS - 1
  if (isMoreButton) {
    event.preventDefault()
    showAllPhotos.value = true
  } else if (shownPhotos.value[index].startsWith('data:')) {
    event.preventDefault()
    const tab = window.open('', '_blank')
    if (tab) tab.document.body.innerHTML = `<img src="${shownPhotos.value[index]}" style="max-width:100%">`
  }
}

// "Note from Aisha", or "Note from the volunteer" when we do not know the name
const noteLabel = computed(() => {
  if (props.session.volunteerName) return 'Note from ' + firstName(props.session.volunteerName)
  return 'Note from the volunteer'
})

// true when the volunteer wrote nothing about the social side
const empty = computed(() => {
  return photos.value.length === 0 && activityList.value.length === 0 && lines.value.length === 0 && !props.session.socialNotes
})
</script>

<template>
  <div class="day" data-test="social-day">
    <!-- photos -->
    <div v-if="photos.length > 0">
      <div class="day-photos">
        <a
          v-for="(photo, index) in shownPhotos"
          :key="index"
          class="day-photo"
          :href="photo"
          target="_blank"
          rel="noopener"
          @click="pressPhoto(index, $event)"
        >
          <img :src="photo" alt="Photo from the session" />
          <span v-if="!showAllPhotos && extraPhotos > 0 && index === SHOWN_PHOTOS - 1" class="day-photo-more">+{{ extraPhotos }}</span>
        </a>
      </div>
      <button v-if="showAllPhotos && extraPhotos > 0" type="button" class="show-more" @click="showAllPhotos = false">Show fewer photos</button>
    </div>

    <!-- what the child did -->
    <div v-if="activityList.length > 0">
      <span class="small-label">What {{ childName }} did</span>
      <span v-for="activity in activityList" :key="activity" class="chip">{{ activity }}</span>
    </div>

    <!-- the short lines -->
    <div v-for="line in lines" :key="line.label" class="day-line">
      <span class="day-icon"><LineIcon :name="line.icon" /></span>
      <div><span class="small-label">{{ line.label }}</span>{{ line.text }}</div>
    </div>

    <!-- the note -->
    <div v-if="session.socialNotes" class="note-box">
      <span class="small-label">{{ noteLabel }}</span>
      "{{ session.socialNotes }}"
    </div>

    <p v-if="empty" class="muted">Nothing extra was noted for this day.</p>
  </div>
</template>
