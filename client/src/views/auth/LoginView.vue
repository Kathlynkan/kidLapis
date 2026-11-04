<!-- =============================================================
  Login page - WORKING, use it as the reference for forms.   Owner: Kai Sen
  Pattern: v-model inputs -> async submit -> loading + error states -> router.push
  TODO (Kai Sen):
    [x] show/hide password toggle
  The look: one white card on the sandy board, in the middle (css/main/authpage.css, shared with the sign up page).
============================================================= -->
<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/services/api'
import '@/css/main/components.css' // the look of the small parts (the error message)
import '@/css/main/authpage.css' // the look of this page and of the sign up page

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false) // true = show the password as plain text

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    // go back to the page they wanted, or to their role's home page
    router.push(route.query.redirect || auth.homePath)
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container py-4 authpage">
    <div class="auth-box">
      <div class="board">
        <div class="auth-card">
          <header>
            <h1 class="page-title">Welcome back</h1>
            <p class="page-subtitle">Log in to continue to Kids Lapis.</p>
          </header>

          <div v-if="route.query.expired" class="auth-note">Your session expired. Please log in again.</div>
          <div v-if="error" class="state-error" role="alert" data-test="login-error">
            <i class="bi bi-exclamation-triangle"></i>{{ error }}
          </div>

          <form @submit.prevent="handleLogin">
            <div class="auth-field">
              <label for="email" class="auth-label">Email</label>
              <input
                id="email"
                v-model.trim="email"
                type="email"
                class="auth-input"
                required
                autocomplete="username"
                data-test="login-email"
              />
            </div>
            <div class="auth-field">
              <label for="password" class="auth-label">Password</label>
              <div class="auth-password">
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="auth-input"
                  required
                  autocomplete="current-password"
                  data-test="login-password"
                />
                <!-- No "password" in this button's name: the E2E tests find the box with
                     getByLabel('Password'), which would also match a "Show password" button -->
                <button
                  type="button"
                  class="auth-show lapis-button"
                  :aria-pressed="showPassword"
                  data-test="toggle-password"
                  @click="showPassword = !showPassword"
                >
                  <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  {{ showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>
            <button type="submit" class="auth-submit" data-test="login-submit" :disabled="loading">
              {{ loading ? 'Logging in...' : 'Log in' }}
            </button>
          </form>

          <p class="auth-small">
            New volunteer or parent? <RouterLink to="/signup">Create an account</RouterLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lapis-button {
  padding: 4px 10px;
  border: 0;
  border-radius: 6px;
  background: #FFFFFF;
  box-shadow: inset 0 0 0 1.5px var(--role-accent, #D5CBEA);
  color: #4A3F3A;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.lapis-button:hover {
  background: var(--role-accent-soft, #EAF6F5);
}

.lapis-button-filled {
  background: #E8A0B8;
  box-shadow: none;
}
</style>