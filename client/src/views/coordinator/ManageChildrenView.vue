<!-- =============================================================
  Manage children (CRUD)                              Owner: Kai Sen
  -------------------------------------------------------------
  Done: a card for every child on the sandy board
        "Add child" / "Edit" modal -> POST /children, PUT /children/:id
        "Delete" with a warning    -> DELETE /children/:id
        Search box (name, level, school, needs) and a level filter
        Each card shows the volunteers, the parent (or the code to give them) and the warnings
============================================================= -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import { LEVELS, SKILL_OPTIONS } from '@/utils/constants'
import { firstName } from '@/utils/format'
import PageHeader from '@/components/PageHeader.vue'
import ChildInitial from '@/components/ChildInitial.vue'
import StateMessage from '@/components/StateMessage.vue'
import '@/css/teacher/teacherpage.css' // the styles of the teacher pages

// ---------- The children ----------
const children = ref([])
const parents = ref([]) // parent accounts, for the "Parent" dropdown in the form
const volunteers = ref([]) // volunteer accounts, to show the names on each card
const alerts = ref([]) // the dashboard's warnings, to show the tags on each card
const loading = ref(true)
const error = ref('')
const successMessage = ref('')

onMounted(async () => {
  try {
    const [childRes, parentRes, volunteerRes, alertRes] = await Promise.all([
      api.get('/children'),
      api.get('/users', { params: { role: 'parent' } }),
      api.get('/users', { params: { role: 'volunteer' } }),
      api.get('/dashboard/alerts'),
    ])
    children.value = childRes.data
    parents.value = parentRes.data
    volunteers.value = volunteerRes.data
    alerts.value = alertRes.data
    loading.value = false // stop the spinner (success)
  } catch (err) {
    error.value = errorMessage(err)
    loading.value = false // stop the spinner (error)
  }
})

// Keep the cards in A-Z order, like the server's list
const sortByName = (list) => list.sort((a, b) => a.name.localeCompare(b.name))

// The linked parent's name, or '' if the child has no parent account yet
// (then the card shows the child code to give to the parent instead)
const parentName = (child) => parents.value.find((p) => p.id === child.parentId)?.name || ''

// The first names of the child's volunteers, e.g. "Aisha, Daniel"
const volunteerNames = (child) =>
  (child.volunteerIds || [])
    .map((id) => volunteers.value.find((v) => v.id === id)?.name)
    .filter(Boolean)
    .map(firstName)
    .join(', ')

// How each warning shows as a tag: red for the ones that need action, muted yellow for struggling
const WARNING_TAGS = {
  'no-session': { label: 'Not seen', class: 'tag-red' },
  'overdue-homework': { label: 'Overdue', class: 'tag-red' },
  'repeated-struggle': { label: 'Struggling', class: 'tag-struggle' },
}

// The warnings of a child that show as tags (a child with no volunteer already says so in its own row)
const warningsOf = (child) => {
  const types = new Set(alerts.value.filter((a) => a.childId === child.id).map((a) => a.type))
  types.delete('unassigned')
  return [...types].map((type) => ({ type, ...WARNING_TAGS[type] }))
}

// ---------- Search and level ----------
const search = ref('')
const levelFilter = ref('') // '' = all levels

// The levels that have children, in order, for the filter chips
const levelsInUse = computed(() => LEVELS.filter((l) => children.value.some((c) => c.level === l)))

// The children that match the search box and the level (all of them when both are empty).
// A child matches the search if the text appears in their name, level, school, code or any of their needs.
const filteredChildren = computed(() => {
  const text = search.value.trim().toLowerCase()
  return children.value.filter((c) => {
    if (levelFilter.value && c.level !== levelFilter.value) return false
    if (!text) return true
    return [c.name, c.level, c.school, c.linkCode, ...(c.needs || [])].some((field) =>
      String(field ?? '')
        .toLowerCase()
        .includes(text),
    )
  })
})

function clearFilters() {
  search.value = ''
  levelFilter.value = ''
}

// ---------- "Add child" / "Edit child" modal (one form for both) ----------
const emptyForm = () => ({
  name: '',
  level: '',
  school: '',
  parentId: '',
  needs: [],
  childEmail: '',
  childPassword: '',
})

