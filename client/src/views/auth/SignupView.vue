<!-- =============================================================
  Sign up page (volunteers and parents).              Owner: Kai Sen
  Done: checks on the page (name, email format, password >= 8, passwords match)
        with .is-invalid on the box and the problem written under it. The server checks again.
        Volunteers pick their skills + available days (used by matchmaking).
        Parents can enter the child code from the centre to link to their child.
============================================================= -->
<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/services/api'
import { validateSignup, MIN_PASSWORD_LENGTH } from '@/utils/validation'
import { SKILL_OPTIONS, DAYS } from '@/utils/constants'
import '@/css/main/components.css' // the look of the small parts (the error message)
import '@/css/main/authpage.css' // the look of this page and of the log in page

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  // /signup?role=parent (the Parent card on the home page) starts with Parent chosen; anything else: Volunteer
  role: route.query.role === 'parent' ? 'parent' : 'volunteer',
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
  <div class="container py-4 authpage signuppage">
    <div class="auth-box">
      <div class="board">
        <div class="auth-card">
          <header>
            <h1 class="page-title">Create an account</h1>
            <p class="page-subtitle">Coordinators create child accounts for the centre.</p>
          </header>

          <div v-if="error" class="state-error" role="alert" data-test="signup-error">
            <i class="bi bi-exclamation-triangle"></i>{{ error }}
          </div>

          <!-- novalidate: use our own messages instead of the browser's pop-ups -->
          <form novalidate data-test="signup-form" @submit.prevent="handleSignup">
            <div class="auth-field">
              <span class="auth-label">I am a...</span>
              <div class="choices" role="group">
                <input id="role-vol" v-model="form.role" type="radio" class="tick" value="volunteer" />
                <label class="choice choice-green" for="role-vol"><i class="bi bi-person-heart"></i>Volunteer</label>
                <input id="role-par" v-model="form.role" type="radio" class="tick" value="parent" />
                <label class="choice choice-aqua" for="role-par"><i class="bi bi-house-heart"></i>Parent</label>
              </div>
            </div>

            <div class="auth-field">
              <label for="name" class="auth-label">Full name</label>
              <input
                id="name"
                v-model="form.name"
                class="auth-input"
                :class="{ 'is-invalid': shown.name }"
                autocomplete="name"
                data-test="signup-name"
              />
              <div v-if="shown.name" class="auth-problem">{{ shown.name }}</div>
            </div>

            <div class="auth-field">
              <label for="email" class="auth-label">Email</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                class="auth-input"
                :class="{ 'is-invalid': shown.email }"
                autocomplete="email"
                data-test="signup-email"
              />
              <div v-if="shown.email" class="auth-problem">{{ shown.email }}</div>
            </div>

            <div class="auth-field">
              <label for="password" class="auth-label">Password</label>
              <input
                id="password"
                v-model="form.password"
                type="password"
                class="auth-input"
                :class="{ 'is-invalid': shown.password }"
                autocomplete="new-password"
                aria-describedby="password-help"
                data-test="signup-password"
              />
              <div v-if="shown.password" class="auth-problem">{{ shown.password }}</div>
              <div v-else id="password-help" class="auth-hint">At least {{ MIN_PASSWORD_LENGTH }} characters.</div>
            </div>

            <div class="auth-field">
              <label for="confirm-password" class="auth-label">Confirm password</label>
              <input
                id="confirm-password"
                v-model="form.confirmPassword"
                type="password"
                class="auth-input"
                :class="{ 'is-invalid': shown.confirmPassword }"
                autocomplete="new-password"
                data-test="signup-confirm"
              />
              <div v-if="shown.confirmPassword" class="auth-problem">{{ shown.confirmPassword }}</div>
            </div>

            <!-- Volunteers only: these feed Yu Xuan's skills-based matchmaking -->
            <template v-if="form.role === 'volunteer'">
              <fieldset class="auth-field" data-test="signup-skills">
                <legend class="auth-label">Skills I can help with</legend>
                <div class="chips">
                  <template v-for="(skill, i) in SKILL_OPTIONS" :key="skill">
                    <!-- v-model on an array: ticking adds the skill, unticking removes it -->
                    <input
                      :id="`skill-${i}`"
                      v-model="form.skills"
                      type="checkbox"
                      class="tick"
                      :value="skill"
                      autocomplete="off"
                    />
                    <label class="chip-choice" :for="`skill-${i}`">{{ skill }}</label>
                  </template>
                </div>
                <div v-if="shown.skills" class="auth-problem">{{ shown.skills }}</div>
              </fieldset>

              <fieldset class="auth-field" data-test="signup-days">
                <legend class="auth-label">Days I can come in</legend>
                <div class="chips">
                  <template v-for="day in DAYS" :key="day">
                    <input
                      :id="`day-${day}`"
                      v-model="form.availability"
                      type="checkbox"
                      class="tick"
                      :value="day"
                      autocomplete="off"
                    />
                    <label class="chip-choice" :for="`day-${day}`">{{ day }}</label>
                  </template>
                </div>
                <div v-if="shown.availability" class="auth-problem">{{ shown.availability }}</div>
              </fieldset>
            </template>

            <!-- Parents only: links the new account to their child -->
            <div v-if="form.role === 'parent'" class="auth-field">
              <label for="child-code" class="auth-label"
                >Child code <span class="optional">(optional)</span></label
              >
              <input
                id="child-code"
                v-model="form.childCode"
                class="auth-input code-input"
                :class="{ 'is-invalid': shown.childCode }"
                maxlength="6"
                autocomplete="off"
                placeholder="e.g. K7P3QX"
                aria-describedby="child-code-help"
                data-test="signup-child-code"
              />
              <div v-if="shown.childCode" class="auth-problem">{{ shown.childCode }}</div>
              <div v-else id="child-code-help" class="auth-hint">
                The 6-character code from your child's centre. No code yet? Leave it blank and the
                centre can link your child later.
              </div>
            </div>

            <button type="submit" class="auth-submit" :disabled="loading" data-test="signup-submit">
              {{ loading ? 'Signing up...' : 'Sign up' }}
            </button>
          </form>

          <p class="auth-small">Already have an account? <RouterLink to="/login">Log in</RouterLink></p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* INTERNAL CSS: only this page uses these styles, so they live here in the .vue file. (CSS shared by several pages is in src/css/.) */

