<!-- Manage volunteers                                   Owner: Yu Xuan -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { errorMessage } from '@/services/api'
import PageHeader from '@/components/PageHeader.vue'
import ChildInitial from '@/components/ChildInitial.vue'
import StateMessage from '@/components/StateMessage.vue'
import '@/css/teacher/teacherpage.css' // the styles of the teacher pages
const Days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const volunteers = ref([])
const loading = ref(true)
const error = ref('')
const children = ref([])
const skill_Filter = ref('')

// this is to have a draft of editing stuff so unsaved changes can be thrown away
const editing_ID = ref(null)
const draft = ref({ skills: [], availability: [] })
const saving = ref(false)
const save_error = ref('')

const confirmDeleteId = ref(null) // volunteer id awaiting delete confirmation
const deleting = ref(false)
const delete_error = ref('')

const filtered_Volunteers = computed(() => {
  if (!skill_Filter.value) return volunteers.value
  return volunteers.value.filter((v) => (v.skills || []).includes(skill_Filter.value))
})


// pulls all skills from both volunteer and child
const allSkills = computed(() => {
  const set = new Set()
  volunteers.value.forEach((v) => (v.skills || []).forEach((s) => set.add(s)))
  children.value.forEach((c) => (c.needs || []).forEach((s) => set.add(s)))
  return [...set].sort()
}) 

const childrenByVolunteer = computed(() => {
  const map = {}
  for (const child of children.value) {
    for (const id of child.volunteerIds || []) {
      ;(map[id] ??= []).push(child)
    }
  }
  return map
})

function workloadOf(v) {
  return childrenByVolunteer.value[v.id] || []
}

function startEdit(v) {
  editing_ID.value = v.id
  draft.value = { skills: [...(v.skills || [])], availability: [...(v.availability || [])] }
  save_error.value = ''
}

function cancelEdit() {
  editing_ID.value = null
  save_error.value = ''
}

function startDelete(v) {
  confirmDeleteId.value = v.id
  delete_error.value = ''
}

function cancelDelete() {
  if (!deleting.value) confirmDeleteId.value = null
}

async function confirmDelete(v) {
  deleting.value = true
  delete_error.value = ''
  try {
    await api.delete(`/users/${v.id}`)
    volunteers.value = volunteers.value.filter((x) => x.id !== v.id)
    confirmDeleteId.value = null
  } catch (err) {
    delete_error.value = errorMessage(err)
  } finally {
    deleting.value = false
  }
}