const showModal = ref(false)
const editingId = ref(null) // null = adding a new child, otherwise the id of the child being edited
const form = ref(emptyForm())
const submitted = ref(false) // only show red errors after the first Save click
const saving = ref(false)
const saveError = ref('')

// Client-side checks (the server checks again - never trust only the browser)
const nameInvalid = computed(() => submitted.value && !form.value.name)
const levelInvalid = computed(() => submitted.value && !form.value.level)

function openAdd() {
  editingId.value = null
  form.value = emptyForm()
  submitted.value = false
  saveError.value = ''
  showModal.value = true
}

function openEdit(child) {
  editingId.value = child.id
  // Copy the child's current details into the form.
  // [...] makes a copy of the needs list, so ticking boxes doesn't change the card before saving.
  form.value = {
    name: child.name,
    level: child.level,
    school: child.school || '',
    parentId: child.parentId || '',
    needs: [...(child.needs || [])],
  }
  submitted.value = false
  saveError.value = ''
  showModal.value = true
}

function closeModal() {
  if (!saving.value) showModal.value = false
}

async function saveChild() {
  submitted.value = true
  saveError.value = ''
  if (!form.value.name || !form.value.level) return // stop here, the red messages show

  saving.value = true
  try {
    if (editingId.value) {
      // Editing: PUT /children/:id, then swap the old card for the updated child
      const res = await api.put(`/children/${editingId.value}`, form.value)
      const others = children.value.filter((c) => c.id !== editingId.value)
      children.value = sortByName([...others, res.data])
      successMessage.value = `${res.data.name} was updated.`
    } else {
      // Adding: POST /children, then add the new child to the page
      const res = await api.post('/children', form.value)
      children.value = sortByName([...children.value, res.data])
      successMessage.value = `${res.data.name} was added.`
    }
    saving.value = false // turn the Save button back on (success)
    showModal.value = false
  } catch (err) {
    saveError.value = errorMessage(err) // e.g. "Level must be P1 to P6." from the server
    saving.value = false // turn the Save button back on (error)
  }
}

// ---------- "Delete child" confirmation ----------
const childToDelete = ref(null) // the child the coordinator clicked Delete on (null = box closed)
const deleting = ref(false)
const deleteError = ref('')

function openDelete(child) {
  childToDelete.value = child
  deleteError.value = ''
}

function closeDelete() {
  if (!deleting.value) childToDelete.value = null
}

async function confirmDelete() {
  const child = childToDelete.value
  deleting.value = true
  deleteError.value = ''
  try {
    const res = await api.delete(`/children/${child.id}`)
    // Remove the card from the page
    children.value = children.value.filter((c) => c.id !== child.id)
    const d = res.data.deleted
    successMessage.value = `${child.name} was deleted, along with ${d.sessions} session(s), ${d.homework} homework and ${d.messages} message(s).`
    deleting.value = false // success
    childToDelete.value = null
  } catch (err) {
    deleteError.value = errorMessage(err)
    deleting.value = false // error
  }
}
</script>

