<!-- =============================================================
  Manage children (CRUD)                              Owner: Kai Sen
  -------------------------------------------------------------
  Done: table of all children
        "Add child" / "Edit" modal -> POST /children, PUT /children/:id
        "Delete" with a warning    -> DELETE /children/:id
        Search box (name, level, school, needs)
        Table from md up, cards on phones
============================================================= -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import { LEVELS, SKILL_OPTIONS } from '@/utils/constants'
import PageHeader from '@/components/PageHeader.vue'
import ChildAvatar from '@/components/ChildAvatar.vue'
import StateMessage from '@/components/StateMessage.vue'

// ---------- Table of children ----------
const children = ref([])
const parents = ref([]) // parent accounts, for the "Parent" dropdown in the form
const loading = ref(true)
const error = ref('')
const successMessage = ref('')

onMounted(async () => {
  try {
    // 1. the children for the table
    const childRes = await api.get('/children')
    children.value = childRes.data

    // 2. the parent accounts for the "Parent" dropdown in the form
    const parentRes = await api.get('/users', { params: { role: 'parent' } })
    parents.value = parentRes.data
    loading.value = false // stop the spinner (success)
  } catch (err) {
    error.value = errorMessage(err)
    loading.value = false // stop the spinner (error)
  }
})

// Keep the table in A-Z order, like the server's list
const sortByName = (list) => list.sort((a, b) => a.name.localeCompare(b.name))

// The linked parent's name, or '' if the child has no parent account yet
// (then the table shows the child code to give to the parent instead)
const parentName = (child) => parents.value.find((p) => p.id === child.parentId)?.name || ''

// ---------- Search ----------
const search = ref('')

