<!-- =============================================================
  Profile - every logged-in user can view and edit their own profile.
  All roles: name + password change.
  Volunteer:  + skills and available days (used by matchmaking).
  Child:      avatar picker (name is managed by the teacher).
============================================================= -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import PeelCard from '@/components/PeelCard.vue'
import { SKILL_OPTIONS, DAYS } from '@/utils/constants'

const auth = useAuthStore()
const router = useRouter()

const AVATARS = [
  '🙂', '😊', '😄', '😎', '🤩', '🥳', '😸',
  '🐻', '🐼', '🦊', '🦁', '🐯', '🐸', '🐙',
  '🦋', '⭐', '🌟', '🚀', '🎮', '⚽',
]

const name = ref(auth.user?.name || '')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const skills = ref([...(auth.user?.skills || [])])
const availability = ref([...(auth.user?.availability || [])])
const avatar = ref('🙂')

const loading = ref(false)
const success = ref('')
const error = ref('')

onMounted(async () => {
  if (auth.role === 'child') {
    try {
      const res = await api.get('/children')
      avatar.value = res.data[0]?.avatar || '🙂'
    } catch { /* silent */ }
  }
})

function cancel() {
  router.back() // return user to wherever they came from
}

async function save() {
  success.value = ''
  error.value = ''

  if (auth.role !== 'child' && !name.value.trim()) {
    error.value = 'Name is required.'
    return
  }
  if (newPassword.value) {
    if (!currentPassword.value) {
      error.value = 'Enter your current password to set a new one.'
      return
    }
    if (newPassword.value.length < 8) {
      error.value = 'New password must be at least 8 characters.'
      return
    }
    if (newPassword.value !== confirmPassword.value) {
      error.value = 'New passwords do not match.'
      return
    }
  }

  const body = {}
  if (auth.role !== 'child') body.name = name.value.trim()
  if (newPassword.value) {
    body.currentPassword = currentPassword.value
    body.newPassword = newPassword.value
  }
  if (auth.role === 'volunteer') {
    body.skills = skills.value
    body.availability = availability.value
  }
  if (auth.role === 'child') body.avatar = avatar.value

  loading.value = true
  try {
    const res = await api.put('/auth/profile', body)
    auth.patchUser(res.data)
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    success.value = 'Profile updated.'
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container py-4">
    <PageHeader title="My Profile" />

    <div class="row justify-content-center">
      <div class="col-md-7 col-lg-6">

        <div v-if="success" class="alert alert-success" data-test="profile-success">{{ success }}</div>
        <div v-if="error" class="alert alert-danger" data-test="profile-error">{{ error }}</div>

        <form data-test="profile-form" @submit.prevent="save">

          <!-- Account info -->
          <PeelCard title="Account" icon="bi-person-circle" :initial-open="true">
            <div class="d-flex align-items-center gap-3 mb-4">
              <span class="fs-1 lh-1">{{ auth.role === 'child' ? avatar : '👤' }}</span>
              <div>
                <div class="fw-semibold">{{ auth.user?.name }}</div>
                <div class="small text-muted-cb">{{ auth.user?.email }}</div>
                <span class="badge badge-soft text-capitalize mt-1">{{ auth.role }}</span>
              </div>
            </div>

            <div v-if="auth.role !== 'child'">
              <label for="profile-name" class="form-label">Name</label>
              <input
                id="profile-name"
                v-model.trim="name"
                type="text"
                class="form-control"
                autocomplete="name"
                data-test="profile-name"
              />
            </div>
          </PeelCard>

          <!-- Avatar picker (child only) -->
          <PeelCard v-if="auth.role === 'child'" title="Pick your avatar" icon="bi-emoji-smile" :initial-open="true">
            <div class="d-flex flex-wrap gap-2">
              <button
                v-for="emoji in AVATARS"
                :key="emoji"
                type="button"
                class="btn btn-lg p-2 lh-1"
                :class="avatar === emoji ? 'btn-primary' : 'btn-outline-secondary'"
                data-test="avatar-option"
                @click="avatar = emoji"
              >{{ emoji }}</button>
            </div>
          </PeelCard>

          <!-- Change password (not for child — teacher manages child accounts) -->
          <PeelCard v-if="auth.role !== 'child'" title="Change password" icon="bi-shield-lock" :initial-open="false">
            <p class="small text-muted-cb mb-3">Leave blank to keep your current password.</p>

            <div class="mb-3">
              <label for="current-pw" class="form-label">Current password</label>
              <input
                id="current-pw"
                v-model="currentPassword"
                type="password"
                class="form-control"
                autocomplete="current-password"
              />
            </div>
            <div class="mb-3">
              <label for="new-pw" class="form-label">New password</label>
              <input
                id="new-pw"
                v-model="newPassword"
                type="password"
                class="form-control"
                autocomplete="new-password"
              />
            </div>
            <div class="mb-0">
              <label for="confirm-pw" class="form-label">Confirm new password</label>
              <input
                id="confirm-pw"
                v-model="confirmPassword"
                type="password"
                class="form-control"
                autocomplete="new-password"
              />
            </div>
          </PeelCard>

          <!-- Skills + availability (volunteer only) -->
          <PeelCard v-if="auth.role === 'volunteer'" title="Skills &amp; schedule" icon="bi-calendar-check" :initial-open="true">
            <fieldset class="mb-4">
              <legend class="form-label fs-6 mb-2">Skills I can help with</legend>
              <div class="d-flex flex-wrap gap-2">
                <template v-for="(skill, i) in SKILL_OPTIONS" :key="skill">
                  <input
                    :id="`skill-${i}`"
                    v-model="skills"
                    type="checkbox"
                    class="btn-check"
                    :value="skill"
                    autocomplete="off"
                  />
                  <label class="btn btn-sm btn-outline-primary" :for="`skill-${i}`">{{ skill }}</label>
                </template>
              </div>
            </fieldset>

            <fieldset class="mb-0">
              <legend class="form-label fs-6 mb-2">Days I can come in</legend>
              <div class="d-flex flex-wrap gap-2">
                <template v-for="day in DAYS" :key="day">
                  <input
                    :id="`day-${day}`"
                    v-model="availability"
                    type="checkbox"
                    class="btn-check"
                    :value="day"
                    autocomplete="off"
                  />
                  <label class="btn btn-sm btn-outline-primary" :for="`day-${day}`">{{ day }}</label>
                </template>
              </div>
            </fieldset>
          </PeelCard>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <!-- right-aligned buttons with gap in between and top margin -->
            <button type="button" class="btn btn-outline-secondary" @click="cancel">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="loading" data-test="profile-save">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span> Save changes
            </button>
          </div>

        </form>
      </div>
    </div>
  </div>
</template>
