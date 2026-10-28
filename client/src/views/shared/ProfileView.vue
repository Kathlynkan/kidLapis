<!-- =============================================================
  Profile - every logged-in user can view and edit their own profile.
  All roles: name + password change.
  Volunteer:  + skills and available days (used by matchmaking).
  Child:      avatar picker (name is managed by the teacher).
============================================================= -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import PeelCard from '@/components/PeelCard.vue'
import { SKILL_OPTIONS, DAYS } from '@/utils/constants'
import '@/css/main/profilepage.css' // the look of this page (the same for every role, only the colours change)

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
const gender = ref(auth.user?.gender || 'girl')

// the first letter of the name (not of a title like Mrs), shown in a round picture
const initial = computed(() => (auth.user?.name || '').replace(/^(mr|mrs|ms|mdm|miss|dr)\.?\s+/i, '').charAt(0).toUpperCase())

const loading = ref(false)
const error = ref('')
const activeCard = ref('account')

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

// log out and go to the login page
async function logout() {
  await auth.logout()
  router.push('/login')
}

async function save() {
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
  if (auth.role === 'child') {
    body.avatar = avatar.value
    body.gender = gender.value
  }

  loading.value = true
  try {
    const res = await api.put('/auth/profile', body)
    auth.patchUser(res.data)
    router.back()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container py-4 profilepage">
    <PageHeader title="My Profile" />

    <div class="row justify-content-center">
      <div class="col-md-7 col-lg-6">

        <div v-if="error" class="alert alert-danger" data-test="profile-error">{{ error }}</div>

        <form data-test="profile-form" @submit.prevent="save">

          <!-- Account info -->
          <PeelCard title="Account" icon="bi-person-circle" :open="activeCard === 'account'" @toggle="activeCard = 'account'">
            <div class="d-flex align-items-center gap-3 mb-4">
              <span v-if="auth.role === 'child'" class="fs-1 lh-1">{{ avatar }}</span>
              <span v-else class="profile-initial">{{ initial }}</span>
              <div>
                <div class="fw-semibold">{{ auth.user?.name }}</div>
                <div class="small lapis-muted">{{ auth.user?.email }}</div>
                <span class="badge badge-soft text-capitalize mt-1">{{ auth.role }}</span>
              </div>
            </div>

            <div v-if="auth.role === 'child'" class="mt-3">
              <label class="form-label d-block mb-2">Theme colour</label>
              <div class="d-flex gap-2">
                <input id="gender-girl" v-model="gender" type="radio" class="btn-check" value="girl" autocomplete="off" />
                <label class="btn btn-sm gender-swatch gender-swatch-girl" for="gender-girl">Pink</label>
                <input id="gender-boy" v-model="gender" type="radio" class="btn-check" value="boy" autocomplete="off" />
                <label class="btn btn-sm gender-swatch gender-swatch-boy" for="gender-boy">Blue</label>
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
          <PeelCard v-if="auth.role === 'child'" title="Pick your avatar" icon="bi-emoji-smile" :open="activeCard === 'avatar'" @toggle="activeCard = 'avatar'">
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
          <PeelCard v-if="auth.role !== 'child'" title="Change password" icon="bi-shield-lock" :open="activeCard === 'password'" @toggle="activeCard = 'password'">
            <p class="small lapis-muted mb-3">Leave blank to keep your current password.</p>

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
          <PeelCard v-if="auth.role === 'volunteer'" title="Skills &amp; schedule" icon="bi-calendar-check" :open="activeCard === 'skills'" @toggle="activeCard = 'skills'">
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

        <!-- log out: at the bottom of the page -->
        <div class="mt-4 pt-3 border-top">
          <button type="button" class="btn btn-outline-secondary" data-test="logout" @click="logout">Log out</button>
        </div>
      </div>
    </div>
  </div>
</template>