// The children that match the search box (all of them when the box is empty).
// A child matches if the text appears in their name, level, school or any of their needs.
const filteredChildren = computed(() => {
  const text = search.value.trim().toLowerCase()
  if (!text) return children.value
  return children.value.filter((c) =>
    [c.name, c.level, c.school, c.linkCode, ...(c.needs || [])].some((field) =>
      String(field ?? '')
        .toLowerCase()
        .includes(text),
    ),
  )
})

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
  // [...] makes a copy of the needs list, so ticking boxes doesn't change the table before saving.
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
      // Editing: PUT /children/:id, then swap the old row for the updated child
      const res = await api.put(`/children/${editingId.value}`, form.value)
      const others = children.value.filter((c) => c.id !== editingId.value)
      children.value = sortByName([...others, res.data])
      successMessage.value = `${res.data.name} was updated.`
    } else {
      // Adding: POST /children, then add the new child to the table
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
    // Remove the row from the table
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
  <div class="container py-4">
    <PageHeader title="Children" subtitle="Everyone enrolled at the centre.">
      <button class="btn btn-primary" data-test="add-child" @click="openAdd">
        <i class="bi bi-plus-lg me-1"></i>Add child
      </button>
    </PageHeader>

    <div v-if="successMessage" class="alert alert-success small" data-test="children-success">
      {{ successMessage }}
    </div>

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <!-- Search box -->
      <div class="mb-3">
        <label for="child-search" class="visually-hidden">Search children</label>
        <div class="input-group">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input
            id="child-search"
            v-model="search"
            type="search"
            class="form-control"
            placeholder="Search by name, level, school or need..."
            data-test="child-search"
          />
        </div>
        <div v-if="search.trim()" class="small lapis-muted mt-1" data-test="child-search-count">
          Showing {{ filteredChildren.length }} of {{ children.length }} children
        </div>
      </div>

      <StateMessage
        v-if="children.length === 0"
        type="empty"
        message='No children yet. Click "Add child" to enrol the first one.'
      />
      <StateMessage
        v-else-if="filteredChildren.length === 0"
        type="empty"
        :message="`No children match &quot;${search.trim()}&quot;.`"
      >
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="search = ''">
          Clear search
        </button>
      </StateMessage>

      <template v-else>
        <!-- Phones: one card per child (the table is too wide for a 375px screen) -->
        <div class="d-md-none">
          <div
            v-for="c in filteredChildren"
            :key="c.id"
            class="lapis-card p-3 mb-2"
            data-test="child-card"
          >
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-semibold"><ChildAvatar :avatar="c.avatar" /> {{ c.name }}</div>
                <div class="small lapis-muted">
                  {{ c.level }}<span v-if="c.school"> · {{ c.school }}</span>
                </div>
              </div>
              <span v-if="c.volunteerIds.length" class="small text-nowrap">
                <i class="bi bi-people me-1"></i>{{ c.volunteerIds.length }}
              </span>
              <span v-else class="badge badge-danger-soft">Unassigned</span>
            </div>
            <div v-if="c.needs?.length" class="mt-2">
              <span v-for="n in c.needs" :key="n" class="badge badge-soft me-1">{{ n }}</span>
            </div>
            <div class="small mt-2">
              <template v-if="c.parentId">
                <i class="bi bi-house-heart me-1"></i>{{ parentName(c) || 'Parent linked' }}
              </template>
              <template v-else>
                Child code for parent:
                <code class="fw-bold" data-test="child-code">{{ c.linkCode }}</code>
              </template>
            </div>
            <div class="d-flex gap-2 mt-3">
              <RouterLink
                :to="{ name: 'child-profile', params: { id: c.id } }"
                class="btn btn-sm btn-outline-primary flex-grow-1"
              >
                View
              </RouterLink>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                :aria-label="`Edit ${c.name}`"
                title="Edit"
                @click="openEdit(c)"
              >
                <i class="bi bi-pencil"></i>
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger"
                :aria-label="`Delete ${c.name}`"
                title="Delete"
                @click="openDelete(c)"
              >
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Tablet and up: the table -->
        <div class="lapis-card table-responsive d-none d-md-block">
          <table class="table align-middle mb-0">
            <thead>
              <tr>
                <th>Child</th>
                <th>Level</th>
                <th>Needs</th>
                <th>Volunteers</th>
                <th>Parent</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in filteredChildren" :key="c.id" data-test="child-row">
                <td><ChildAvatar :avatar="c.avatar" /> {{ c.name }}</td>
                <td>{{ c.level }}</td>
                <td>
                  <span v-for="n in c.needs" :key="n" class="badge badge-soft me-1">{{ n }}</span>
                </td>
                <td>
                  <span v-if="c.volunteerIds.length">{{ c.volunteerIds.length }}</span>
                  <span v-else class="badge badge-danger-soft">Unassigned</span>
                </td>
                <td>
                  <span v-if="c.parentId" class="small">{{ parentName(c) || 'Linked' }}</span>
                  <!-- No parent yet: show the code the centre gives the parent for sign up -->
                  <span v-else class="small text-nowrap" title="Give this code to the parent">
                    Code: <code class="fw-bold" data-test="child-code">{{ c.linkCode }}</code>
                  </span>
                </td>
                <td class="text-end text-nowrap">
                  <RouterLink
                    :to="{ name: 'child-profile', params: { id: c.id } }"
                    class="btn btn-sm btn-outline-primary"
                  >
                    View
                  </RouterLink>
                  <!-- Icon-only buttons keep the row short on phones; aria-label is read out by screen readers -->
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary ms-1"
                    :aria-label="`Edit ${c.name}`"
                    title="Edit"
                    data-test="edit-child"
                    @click="openEdit(c)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger ms-1"
                    :aria-label="`Delete ${c.name}`"
                    title="Delete"
                    data-test="delete-child"
                    @click="openDelete(c)"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

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
              <div v-if="saveError" class="alert alert-danger small" data-test="child-form-error">
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
                    >School <span class="lapis-muted">(optional)</span></label
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
                  >Parent <span class="lapis-muted">(optional)</span></label
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
                    <label class="btn btn-sm btn-outline-primary" :for="`need-${i}`">{{
                      skill
                    }}</label>
                  </template>
                </div>
              </fieldset>

              <template v-if="!editingId">
                <hr class="my-3" />
                <p class="small lapis-muted mb-2">
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
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="saving"
                @click="closeModal"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="saving"
                data-test="save-child"
              >
                <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
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
              <div
                v-if="deleteError"
                class="alert alert-danger small"
                data-test="delete-child-error"
              >
                {{ deleteError }}
              </div>
              <p class="mb-2">
                This will also permanently delete
                <strong
                  >all of {{ childToDelete.name }}'s sessions, homework, messages and their
                  login</strong
                >.
              </p>
              <p class="mb-0 text-danger small">
                <i class="bi bi-exclamation-triangle me-1"></i>This cannot be undone.
              </p>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="deleting"
                @click="closeDelete"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-danger"
                :disabled="deleting"
                data-test="confirm-delete"
                @click="confirmDelete"
              >
                <span v-if="deleting" class="spinner-border spinner-border-sm me-2"></span>
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
