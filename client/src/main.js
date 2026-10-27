import { createApp } from 'vue'
import { createPinia } from 'pinia' 
// Pinia is a Vue library that acts like a shared storage area for the whole app, 
// so pages and components can access the same data without constantly passing props around.

import 'bootstrap/dist/css/bootstrap.min.css' // bootstrap css
import 'bootstrap/dist/js/bootstrap.bundle.min.js' // bootstrap js
import 'bootstrap-icons/font/bootstrap-icons.css' // bootstrap icons
import './css/main/main.css'

import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './services/api' // api.js contains backend-related code
import { useAuthStore } from './stores/auth' // Pinia 'store' that stores authentication data

const app = createApp(App) // create App.vue

app.use(createPinia()) // enable Pinia
app.use(router) // enable router

// If the server says our token is no longer valid (401), log out and go to /login
setUnauthorizedHandler(() => {
  const auth = useAuthStore() // open shared authentication storage
  auth.clearSession() // clear login session
  router.push({ name: 'login', query: { expired: '1' } }) // redirect user to /login?expired=1
})

app.mount('#app')
