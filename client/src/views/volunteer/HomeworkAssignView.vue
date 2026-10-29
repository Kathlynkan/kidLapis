<!-- Give homework to a child                            Owner: Ning Xuan
  Route: /children/:id/homework/new -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { SUBJECTS } from '@/utils/constants'
import api, { errorMessage } from '@/services/api'
import '@/css/volunteer/volunteershared.css' // what the volunteer pages have in common
import '@/css/volunteer/volunteerform.css' // the look of the forms for a volunteer

const route = useRoute()
const router = useRouter()

const decks = ref([]) // all the decks of questions
const chosenDeck = ref(null) // the deck the volunteer picked (null = no deck)

const form = ref({
  childId: route.params.id,
  title: '',
  subject: 'English',
  details: '',
  dueDate: '',
  points: 10,
})
const error = ref('')

async function handleSubmit() {
  try {
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
    if (form.value.points < 0) {
      error.value = 'Points cannot be negative'
      return
    }

    await api.post('/homework', {
      childId: form.value.childId,
      title: form.value.title,
      subject: form.value.subject,
      details: form.value.details,
      dueDate: form.value.dueDate,
      points: form.value.points,
    })

    // push /children/childId=c_1
    // redirect to child profile page after successful submission
    router.push({
      name: 'child-profile',
      params: {
        id: route.params.id
      }
    })
  } catch (err) {
    // convert error message into readable text
    error.value = errorMessage(err)
  }
}
</script>

<template>
  <div class="container py-4 volunteerformpage">
    <PageHeader title="Give homework" subtitle="Small tasks from the question book work best." />

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
              <label class="form-label" for="due">Due date</label>
              <input id="due" v-model="form.dueDate" type="date" class="form-control" data-test="hw-due" />
            </div>

            <div class="col-sm-6">
              <label class="form-label" for="points">Reward points</label>
              <input type="range" id="points" v-model.number="form.points" min="5" max="20" step="1" class="form-range">
              <div class="d-flex justify-content-between small mt-2">
                <span>5⭐</span>
                <span class="badge  badge-accent fs-6 fw-bold">{{ form.points }}⭐</span>
                <span>20⭐</span>
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label" for="details">Instructions for the child</label>
              <textarea id="details" v-model="form.details" rows="3" class="form-control" placeholder="Question book p.42, Q1-10"></textarea>
            </div>
          </div>
          
          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-outline-secondary" @click="router.back()">Cancel</button>
            <button type="submit" class="btn btn-primary" data-test="hw-submit">Assign homework</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>