<template>
  <div class="container py-4 teacherpage">
    <PageHeader title="Children" subtitle="Everyone enrolled at the centre.">
      <button class="t-btn" data-test="add-child" @click="openAdd">
        <i class="bi bi-plus-lg"></i>Add child
      </button>
    </PageHeader>

    <div v-if="successMessage" class="note note-ok mb-3" data-test="children-success">
      {{ successMessage }}
    </div>

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <!-- the sandy board: the search, the levels and the white cards -->
    <div v-else class="board">
      <div class="toolbar">
        <label for="child-search" class="visually-hidden">Search children</label>
        <input
          id="child-search"
          v-model="search"
          type="search"
          class="search"
          placeholder="Search by name, level, school or need..."
          data-test="child-search"
        />
        <div class="filters" role="group" aria-label="Level">
          <button type="button" class="chip" :aria-pressed="levelFilter === ''" @click="levelFilter = ''">
            All levels
          </button>
          <button
            v-for="l in levelsInUse"
            :key="l"
            type="button"
            class="chip"
            :aria-pressed="levelFilter === l"
            @click="levelFilter = l"
          >
            {{ l }}
          </button>
        </div>
      </div>
      <div v-if="search.trim() || levelFilter" class="muted" data-test="child-search-count">
        Showing {{ filteredChildren.length }} of {{ children.length }} children
      </div>

      <div v-if="children.length === 0" class="t-card empty">
        <strong>No children yet</strong>
        Click "Add child" to enrol the first one.
      </div>
      <div v-else-if="filteredChildren.length === 0" class="t-card empty">
        <strong>No children found</strong>
        Try another name or level.
        <div class="mt-2">
          <button type="button" class="t-btn t-btn-soft" @click="clearFilters">Clear search</button>
        </div>
      </div>

      <div v-else class="grid">
        <article v-for="c in filteredChildren" :key="c.id" class="t-card person" data-test="child-card">
          <div class="person-top">
            <ChildInitial :child="c" />
            <div>
              <h2 class="person-name">{{ c.name }}</h2>
              <div class="person-sub">{{ c.level }}<span v-if="c.school"> · {{ c.school }}</span></div>
            </div>
          </div>

          <div class="kv">
            <span class="kv-key">Volunteers</span>
            <span v-if="volunteerNames(c)">{{ volunteerNames(c) }}</span>
            <span v-else class="tag tag-red">No volunteer</span>
          </div>
          <div class="kv">
            <span class="kv-key">Parent</span>
            <span v-if="c.parentId">{{ parentName(c) || 'Linked' }}</span>
            <!-- No parent yet: show the code the centre gives the parent for sign up -->
            <span v-else title="Give this code to the parent">
              Code: <code class="child-code" data-test="child-code">{{ c.linkCode }}</code>
            </span>
          </div>
          <div v-if="c.needs?.length" class="kv">
            <span class="kv-key">Needs</span>
            <span class="tags"><span v-for="n in c.needs" :key="n" class="tag">{{ n }}</span></span>
          </div>
          <div v-if="warningsOf(c).length" class="tags">
            <span v-for="w in warningsOf(c)" :key="w.type" class="tag" :class="w.class">{{ w.label }}</span>
          </div>

          <div class="person-foot">
            <RouterLink :to="{ name: 'child-profile', params: { id: c.id } }" class="t-btn t-btn-soft">
              View
            </RouterLink>
            <button
              type="button"
              class="t-btn t-btn-edit"
              :aria-label="`Edit ${c.name}`"
              data-test="edit-child"
              @click="openEdit(c)"
            >
              <i class="bi bi-pencil"></i>Edit
            </button>
            <button
              type="button"
              class="t-btn t-btn-red"
              :aria-label="`Delete ${c.name}`"
              data-test="delete-child"
              @click="openDelete(c)"
            >
              <i class="bi bi-trash"></i>Delete
            </button>
          </div>
        </article>
      </div>
    </div>

    <!-- Add / Edit child modal (the same form is used for both).
         Bootstrap's modal look, but Vue decides when it shows (v-if),
         so we don't need Bootstrap's JavaScript to open or close it. -->
    <template v-if="showModal">
      <div
        class="modal d-block"
        tabindex="-1"
        role="dialog"
        aria-labelledby="childFormTitle"
        @click.self="closeModal"
      >
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <form class="modal-content" novalidate data-test="child-form" @submit.prevent="saveChild">
            <div class="modal-header">
              <h2 id="childFormTitle" class="modal-title h5">
                {{ editingId ? 'Edit child' : 'Add a child' }}
              </h2>
              <button
                type="button"
                class="btn-close"
                aria-label="Close"
                @click="closeModal"
              ></button>
            </div>

            <div class="modal-body">
              <div v-if="saveError" class="note note-bad mb-3" data-test="child-form-error">
                {{ saveError }}
              </div>

              <div class="mb-3">
                <label for="child-name" class="form-label">Full name</label>
                <input
                  id="child-name"
                  v-model.trim="form.name"
                  class="form-control"
                  :class="{ 'is-invalid': nameInvalid }"
                  data-test="child-name"
                />
                <div class="invalid-feedback">Please enter the child's name.</div>
              </div>

              <div class="row g-3 mb-3">
                <div class="col-sm-4">
                  <label for="child-level" class="form-label">Level</label>
                  <select
                    id="child-level"
                    v-model="form.level"
                    class="form-select"
                    :class="{ 'is-invalid': levelInvalid }"
                    data-test="child-level"
                  >
                    <option value="" disabled>Choose...</option>
                    <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
                  </select>
                  <div class="invalid-feedback">Pick a level.</div>
                </div>
                <div class="col-sm-8">
                  <label for="child-school" class="form-label"
                    >School <span class="muted">(optional)</span></label
                  >
                  <input
                    id="child-school"
                    v-model.trim="form.school"
                    class="form-control"
                    data-test="child-school"
                  />
                </div>
              </div>

              <div class="mb-3">
                <label for="child-parent" class="form-label"
                  >Parent <span class="muted">(optional)</span></label
                >
                <select
                  id="child-parent"
                  v-model="form.parentId"
                  class="form-select"
                  data-test="child-parent"
                >
                  <option value="">No parent account yet</option>
                  <option v-for="p in parents" :key="p.id" :value="p.id">
                    {{ p.name }} ({{ p.email }})
                  </option>
                </select>
              </div>

              <fieldset class="mb-3">
                <legend class="form-label fs-6">Needs help with</legend>
                <div class="d-flex flex-wrap gap-2">
                  <template v-for="(skill, i) in SKILL_OPTIONS" :key="skill">
                    <input
                      :id="`need-${i}`"
                      v-model="form.needs"
                      type="checkbox"
                      class="btn-check"
                      :value="skill"
                      autocomplete="off"
                    />
                    <label class="btn need-chip" :for="`need-${i}`">{{ skill }}</label>
                  </template>
                </div>
              </fieldset>

              <template v-if="!editingId">
                <hr class="my-3" />
                <p class="small muted mb-2">
                  <strong>Child login account</strong>
                  <span class="ms-1">(optional — leave blank to set up later)</span>
                </p>
                <div class="mb-3">
                  <label for="child-login-email" class="form-label">Login email</label>
                  <input
                    id="child-login-email"
                    v-model.trim="form.childEmail"
                    type="email"
                    class="form-control"
                    autocomplete="off"
                    data-test="child-login-email"
                    placeholder="e.g. ethan@kidslapis.sg"
                  />
                </div>
                <div class="mb-2">
                  <label for="child-login-password" class="form-label">Login password</label>
                  <input
                    id="child-login-password"
                    v-model="form.childPassword"
                    type="password"
                    class="form-control"
                    autocomplete="new-password"
                    data-test="child-login-password"
                    placeholder="At least 8 characters"
                  />
                </div>
              </template>
            </div>

            <div class="modal-footer">
              <button type="button" class="t-btn t-btn-soft" :disabled="saving" @click="closeModal">
                Cancel
              </button>
              <button type="submit" class="t-btn" :disabled="saving" data-test="save-child">
                <span v-if="saving" class="spinner-border spinner-border-sm"></span>
                {{ editingId ? 'Save changes' : 'Save child' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div class="modal-backdrop show"></div>
    </template>

    <!-- Delete confirmation. Shows only while childToDelete has a child in it. -->
    <template v-if="childToDelete">
      <div
        class="modal d-block"
        tabindex="-1"
        role="alertdialog"
        aria-labelledby="deleteChildTitle"
        @click.self="closeDelete"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content" data-test="delete-child-dialog">
            <div class="modal-header">
              <h2 id="deleteChildTitle" class="modal-title h5">Delete {{ childToDelete.name }}?</h2>
              <button
                type="button"
                class="btn-close"
                aria-label="Close"
                @click="closeDelete"
              ></button>
            </div>
            <div class="modal-body">
              <div v-if="deleteError" class="note note-bad mb-3" data-test="delete-child-error">
                {{ deleteError }}
              </div>
              <p class="mb-2">
                This will also permanently delete
                <strong
                  >all of {{ childToDelete.name }}'s sessions, homework, messages and their
                  login</strong
                >.
              </p>
              <p class="mb-0 small">
                <i class="bi bi-exclamation-triangle me-1"></i>This cannot be undone.
              </p>
            </div>
            <div class="modal-footer">
              <button type="button" class="t-btn t-btn-soft" :disabled="deleting" @click="closeDelete">
                Cancel
              </button>
              <button
                type="button"
                class="t-btn t-btn-red"
                :disabled="deleting"
                data-test="confirm-delete"
                @click="confirmDelete"
              >
                <span v-if="deleting" class="spinner-border spinner-border-sm"></span>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop show"></div>
    </template>
  </div>
</template>
