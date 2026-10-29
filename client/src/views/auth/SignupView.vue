<!-- =============================================================
  Sign up page (volunteers and parents).              Owner: Kai Sen
  Done: checks on the page (name, email format, password >= 8, passwords match)
        with Bootstrap .is-invalid / .invalid-feedback. The server checks again.
        Volunteers pick their skills + available days (used by matchmaking).
        Parents can enter the child code from the centre to link to their child.
============================================================= -->
<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/services/api'
import { validateSignup, MIN_PASSWORD_LENGTH } from '@/utils/validation'
import { SKILL_OPTIONS, DAYS } from '@/utils/constants'

const auth = useAuthStore()
const router = useRouter()

const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'volunteer',
  skills: [], // volunteers only - ticked skill buttons go in here
  availability: [], // volunteers only - ticked days go in here
  childCode: '', // parents only - the code the centre gave them (optional)
})
const submitted = ref(false) // only show red errors after the first "Sign up" click
const loading = ref(false)
const error = ref('') // error from the server, e.g. "email already exists"

// All the field problems, worked out again every time the form changes
const errors = computed(() => validateSignup(form.value))
// Show them only after the first click, so the form doesn't start out red
const shown = computed(() => (submitted.value ? errors.value : {}))

async function handleSignup() {
  submitted.value = true
  error.value = ''
  // Object.keys(...) lists the fields with problems. More than 0 = stop, the red messages show.
  if (Object.keys(errors.value).length > 0) return

  loading.value = true
  try {
    // confirmPassword is only for this page, so don't send it to the server
    const details = {
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      password: form.value.password,
      role: form.value.role,
    }
    // Only volunteers have skills and days (a parent may have ticked some, then switched role)
    if (form.value.role === 'volunteer') {
      details.skills = form.value.skills
      details.availability = form.value.availability
    }
    // Only parents send a child code, and only if they typed one
    if (form.value.role === 'parent' && form.value.childCode.trim()) {
      details.childCode = form.value.childCode.trim().toUpperCase()
    }
    await auth.signup(details)
    loading.value = false // success
    router.push(auth.homePath)
  } catch (err) {
    error.value = errorMessage(err) // e.g. "An account with this email already exists."
    loading.value = false // error
  }
}
</script>

<template>
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-sm-10 col-md-7 col-lg-5">
        <div class="lapis-card p-4 p-md-5">
          <h1 class="h3 mb-1">Create an account</h1>
          <p class="lapis-muted mb-4">Teachers create child accounts for the centre.</p>

          <div v-if="error" class="alert alert-danger small" data-test="signup-error">
            {{ error }}
          </div>

          <!-- novalidate: use our own Bootstrap messages instead of the browser's pop-ups -->
          <form novalidate data-test="signup-form" @submit.prevent="handleSignup">
            <div class="mb-3">
              <span class="form-label d-block">I am a...</span>
              <div class="btn-group w-100" role="group">
                <input
                  id="role-vol"
                  v-model="form.role"
                  type="radio"
                  class="btn-check"
                  value="volunteer"
                />
                <label class="btn btn-outline-primary" for="role-vol">Volunteer</label>
                <input
                  id="role-par"
                  v-model="form.role"
                  type="radio"
                  class="btn-check"
                  value="parent"
                />
                <label class="btn btn-outline-primary" for="role-par">Parent</label>
              </div>
            </div>

            <div class="mb-3">
              <label for="name" class="form-label">Full name</label>
              <input
                id="name"
                v-model="form.name"
                class="form-control"
                :class="{ 'is-invalid': shown.name }"
                autocomplete="name"
                data-test="signup-name"
              />
              <div class="invalid-feedback">{{ shown.name }}</div>
            </div>

            <div class="mb-3">
              <label for="email" class="form-label">Email</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                class="form-control"
                :class="{ 'is-invalid': shown.email }"
                autocomplete="email"
                data-test="signup-email"
              />
              <div class="invalid-feedback">{{ shown.email }}</div>
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">Password</label>
              <input
                id="password"
                v-model="form.password"
                type="password"
                class="form-control"
                :class="{ 'is-invalid': shown.password }"
                autocomplete="new-password"
                aria-describedby="password-help"
                data-test="signup-password"
              />
              <div v-if="!shown.password" id="password-help" class="form-text">
                At least {{ MIN_PASSWORD_LENGTH }} characters.
              </div>
              <div class="invalid-feedback">{{ shown.password }}</div>
            </div>

            <div class="mb-4">
              <label for="confirm-password" class="form-label">Confirm password</label>
              <input
                id="confirm-password"
                v-model="form.confirmPassword"
                type="password"
                class="form-control"
                :class="{ 'is-invalid': shown.confirmPassword }"
                autocomplete="new-password"
                data-test="signup-confirm"
              />
              <div class="invalid-feedback">{{ shown.confirmPassword }}</div>
            </div>

            <!-- Volunteers only: these feed Yu Xuan's skills-based matchmaking -->
            <template v-if="form.role === 'volunteer'">
              <fieldset class="mb-3" data-test="signup-skills">
                <legend class="form-label fs-6 mb-2">Skills I can help with</legend>
                <div class="d-flex flex-wrap gap-2">
                  <template v-for="(skill, i) in SKILL_OPTIONS" :key="skill">
                    <!-- v-model on an array: ticking adds the skill, unticking removes it -->
                    <input
                      :id="`skill-${i}`"
                      v-model="form.skills"
                      type="checkbox"
                      class="btn-check"
                      :value="skill"
                      autocomplete="off"
                    />
                    <label class="btn btn-sm btn-outline-primary" :for="`skill-${i}`">
                      {{ skill }}
                    </label>
                  </template>
                </div>
                <div v-if="shown.skills" class="small text-danger mt-1">{{ shown.skills }}</div>
              </fieldset>

              <fieldset class="mb-4" data-test="signup-days">
                <legend class="form-label fs-6 mb-2">Days I can come in</legend>
                <div class="d-flex flex-wrap gap-2">
                  <template v-for="day in DAYS" :key="day">
                    <input
                      :id="`day-${day}`"
                      v-model="form.availability"
                      type="checkbox"
                      class="btn-check"
                      :value="day"
                      autocomplete="off"
                    />
                    <label class="btn btn-sm btn-outline-primary" :for="`day-${day}`">
                      {{ day }}
                    </label>
                  </template>
                </div>
                <div v-if="shown.availability" class="small text-danger mt-1">
                  {{ shown.availability }}
                </div>
              </fieldset>
            </template>

            <!-- Parents only: links the new account to their child -->
            <div v-if="form.role === 'parent'" class="mb-4">
              <label for="child-code" class="form-label"
                >Child code <span class="lapis-muted">(optional)</span></label
              >
              <input
                id="child-code"
                v-model="form.childCode"
                class="form-control text-uppercase"
                :class="{ 'is-invalid': shown.childCode }"
                maxlength="6"
                autocomplete="off"
                placeholder="e.g. K7P3QX"
                aria-describedby="child-code-help"
                data-test="signup-child-code"
              />
              <div v-if="!shown.childCode" id="child-code-help" class="form-text">
                The 6-character code from your child's centre. No code yet? Leave it blank and the
                centre can link your child later.
              </div>
              <div class="invalid-feedback">{{ shown.childCode }}</div>
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100"
              :disabled="loading"
              data-test="signup-submit"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
              Sign up
            </button>
          </form>

          <p class="small text-center mt-3 mb-0">
            Already have an account? <RouterLink to="/login">Log in</RouterLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
