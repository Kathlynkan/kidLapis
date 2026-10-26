// =============================================================
// Auth store (Pinia)                       Owner: Kai Sen
// -------------------------------------------------------------
// Any component can do:
//   import { useAuthStore } from '@/stores/auth'
//   const auth = useAuthStore()
//   auth.user.name, auth.role, auth.isLoggedIn, auth.logout()
//
// The token + user are saved in sessionStorage (Week 6) so a page
// refresh does not log you out. Closing the tab does log you out.
// =============================================================
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '@/services/api'

// Where each role lands after logging in
export const ROLE_HOME = {
  volunteer: '/volunteer',
  teacher: '/teacher',
  parent: '/parent',
  child: '/child',
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(sessionStorage.getItem('cb_token'))
  const user = ref(JSON.parse(sessionStorage.getItem('cb_user') || 'null'))

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const role = computed(() => user.value?.role || null)
  const homePath = computed(() => ROLE_HOME[role.value] || '/')

  function saveSession(data) {
    token.value = data.token
    user.value = data.user
    sessionStorage.setItem('cb_token', data.token)
    sessionStorage.setItem('cb_user', JSON.stringify(data.user))
  }

  function clearSession() {
    token.value = null
    user.value = null
    sessionStorage.removeItem('cb_token')
    sessionStorage.removeItem('cb_user')
  }

  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    saveSession(response.data)
  }

  async function signup(form) {
    const response = await api.post('/auth/signup', form)
    saveSession(response.data)
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore - we are logging out anyway
    }
    clearSession()
  }

  function patchUser(updated) {
    user.value = { ...user.value, ...updated }
    sessionStorage.setItem('cb_user', JSON.stringify(user.value))
  }

  return { token, user, isLoggedIn, role, homePath, login, signup, logout, clearSession, patchUser }
})
