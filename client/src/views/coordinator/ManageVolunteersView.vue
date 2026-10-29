<!-- Manage volunteers                                   Owner: Yu Xuan -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { errorMessage } from '@/services/api'
import PageHeader from '@/components/PageHeader.vue'
import StateMessage from '@/components/StateMessage.vue'
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
  <div class="container py-4">
    <PageHeader title="Volunteers" subtitle="Skills and availability power the matchmaking." />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <div v-else class="row g-3">
      <label for="skill-filter" class="small mb-0">Filter by skill</label>
      <select id="skill-filter"
      v-model="skill_Filter"
      class="form-select form-select-sm w-auto"
      data-test="skill-filter">
        <option value="">All skills</option>
        <option v-for="skill in allSkills" :key="skill" :value="skill">{{ skill }}</option>
      </select>
      <span class="small lapis-muted">
        Showing {{ filtered_Volunteers.length }} of {{ volunteers.length }}
      </span>
      <p v-if="!filtered_Volunteers.length" class="lapis-muted" data-test="no-volunteers">
        No volunteer can "{{ skill_Filter }}" yet.
      </p>

      <div v-for="v in filtered_Volunteers" :key="v.id" class="col-md-6 col-lg-4">
        <div class="lapis-card p-3 h-100" data-test="volunteer-card">
          <h2 class="h6 mb-1"><i class="bi bi-person-circle me-1"></i>{{ v.name }}</h2>
          <div class="small lapis-muted mb-2">{{ v.email }}</div>
          <div class="d-flex gap-2 mb-2">
            <button
              v-if="editing_ID !== v.id && confirmDeleteId !== v.id"
              class="btn btn-sm btn-outline-secondary"
              :disabled="editing_ID !== null || confirmDeleteId !== null"
              data-test="edit-volunteer"
              @click="startEdit(v)"
            >
              <i class="bi bi-pencil me-1"></i>Edit
            </button>
            <button
              v-if="editing_ID !== v.id && confirmDeleteId !== v.id"
              class="btn btn-sm btn-outline-danger"
              :disabled="editing_ID !== null || confirmDeleteId !== null"
              data-test="delete-volunteer"
              @click="startDelete(v)"
            >
              <i class="bi bi-trash me-1"></i>Remove
            </button>
          </div>

          <div v-if="confirmDeleteId === v.id" class="border rounded p-2 mb-2 small">
            <p class="mb-2">Remove <strong>{{ v.name }}</strong>? Their sessions and records stay — only the login is deleted.</p>
            <div v-if="delete_error" class="text-danger mb-2">{{ delete_error }}</div>
            <div class="d-flex gap-2">
              <button
                class="btn btn-sm btn-danger"
                :disabled="deleting"
                data-test="confirm-delete-volunteer"
                @click="confirmDelete(v)"
              >
                {{ deleting ? 'Removing...' : 'Yes, remove' }}
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                :disabled="deleting"
                @click="cancelDelete"
              >
                Cancel
              </button>
            </div>
          </div>
        <div class="small mb-2" data-test="workload">
          <i class="bi bi-people me-1"></i>
          <template v-if="workloadOf(v).length">
            <strong>{{ workloadOf(v).length }}</strong>
            {{ workloadOf(v).length === 1 ? 'child' : 'children' }}:
            {{ workloadOf(v).map((c) => c.name.split(' ')[0]).join(', ') }}
          </template>
          <span v-else class="lapis-muted">No assigned children</span>
        </div>

        <template v-if="editing_ID !== v.id">
          <div class="mb-2">
            <span v-for="s in v.skills" :key="s" class="badge badge-soft me-1 mb-1">{{  s }}</span>
            <span v-if="!v.skills?.length" class="small lapis-muted">No skills to display</span>
          <div class="small"><i class="bi bi-calendar-week me-1"></i>{{ (v.availability || []).join(', ') || 'Not set' }}</div>
          </div>
        </template>
          <form v-else @submit.prevent="save(v)" data-test="edit-form">
            <fieldset class="mb-2">
              <legend class="small fw-semibold mb-1">Skills</legend>
              <label v-for="s in allSkills" :key="s" class="form-check small mb-0">
                <input v-model="draft.skills" class="form-check-input" type="checkbox" :value="s">
                <span class="form-check-label">{{ s }}</span>
              </label>
            </fieldset>

            <fieldset class="mb-2">
              <legend class="small fw-semibold mb-1">Available days</legend>
              <div class="d-flex flex-wrap gap-2">
                <label v-for="d in Days" :key="d" class="form-check form-check-inline small mb-0 me-0">
                  <input v-model="draft.availability" class="form-check-input" type="checkbox" :value="d">
                  <span class="form-check-label">{{ d }}</span>
                </label>
              </div>
            </fieldset>
            <div v-if="save_error" class="small text-danger mb-2">{{ save_error }}</div>

            <div class="d-flex gap-2">
              <button type="submit" class="btn btn-sm btn-primary" :disabled="saving" data-test="save-volunteer">
                {{ saving ? 'Saving...' : 'Save changes' }}
              </button>
              <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="saving" @click="cancelEdit">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
