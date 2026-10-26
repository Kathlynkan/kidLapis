<!-- =============================================================
  Login page - WORKING, use it as the reference for forms.   Owner: Kai Sen
  Pattern: v-model inputs -> async submit -> loading + error states -> router.push
  TODO (Kai Sen):
    [x] show/hide password toggle
============================================================= -->
<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/services/api'

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
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-sm-10 col-md-7 col-lg-5">
        <div class="cb-card p-4 p-md-5">
          <h1 class="h3 mb-1">Welcome back</h1>
          <p class="text-muted-cb mb-4">Log in to continue to Kids Lapis.</p>

          <div v-if="route.query.expired" class="alert alert-warning small">
            Your session expired. Please log in again.
          </div>
          <div v-if="error" class="alert alert-danger small" data-test="login-error">
            {{ error }}
          </div>

          <form @submit.prevent="handleLogin">
            <div class="mb-3">
              <label for="email" class="form-label">Email</label>
              <input
                id="email"
                v-model.trim="email"
                type="email"
                class="form-control"
                required
                autocomplete="username"
              />
            </div>
            <div class="mb-4">
              <label for="password" class="form-label">Password</label>
              <div class="input-group">
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="form-control"
                  required
                  autocomplete="current-password"
                />
                <!-- No "password" in this button's name: the E2E tests find the box with
                     getByLabel('Password'), which would also match a "Show password" button -->
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :aria-pressed="showPassword"
                  data-test="toggle-password"
                  @click="showPassword = !showPassword"
                >
                  <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'" class="me-1"></i>
                  {{ showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>
            <button type="submit" class="btn btn-primary w-100" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
              Log in
            </button>
          </form>

          <p class="small text-center mt-3 mb-0">
            New volunteer or parent? <RouterLink to="/signup">Create an account</RouterLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