async function save(v) {
  saving.value = true
  save_error.value = ''
  // keep consistent order (alphabetical skills, Mon to Sun) regardless of click order
  const payload = {
    skills: allSkills.value.filter((s) => draft.value.skills.includes(s)),
    availability: Days.filter((d) => draft.value.availability.includes(d)),
  }
  try {
    await api.put(`/users/${v.id}`, payload)
    Object.assign(v, payload) // card updates without reloading page
    editing_ID.value = null
  } catch (err) {
    save_error.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const [vol_Result, child_Result] = await Promise.all([
      api.get('/users', { params: { role: 'volunteer' } }),
      api.get('/children')
    ])
    volunteers.value = vol_Result.data
    children.value = child_Result.data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container py-4 teacherpage">
    <PageHeader title="Volunteers" subtitle="Skills and availability power the matchmaking." />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <div v-else class="board">
      <div class="toolbar">
        <label for="skill-filter" class="visually-hidden">Filter by skill</label>
        <select id="skill-filter" v-model="skill_Filter" class="form-select skill-select" data-test="skill-filter">
          <option value="">All skills</option>
          <option v-for="skill in allSkills" :key="skill" :value="skill">{{ skill }}</option>
        </select>
        <span class="tag">Showing {{ filtered_Volunteers.length }} of {{ volunteers.length }}</span>
      </div>

      <div v-if="!filtered_Volunteers.length" class="t-card empty" data-test="no-volunteers">
        <strong>No volunteers found</strong>
        No volunteer can "{{ skill_Filter }}" yet.
      </div>

      <div v-else class="grid">
        <article v-for="v in filtered_Volunteers" :key="v.id" class="t-card person" data-test="volunteer-card">
          <div class="person-top">
            <ChildInitial class="is-volunteer" :child="v" />
            <div>
              <h2 class="person-name">{{ v.name }}</h2>
              <div class="person-sub">{{ v.email }}</div>
            </div>
          </div>

          <div class="person-sub" data-test="workload">
            <i class="bi bi-people me-1"></i>
            <template v-if="workloadOf(v).length">
              <strong>{{ workloadOf(v).length }}</strong>
              {{ workloadOf(v).length === 1 ? 'child' : 'children' }}:
              {{ workloadOf(v).map((c) => c.name.split(' ')[0]).join(', ') }}
            </template>
            <span v-else>No assigned children</span>
          </div>

          <!-- Remove asks first -->
          <div v-if="confirmDeleteId === v.id" class="confirm-box">
            <p class="mb-2">Remove <strong>{{ v.name }}</strong>? Their sessions and records stay — only the login is deleted.</p>
            <div v-if="delete_error" class="text-danger mb-2">{{ delete_error }}</div>
            <div class="d-flex gap-2">
              <button
                type="button"
                class="t-btn t-btn-red"
                :disabled="deleting"
                data-test="confirm-delete-volunteer"
                @click="confirmDelete(v)"
              >
                {{ deleting ? 'Removing...' : 'Yes, remove' }}
              </button>
              <button type="button" class="t-btn t-btn-soft" :disabled="deleting" @click="cancelDelete">Cancel</button>
            </div>
          </div>

          <!-- what they teach and when they are free -->
          <div v-if="editing_ID !== v.id" class="facts">
            <div class="fact">
              <span class="fact-key">Teaches</span>
              <span class="fact-value">{{ (v.skills || []).join(', ') || 'No skills to display' }}</span>
            </div>
            <div class="fact">
              <span class="fact-key">Free on</span>
              <span class="fact-value">{{ (v.availability || []).join(', ') || 'Not set' }}</span>
            </div>
          </div>

          <form v-else @submit.prevent="save(v)" data-test="edit-form">
            <fieldset class="mb-2">
              <legend class="fact-key mb-1">Skills</legend>
              <label v-for="s in allSkills" :key="s" class="form-check small mb-0">
                <input v-model="draft.skills" class="form-check-input" type="checkbox" :value="s">
                <span class="form-check-label">{{ s }}</span>
              </label>
            </fieldset>

            <fieldset class="mb-2">
              <legend class="fact-key mb-1">Available days</legend>
              <div class="d-flex flex-wrap gap-2">
                <label v-for="d in Days" :key="d" class="form-check form-check-inline small mb-0 me-0">
                  <input v-model="draft.availability" class="form-check-input" type="checkbox" :value="d">
                  <span class="form-check-label">{{ d }}</span>
                </label>
              </div>
            </fieldset>
            <div v-if="save_error" class="small text-danger mb-2">{{ save_error }}</div>

            <div class="d-flex gap-2">
              <button type="submit" class="t-btn" :disabled="saving" data-test="save-volunteer">
                {{ saving ? 'Saving...' : 'Save changes' }}
              </button>
              <button type="button" class="t-btn t-btn-soft" :disabled="saving" @click="cancelEdit">Cancel</button>
            </div>
          </form>

          <div v-if="editing_ID !== v.id && confirmDeleteId !== v.id" class="person-foot">
            <button
              type="button"
              class="t-btn t-btn-edit"
              :disabled="editing_ID !== null || confirmDeleteId !== null"
              data-test="edit-volunteer"
              @click="startEdit(v)"
            >
              <i class="bi bi-pencil"></i>Edit
            </button>
            <button
              type="button"
              class="t-btn t-btn-red"
              :disabled="editing_ID !== null || confirmDeleteId !== null"
              data-test="delete-volunteer"
              @click="startDelete(v)"
            >
              <i class="bi bi-trash"></i>Remove
            </button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
