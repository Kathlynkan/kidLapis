<!-- Give homework to a child                            Owner: Ning Xuan
  Route: /children/:id/homework/new -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { SUBJECTS } from '@/utils/constants'
import api, { errorMessage } from '@/services/api'
import '@/css/volunteer/volunteershared.css' // what the volunteer pages have in common
import '@/css/volunteer/volunteerform.css' // the look of the forms for a volunteer

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => {
  if (route.params.homeworkId) {
    return true
  } else {
    return false
  }
})

const childId = ref(route.params.id)
const form = ref({
  childId: route.params.id,
  title: '',
  subject: 'English',
  details: '',
  dueDate: '',
  points: 10,
})
const saving = ref(false)
const error = ref('')

async function loadHomework() {
  try {
    const res = await api.get(`/homework/${route.params.homeworkId}`)
    const homework = res.data

    form.value.title = homework.title
    form.value.subject = homework.subject
    form.value.details = homework.details
    form.value.dueDate = homework.dueDate
    form.value.points = homework.points

    childId.value = homework.childId // retrieve childId
    form.value.childId = homework.childId
  } catch (err) {
    error.value = errorMessage(err)
  }
}

const badgePosition = computed(() => {
  const min = 5
  const max = 20

  const percentage = ((form.value.points-min) / (max-min))*100

  return `${percentage}%`
})

async function handleSubmit() {
  try {
    saving.value = true
    error.value = ''

    const today = new Date().toISOString().slice(0, 10)

    // check due date exists
    if (!form.value.dueDate) {
      error.value = 'Due date is required'
      return
    }

    // validate due date
    if (form.value.dueDate < today) {
      error.value = 'Due date cannot be in the past'
      return
    }
    
    // check title exists
    if (!form.value.title) {
      error.value = 'Title is required'
      return
    }

    // validate points
    if (form.value.points < 5 || form.value.points > 20) {
      error.value = 'Points must be between 5 and 20'
      return
    }

    // if edit form, update existing homework
    if (isEdit.value) {
      await api.put(
        `/homework/${route.params.homeworkId}`, 
        form.value
      )

      // redirect to child profile page after successful submission
      router.push({
        name: 'child-profile',
        params: {id: childId.value},
        query: {success: 'Homework updated successfully'}
      })
    } else {
      // else, create new homework
      await api.post('/homework', {
        childId: form.value.childId,
        title: form.value.title,
        subject: form.value.subject,
        details: form.value.details,
        dueDate: form.value.dueDate,
        points: form.value.points,
      })

      // Refresh the handover immediately so the next volunteer doesn't see a stale summary.
      // Fire-and-forget: we navigate away regardless of whether the AI call succeeds.
      api.post(`/handover/${childId.value}`, { audience: 'volunteer' }).catch(() => {})

      router.push({
        name: 'child-profile',
        params: {id: childId.value},
        query: {success: 'Homework created successfully'}
      })
    }
  } catch (err) {
    // convert error message into readable text
    error.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}

function cancel() {
  router.back() // return user to wherever they came from
}

onMounted(() => { // autofill form if edit form
  if (isEdit.value) {
    loadHomework()
  }
})
</script>

<template>
  <div class="container py-4 volunteerformpage">
    <button type="button" class="back-link" @click="cancel">
      <i class="bi bi-chevron-left"></i>Back
    </button>

    <PageHeader
      :title="isEdit ? 'Edit Homework' : 'Give Homework'"
      subtitle="Small tasks from the question book work best."
    />

    <div class="row justify-content-center">
      <div class="col-lg-8">
        <form class="cb-card p-4 px-5" @submit.prevent="handleSubmit">
          <div v-if="error" class="alert alert-warning small">{{ error }}</div>

          <div class="row g-4">
            <div class="mb-3">
              <label class="form-label" for="title">Title</label>
              <input id="title" v-model.trim="form.title" class="form-control" placeholder="e.g. Fraction addition worksheet" data-test="hw-title" />
            </div>

            <div class="col-sm-4">
              <label class="form-label" for="subject">Subject</label>
              <select id="subject" v-model="form.subject" class="form-select">
                <option v-for="s in SUBJECTS" :key="s">{{ s }}</option>
              </select>
            </div>

            <div class="col-sm-1"></div>

            <div class="col-sm-4">
              <label class="form-label" for="due">Due Date</label>
              <input id="due" v-model="form.dueDate" type="date" class="form-control" data-test="hw-due" />
            </div>

            <div class="col-12">
              <label class="form-label" for="points">Reward Stars</label>

              <div class="slider-container">
                <span class="badge badge-light reward-badge text-dark fs-5 fw-bold" 
                  :style="{left: badgePosition}">
                  {{ form.points }}⭐
                </span>
                <input type="range" id="points" v-model.number="form.points" 
                min="5" max="20" step="1" class="form-range">
              </div>

              <div class="d-flex justify-content-between">
                <span>5⭐</span>
                <span>20⭐</span>
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label" for="details">Homework Instructions</label>
              <textarea id="details" v-model="form.details" rows="3" class="form-control" placeholder="Question book p.42, Q1-10"></textarea>
            </div>
          </div>
          
          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-outline-secondary" @click="router.back()">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving" data-test="hw-submit">
              {{ isEdit ? 'Save Changes' : 'Assign Homework' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>