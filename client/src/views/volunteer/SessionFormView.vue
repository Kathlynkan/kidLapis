<!-- =============================================================
  Record / edit a session                              Owner: Ning Xuan
  Routes:  /children/:id/sessions/new     (create)
           /sessions/:sessionId/edit      (edit - same form)
  -------------------------------------------------------------
============================================================= -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import LineIcon from '@/components/LineIcon.vue' // a small drawn face, instead of an emoji
import { SUBJECTS, MOODS, PORTIONS } from '@/utils/constants'
import api, { errorMessage } from '@/services/api'
import '@/css/volunteer/volunteershared.css' // what the volunteer pages have in common
import '@/css/volunteer/volunteerform.css' // the look of this form for a volunteer

const route = useRoute() // read information
const router = useRouter() // navigate to another page

const isEdit = computed(() => {
  if (route.params.sessionId) {
    return true
  } else {
    return false
  }
})

const childId = ref(route.params.id) // get childId from URL

const today = new Date()
const dateString = today.toISOString() // convert to string
const date = dateString.slice(0, 10) // format to yyyy-mm-dd

const form = ref({
  // academic
  date: date,
  subject: 'English',
  topic: '',
  attempted: 0,
  correct: 0,
  struggles: [],
  whatWorked: '',
  nextStep: '',
  mood: 'okay',
  notes: '',

  // social
  meal: '',
  portion: 'all',
  activity: [],
  interaction: '',
  behaviour: '',
  socialNotes: '',
  photos: []
})
const newStruggle = ref('')
const newActivity = ref('')
const saving = ref(false) // track whether the form is currently saving
const error = ref('')

async function loadSession() {
  try {
    const res = await api.get(`/sessions/${route.params.sessionId}`)
    const session = res.data

    form.value.date = session.date
    form.value.subject = session.subject
    form.value.topic = session.topic
    form.value.attempted = session.attempted
    form.value.correct = session.correct
    form.value.struggles = session.struggles
    form.value.whatWorked = session.whatWorked
    form.value.nextStep = session.nextStep
    form.value.mood = session.mood
    form.value.notes = session.notes
    form.value.meal = session.meal
    form.value.portion = session.portion
    form.value.activity = session.activity
    form.value.interaction = session.interaction
    form.value.behaviour = session.behaviour
    form.value.socialNotes = session.socialNotes
    form.value.photos = session.photos || []

    childId.value = session.childId // retrieve childId
    form.value.childId = session.childId
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}

async function handleSubmit() {
  try {
    saving.value = true
    error.value = ''

    // if edit form, update existing session
    if (isEdit.value) {
      await api.put(
        `/sessions/${route.params.sessionId}`, 
        form.value
      )

      // push /children/childId=c_1
      // redirect to child profile page after successful submission
      router.push({
        name: 'child-profile',
        params: {id: childId.value},
        query: {success: 'Session updated successfully'}
      })
    } else {
      // else, create new session
      await api.post('/sessions', {
        childId: childId.value,
        date: form.value.date,
        subject: form.value.subject,
        topic: form.value.topic,
        attempted: form.value.attempted,
        correct: form.value.correct,
        struggles: form.value.struggles,
        whatWorked: form.value.whatWorked,
        nextStep: form.value.nextStep,
        mood: form.value.mood,
        notes: form.value.notes,
        meal: form.value.meal,
        portion: form.value.portion,
        activity: form.value.activity,
        interaction: form.value.interaction,
        behaviour: form.value.behaviour,
        socialNotes: form.value.socialNotes,
        photos: form.value.photos
      })

      // Refresh the handover immediately so the next volunteer doesn't see a stale summary.
      // Fire-and-forget: we navigate away regardless of whether the AI call succeeds.
      api.post(`/handover/${childId.value}`, { audience: 'volunteer' }).catch(() => {})

      router.push({
        name: 'child-profile',
        params: {id: childId.value},
        query: {success: 'Session created successfully'}
      })
    }

  } catch (err) {
    // convert error message into readable text
    error.value = errorMessage(err)

    window.scrollTo({ // scroll to top of the form
      top: 0,
    })
  } finally {
    saving.value = false // after submission
  }
}

// A photo is made smaller in the browser and kept as text (a data URL), so it can be saved inside the session
const PHOTO_WIDTH = 800

function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, PHOTO_WIDTH / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)

      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff' // a see-through picture would turn black as a jpeg
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      URL.revokeObjectURL(img.src)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => reject(new Error('That file is not a picture'))
    img.src = URL.createObjectURL(file)
  })
}

async function uploadPhotos(event) {
  const files = Array.from(event.target.files)
  event.target.value = '' // so the same picture can be picked again

  try {
    for (const file of files) {
      form.value.photos.push(await shrinkPhoto(file))
    }
  } catch (err) {
    error.value = err.message
  }
}

function removePhoto(index) {
  form.value.photos.splice(index,1)
}

function addStruggle() {
  if (!newStruggle.value) {
    return
  } else if (form.value.struggles.includes(newStruggle.value)) {
    // avoid duplicates
    return
  }

  // add new struggle
  form.value.struggles.push(newStruggle.value.trim().toUpperCase())

  newStruggle.value = ''
}

