<script setup>
import { computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

const appClasses = computed(() => {
  return ['lapis-app', `role-${auth.role || 'guest'}`]
})

// The pop-ups are moved to the end of the body, outside the app, so the body has the role class too and they get the role's colours.
watch(
  () => auth.role,
  (role, oldRole) => {
    if (oldRole) document.body.classList.remove(`role-${oldRole}`)
    if (role) document.body.classList.add(`role-${role}`)
  },
  { immediate: true },
)
</script>

<template>
  <div :class="appClasses">
  <NavBar />
  <main class="app-main">
    <RouterView v-slot="{ Component }">
      <Transition name="page-peel">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </main>
  <footer class="app-footer text-center py-3">
    Kids Lapis &middot; IS216 WAD2 Group Project
  </footer>
  </div>
</template>
