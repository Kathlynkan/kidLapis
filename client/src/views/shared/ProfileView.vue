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
import ChildAvatar from '@/components/ChildAvatar.vue'
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
              <span v-if="auth.role === 'child'" class="fs-1 lh-1"><ChildAvatar :avatar="avatar" /></span>
              <span v-else class="profile-initial">{{ initial }}</span>
              <div>
                <div class="fw-semibold">{{ auth.user?.name }}</div>
                <div class="small lapis-muted">{{ auth.user?.email }}</div>
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

<style>
/* INTERNAL CSS: only this page uses these styles, so they live here in the .vue file. (CSS shared by several pages is in src/css/.) */

/* Styles for the profile page (ProfileView.vue). Every role has the same look, only the colours change.
   The colours of each role are the variables just below (the names start with --pf).
   The child uses the accent colour of the role (--role-accent in main.css); the parent, volunteer and teacher have their own blocks.
   Look: no dark outlines, soft corners, bold small captions, and buttons with small corners (Cancel and Log out are the light colour, Save is the main colour).
   To change a colour for one role, change it in that role's block. To change the look, change the rules after the blocks. */

/* ---------- the colours of each role ---------- */

/* child: the accent of the role on warm brown text */
.profilepage {
  --pf-text: var(--lapis-plum);
  /* text */
  --pf-title: var(--lapis-plum);
  /* the page title */
  --pf-muted: var(--lapis-muted);
  /* small text */
  --pf-card: #FFFFFF;
  /* the sections */
  --pf-shadow: rgba(74, 63, 58, 0.1);
  /* the shadow under a section */
  --pf-line: var(--lapis-cream-dark);
  /* the line around a box and between things */
  --pf-focus: var(--role-accent);
  /* the line of a box you are typing in */
  --pf-main: var(--role-accent);
  /* Save, the chosen skills and days, the ring of a box you are typing in */
  --pf-main-hover: #CC8DA2;
  --pf-soft: var(--role-accent-soft);
  /* the role tag, Log out, Cancel */
  --pf-soft-hover: #EBDAE2;
  --pf-ok: var(--topic-academic);
  /* the message after you save */
  --pf-error: var(--topic-alert);
  font-family: var(--lapis-font);
  font-size: 15px;
  line-height: 1.55;
  color: var(--pf-text);
}

.role-parent .profilepage {
  --pf-text: #414F67;
  --pf-title: #414F67;
  --pf-muted: #5E6C80;
  --pf-card: #FFFFFF;
  --pf-shadow: rgba(65, 79, 103, 0.1);
  --pf-line: #CFE0DE;
  --pf-focus: #AED9D8;
  --pf-main: #AED9D8;
  --pf-main-hover: #9BCFCE;
  --pf-soft: #DDF0EF;
  --pf-soft-hover: #CFE7E5;
  --pf-ok: #CDE8D2;
  --pf-error: #F6D1AA;
}

.role-volunteer .profilepage {
  --pf-text: #213C31;
  --pf-title: #446C59;
  --pf-muted: #6B8177;
  --pf-card: #FFFFFF;
  --pf-shadow: rgba(33, 60, 49, 0.1);
  --pf-line: #C3D2CA;
  --pf-focus: #4A735F;
  --pf-main: #B7D8D7;
  --pf-main-hover: #A3CAC8;
  --pf-soft: #CDE9D8;
  --pf-soft-hover: #9BD3B2;
  --pf-ok: #CDE9D8;
  --pf-error: #EE9F96;
}

/* the teacher: lavender, the same as the other teacher pages (teacherpage.css) */
.role-teacher .profilepage {
  --pf-text: #3D3454;
  --pf-title: #5B4B8A;
  --pf-muted: #7D7690;
  --pf-card: #FFFFFF;
  --pf-shadow: rgba(61, 52, 84, 0.1);
  --pf-line: #E3DBF0;
  --pf-focus: #6B5CA5;
  --pf-main: #D5CBEA;
  --pf-main-hover: #C7BBE0;
  --pf-soft: #F0EAF8;
  --pf-soft-hover: #E6DDF4;
  --pf-ok: #E6F4EC;
  --pf-error: #EE9F96;
}

