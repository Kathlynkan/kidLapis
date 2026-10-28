<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

const appClasses = computed(() => {
  const cls = ['lapis-app', `role-${auth.role || 'guest'}`]
  if (auth.role === 'child' && auth.user?.gender) cls.push(`gender-${auth.user.gender}`)
  return cls
})
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
