<!-- Give homework to a child                            Owner: Ning Xuan
  Route: /children/:id/homework/new -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { SUBJECTS } from '@/utils/constants'
import api, { errorMessage } from '@/services/api'

const route = useRoute()
const router = useRouter()

const decks = ref([]) // all the decks of questions
const chosenDeck = ref(null) // the deck the volunteer picked (null = no deck)

const form = ref({
  childId: route.params.id,
  deckId: '', // the id of the picked deck (empty = no deck)
  title: '',
  subject: 'English',
  details: '',
  dueDate: '',
  points: 10,
})
const error = ref('')

// when the page opens: ask the server for the decks of questions
onMounted(async () => {
  try {
    const response = await api.get('/decks')
    decks.value = response.data
  } catch (err) {
    error.value = errorMessage(err)
  }
})

// when the volunteer picks a deck: find it in the list, then fill in the title, subject and instructions from it
function pickDeck() {
  chosenDeck.value = null
  for (const deck of decks.value) {
    if (deck.id === form.value.deckId) {
      chosenDeck.value = deck
    }
  }
  if (chosenDeck.value) {
    form.value.title = chosenDeck.value.title
    form.value.subject = chosenDeck.value.subject
    form.value.details = chosenDeck.value.description
  }
}

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
      deckId: form.value.deckId, // empty if no deck was picked
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
  <div class="container py-4">
    <PageHeader title="Give homework" subtitle="Small tasks from the question book work best." />

    <div class="row justify-content-center">
      <div class="col-lg-7">
        <form class="lapis-card p-4 px-5" @submit.prevent="handleSubmit">
          <div v-if="error" class="alert alert-warning small">{{ error }}</div>

          <!-- optional: a deck of questions. The child answers its questions as a quiz. -->
          <div class="mb-3">
            <label class="form-label" for="deck">Deck of questions (optional)</label>
            <select id="deck" v-model="form.deckId" class="form-select" data-test="deck-select" @change="pickDeck">
              <option value="">No deck (no questions)</option>
              <option v-for="deck in decks" :key="deck.id" :value="deck.id">{{ deck.subject }}: {{ deck.title }} ({{ deck.questions.length }} questions)</option>
            </select>
          </div>

          <!-- the questions of the picked deck, so the volunteer can see them (with the answers) -->
          <div v-if="chosenDeck" class="border rounded p-3 mb-3 small" data-test="deck-preview">
            <ol class="mb-0">
              <li v-for="(question, number) in chosenDeck.questions" :key="number">
                {{ question.text }} <span class="text-muted">Answer: {{ question.answer }}</span>
              </li>
            </ol>
          </div>

          <div class="mb-3">
            <label class="form-label" for="title">Title</label>
            <input id="title" v-model.trim="form.title" class="form-control" placeholder="e.g. Fraction addition worksheet" data-test="hw-title" />
          </div>
          <div class="row g-3 mb-3">
            <div class="col-sm-4">
              <label class="form-label" for="subject">Subject</label>
              <select id="subject" v-model="form.subject" class="form-select">
                <option v-for="s in SUBJECTS" :key="s">{{ s }}</option>
              </select>
            </div>
            <div class="col-sm-4">
              <label class="form-label" for="due">Due date</label>
              <input id="due" v-model="form.dueDate" type="date" class="form-control" data-test="hw-due" />
            </div>
            <div class="col-sm-4">
              <label class="form-label" for="points">Reward points</label>
              <select id="points" v-model.number="form.points" class="form-select">
                <option :value="10">10 ⭐ (small)</option>
                <option :value="15">15 ⭐</option>
                <option :value="20">20 ⭐ (big)</option>
              </select>
            </div>
          </div>
          <div class="mb-4">
            <label class="form-label" for="details">Instructions for the child</label>
            <textarea id="details" v-model="form.details" rows="3" class="form-control" placeholder="Question book p.42, Q1-10"></textarea>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" @click="router.back()">Cancel</button>
            <button type="submit" class="btn btn-primary" data-test="hw-submit">Assign homework</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>