/* ---------- the base text and the title ---------- */

/* the page title (PageHeader.vue is shared, so only its colour and font are set here) */
.profilepage .lapis-page-header .page-title {
  font-family: inherit;
  color: var(--pf-title);
}

/* the round picture with the first letter of the name, in the colour of the role */
.profilepage .profile-initial {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--role-accent, #AED9D8);
  font-size: 20px;
  font-weight: 700;
}

.profilepage .lapis-muted {
  color: var(--pf-muted);
}

/* ---------- the sections (PeelCard.vue) ---------- */

.profilepage .peel-card {
  border: 0;
  border-radius: 22px;
  background: var(--pf-card);
  box-shadow: 0 1px 6px var(--pf-shadow);
  overflow: hidden;
}

/* the little stripe on the edge of a shared card is not used here */
.profilepage .peel-card::before {
  display: none;
}

.profilepage .peel-header,
.profilepage .peel-header:hover {
  background: transparent;
}

.profilepage .peel-card--open .peel-header {
  border-bottom: 1px solid var(--pf-line);
}

.profilepage .peel-title {
  color: var(--pf-text);
  font-size: 17px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
}

.profilepage .peel-arrow {
  color: var(--pf-text);
}

/* ---------- the boxes you type in ---------- */

.profilepage .form-label {
  color: var(--pf-text);
  font-size: 14px;
  font-weight: 700;
}

/* the headings of the skills and the days have the bootstrap class fs-6, which is important */
.profilepage legend.form-label {
  font-size: 14px !important;
}

.profilepage .form-control {
  border: 1px solid var(--pf-line);
  border-radius: 14px;
  background: #FFFFFF;
  color: var(--pf-text);
  box-shadow: none;
}

.profilepage .form-control:focus {
  border-color: var(--pf-focus);
  box-shadow: 0 0 0 3px var(--pf-main);
}

.profilepage .badge-soft {
  border: 0;
  border-radius: 999px;
  background: var(--pf-soft);
  color: var(--pf-text);
}

/* ---------- the skills and the days: separate choices in black text, the chosen ones have the main colour ---------- */

.profilepage .btn-check + .btn {
  padding: 4px 14px;
  border: 1px solid var(--pf-line);
  border-radius: 6px;
  background: #FFFFFF;
  color: #000000;
  font-weight: 600;
}

.profilepage .btn-check + .btn:hover {
  background: var(--pf-soft);
  color: #000000;
}

.profilepage .btn-check:checked + .btn {
  border-color: var(--pf-main);
  background: var(--pf-main);
  color: #000000;
}

/* ---------- the buttons: Save, Cancel and Log out ---------- */

.profilepage .btn {
  border: 0;
  font-family: inherit;
  border-radius: 6px;
  padding: 10px 22px;
  box-shadow: none;
  color: var(--pf-text);
  font-size: 14px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
}

.profilepage .btn-outline-secondary {
  background: var(--pf-soft);
}

.profilepage .btn-primary {
  background: var(--pf-main);
}

.profilepage .btn-outline-secondary:hover {
  background: var(--pf-soft-hover);
}

.profilepage .btn-primary:hover {
  background: var(--pf-main-hover);
}

/* the line above the Log out button (border-top is important in bootstrap, so this is too) */
.profilepage .border-top {
  border-top-color: var(--pf-line) !important;
}

/* ---------- the messages after you save ---------- */

.profilepage .alert {
  border: 0;
  border-radius: 14px;
  color: var(--pf-text);
}

.profilepage .alert-success {
  background: var(--pf-ok);
}

.profilepage .alert-danger {
  background: var(--pf-error);
}
</style>
