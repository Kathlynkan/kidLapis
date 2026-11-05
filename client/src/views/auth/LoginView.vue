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
            <h1 class="page-title">Welcome Back</h1>
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
<!-- The Show / Hide button uses .lapis-button from NavBar.vue (the same style as Log in / Sign up), so no copy here -->