/* The sign up page (SignupView.vue). The card, the title, the boxes and the buttons are shared with the log in page
   (css/main/authpage.css). Here are only the two choices (Volunteer, Parent), the round chips (skills and days) and the code box. */

/* the radio buttons and the tick boxes are hidden: their labels are what you see and press */
.signuppage .tick {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.signuppage fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.signuppage legend {
  float: none;
  width: auto;
  margin-bottom: 7px;
  padding: 0;
}

/* ---------- I am a...: two big choices in the colour of the role ---------- */

.signuppage .choices {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.signuppage .choice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 14px;
  color: #4A3F3A;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

/* not chosen: the pale colour. chosen: the colour of the role with a darker edge */
.signuppage .choice-green {
  background: #E1F2E9;
}

.signuppage .choice-aqua {
  background: #DDF0EF;
}

.signuppage .tick:checked + .choice-green {
  background: #9BD3B2;
  box-shadow: inset 0 0 0 2px #6FB38C;
}

.signuppage .tick:checked + .choice-aqua {
  background: #AED9D8;
  box-shadow: inset 0 0 0 2px #7FBDBB;
}

/* ---------- skills and days: round chips, lavender when ticked ---------- */

.signuppage .chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.signuppage .chip-choice {
  padding: 6px 16px;
  border-radius: 999px;
  background: #F0EAF8;
  color: #4A3F3A;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.signuppage .tick:checked + .chip-choice {
  background: #D5CBEA;
  box-shadow: inset 0 0 0 1.5px #B8A9DD;
}

.signuppage .tick:focus + .choice,
.signuppage .tick:focus + .chip-choice {
  outline: 2px solid #4A3F3A;
  outline-offset: 2px;
}

/* ---------- the child code ---------- */

.signuppage .code-input {
  text-transform: uppercase;
}

.signuppage .optional {
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}
</style>