function removeStruggle(struggle) {
  const updatedStruggles = []

  for (const s of form.value.struggles) {
    if (s !== struggle) {
      updatedStruggles.push(s)
    }
  }

  form.value.struggles = updatedStruggles
}

function addActivity() {
  if (!newActivity.value) {
    return
  } else if (form.value.activity.includes(newActivity.value)) {
    // avoid duplicates
    return
  }

  // add new activity
  form.value.activity.push(newActivity.value.trim().toUpperCase())

  newActivity.value = ''
}

function removeActivity(activity) {
  const updatedActivity = []

  for (const a of form.value.activity) {
    if (a !== activity) {
      updatedActivity.push(a)
    }
  }

  form.value.activity = updatedActivity
}

function cancel() {
  router.back() // return user to wherever they came from
}

onMounted(() => { // autofill form if edit form
  if (isEdit.value) {
    loadSession()
  }
})

</script>

<template>
  <div class="container py-4 volunteerformpage">
    <button type="button" class="back-link" @click="cancel">
      <i class="bi bi-chevron-left"></i>Back
    </button>

    <PageHeader
      :title="isEdit ? 'Edit Session' : 'Record Session'"
      subtitle="Takes about a minute. The next volunteer will thank you!"
    />

    <div class="row justify-content-center">
      <div class="col-lg-8">
        <form class="lapis-card p-4 px-5" data-test="session-form" @submit.prevent="handleSubmit">
          <!-- 
          lapis-card: custom class
          @submit: when form is submitted, call handleSubmit()
          .prevent: stop browser's default form behavior, else will interfere with Vue app 
          without .prevent: click submit > browser submit form > page reloads
          with .prevent: click submit > page does NOT reload > hangleSubmit() runs > call api.push(), api.put(), etc
          -->
          <div v-if="error" class="alert alert-warning small">{{ error }}</div>
          <!-- alert: bootstrap alert box, alert-warning: set alert colour to yellow/orange-->

          <h2 class="h5 mb-3">Academic</h2>

          <div class="row g-4">
            <div class="col-sm-4">
              <label class="form-label" for="date">Date</label>
              <!-- form-label: bootstrap form label styling-->
              <input id="date" v-model="form.date" type="date" class="form-control"/>
              <!-- form-control: bootstrap-styled input -->
            </div>

            <div class="col-sm-1"></div>

            <div class="col-sm-7">
              <span class="form-label d-block">How was the child feeling?</span>
              <!-- d-block: display label on its own line, label takes up entire row -->
              <div class="btn-group flex-wrap" role="group">
                <!-- 
                btn-group: group mood buttons together
                flex-wrap: allow buttons to wrap onto next line on smaller screens
                 -->
                <template v-for="m in MOODS" :key="m.value">
                  <input :id="'mood-' + m.value" v-model="form.mood" type="radio" class="btn-check" :value="m.value" />
                  <!-- btn-check: hidden radio button for bootstrap button toggle-->
                  <label class="btn btn-outline-secondary btn-sm mood-option" :for="'mood-' + m.value">
                    <!--
                    btn-outline-secondary: gray outlined button style
                    btn-sm: small button size
                    -->
                    <LineIcon :name="m.face" small />{{ m.label }}
                  </label>
                </template>
              </div>
            </div>

            <div class="col-sm-4">
              <label class="form-label" for="subject">Subject</label>
              <select id="subject" v-model="form.subject" class="form-select">
                <!-- form-select: bootstrap-styled dropdown -->
                <option v-for="s in SUBJECTS" :key="s">{{ s }}</option>
              </select>
            </div>

            <div class="col-sm-1"></div>

            <div class="col-sm-7">
              <label class="form-label" for="topic">Topic Covered</label>
              <input id="topic" v-model.trim="form.topic" class="form-control" placeholder="e.g. Fractions"/>
            </div>

            <div class="col-6 col-sm-4">
              <label class="form-label" for="attempted">Attempted</label>
              <div class="input-group">
                <button type="button" class="btn btn-outline-secondary" @click="form.attempted = Math.max(0,(form.attempted || 0)-1)">-</button>
                <input id="attempted" v-model.number="form.attempted" type="number" min="0" class="form-control" />
                <button type="button" class="btn btn-outline-secondary" @click="form.attempted = (form.attempted || 0)+1">+</button>
              </div>
            </div>

            <div class="col-sm-1"></div>

            <div class="col-6 col-sm-4">
              <label class="form-label" for="correct">Correct</label>
              <div class="input-group">
                <button type="button" class="btn btn-outline-secondary" @click="form.correct = Math.max(0,(form.correct || 0)-1)">-</button>
                <input id="correct" v-model.number="form.correct" type="number" min="0" class="form-control" />
                <button type="button" class="btn btn-outline-secondary" @click="form.correct = (form.correct || 0)+1">+</button>
              </div>
            </div>

            <div class="col-12">
              <label class="form-label" for="struggle">Skills The Child Struggled With</label>
              <input
                id="struggle"
                v-model.trim="newStruggle"
                class="form-control"
                placeholder="Type a skill and press Enter"
                @keydown.enter.prevent="addStruggle"
              />
              <div class="mt-2">
                <span v-for="s in form.struggles" :key="s" class="badge badge-danger-soft me-1">
                  <!--
                  badge: bootstrap badge/tag styling
                  badge-danger-soft: custom soft-red badge colour
                  me-1: (margin-end) small right margin between badges
                  -->
                  {{ s }}
                  <button type="button" class="border-0 bg-transparent ms-1" @click="removeStruggle(s)">X</button>
                  <!--
                  border-0: remove button border
                  ms-1: (margin-start) small spacing before remove button
                  -->
                </span>
              </div>
            </div>

            <div class="col-md-6">
              <label class="form-label" for="worked">Teaching Method That Worked</label>
              <input id="worked" v-model.trim="form.whatWorked" class="form-control" placeholder="e.g. Visual diagrams" />
            </div>

            <div class="col-md-6">
              <label class="form-label" for="next">Suggested Next Step</label>
              <input id="next" v-model.trim="form.nextStep" class="form-control" placeholder="e.g. Practise fraction addition" />
            </div>
            <div class="col-12">
              <label class="form-label" for="notes">Other Notes (Optional)</label>
              <textarea id="notes" v-model="form.notes" rows="3" class="form-control"></textarea>
            </div>
          </div>

          <hr class="my-4">

          <h2 class="h5 mb-3">Social</h2>

          <div class="row g-4">
            <div class="col-md-6">
              <label class="form-label" for="meal">Today's Meal</label>
              <input id="meal" v-model.trim="form.meal" class="form-control" placeholder="e.g. Chicken rice and apples">
            </div>

            <div class="col-md-7">
              <span class="form-label d-block">Portion Eaten</span>
              <!-- d-block: display label on its own line, label takes up entire row -->
              <div class="btn-group flex-wrap" role="group">
                <!-- 
                btn-group: group mood buttons together
                flex-wrap: allow buttons to wrap onto next line on smaller screens
                 -->
                <template v-for="p in PORTIONS" :key="p.value">
                  <input :id="'portion-' + p.value" v-model="form.portion" type="radio" class="btn-check" :value="p.value" />
                  <!-- btn-check: hidden radio button for bootstrap button toggle-->
                  <label class="btn btn-outline-secondary btn-sm portion-option" :for="'portion-' + p.value">
                    <!--
                    btn-outline-secondary: gray outlined button style
                    btn-sm: small button size
                    -->
                    {{ p.label }}
                  </label>
                </template>
              </div>
            </div>

            <div class="col-12">
              <label class="form-label" for="activity">Activities</label>
              <input
                id="activity"
                v-model.trim="newActivity"
                class="form-control"
                placeholder="Type a skill and press Enter"
                @keydown.enter.prevent="addActivity"
              />
              <div class="mt-2">
                <span v-for="a in form.activity" :key="a" class="badge badge-danger-soft me-1">
                  <!--
                  badge: bootstrap badge/tag styling
                  badge-danger-soft: custom soft-red badge colour
                  me-1: (margin-end) small right margin between badges
                  -->
                  {{ a }}
                  <button type="button" class="border-0 bg-transparent ms-1" @click="removeActivity(a)">X</button>
                  <!--
                  border-0: remove button border
                  ms-1: (margin-start) small spacing before remove button
                  -->
                </span>
              </div>
            </div>

            <div class="col-md-6">
              <label class="form-label" for="interaction">Peer Interaction</label>
              <select id="interaction" v-model="form.interaction" class="form-select">
                <option value="">Select</option>
                <option>Excellent</option>
                <option>Good</option>
                <option>Fair</option>
                <option>Limited</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label" for="behaviour">Positive Behaviour Observed</label>
              <input id="behaviour" v-model.trim="form.behaviour" class="form-control" placeholder="e.g. Helped another child">
            </div>

            <div class="col-12">
              <label class="form-label" for="photos">Photos</label>
              <input id="photos" type="file" multiple accept="image/*" class="form-control" @change="uploadPhotos">

              <!-- photo preview directly below uplaod input -->
              <div v-if="form.photos.length > 0" class="d-flex flex-wrap gap-2 mt-2">
                <div v-for="(photo, index) in form.photos" :key="index" class="position-relative">
                  <img :src="photo"
                  class="rounded photo-thumb">

                  <button type="button" 
                    class="btn-close bg-danger position-absolute rounded-circle top-0 end-0 p-1 photo-remove"
                    @click="removePhoto(index)"></button>
                </div>

              </div>
            </div>

            <div class="col-12">
              <label class="form-label" for="socialNotes">Other Notes (Optional)</label>
              <textarea id="socialNotes" v-model.trim="form.socialNotes" rows="3" class="form-control"></textarea>
            </div>

          </div>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <!-- right-aligned buttons with gap in between and top margin -->
            <button type="button" class="btn btn-outline-secondary" @click="cancel">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving" data-test="session-submit">
              {{ isEdit ? 'Save Changes' : 'Save Session' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>