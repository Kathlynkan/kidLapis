<!-- =============================================================
  NavBar — shows different links for each role.      Owner: Kai Sen
  The logo and the links are on the left, and the user is on the right (the name opens the profile page, where the user logs out).
  On a small screen the links and the user hide behind a menu button.
============================================================= -->
<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import '@/css/main/stripes.css' // the colours and the size of the stripes under the bar
import '@/css/main/navbar.css' // the bar

const auth = useAuthStore()
const route = useRoute()
const menuOpen = ref(false) // on a small screen the menu is hidden until this is true

// every time the user goes to another page: close the menu, look for new messages and for the photo of a child
watch(() => route.fullPath, () => {
  menuOpen.value = false
  fetchUnread()
  fetchPhoto()
})

const LINKS = {
  volunteer: [], // the Kids Lapis logo goes to the home page of the volunteer, so there is no link here
  teacher: [
    { to: '/teacher', label: 'Dashboard' },
    { to: '/teacher/children', label: 'Children' },
    { to: '/teacher/volunteers', label: 'Volunteers' },
    { to: '/teacher/matchmaking', label: 'Matchmaking' },
    { to: '/messages', label: 'Messages' },
    { to: '/teacher/schedule', label: 'Schedule'},
  ],
  parent: [
    { to: '/parent', label: 'My Child' },
    { to: '/messages', label: 'Messages' },
  ],
  child: [
    { to: '/child', label: 'My Quests' },
    { to: '/child/leaderboard', label: 'Leaderboard' },
  ],
}

const links = computed(() => LINKS[auth.role] || [])

// the layers of the cake, in order. A role shows the layers up to its own: a parent has one stripe, a volunteer has two.
// A child keeps the colours of the pages before it: its own pink on top and the teacher's lavender as the last layer.
// The other roles have one stripe in their own colour for now.
const LAYERS = ['parent', 'volunteer']
const CHILD_LAYERS = ['child', 'volunteer', 'parent', 'teacher']
const stripes = computed(() => {
  if (auth.role === 'child') return CHILD_LAYERS.map((layer) => `var(--layer-${layer})`)
  const place = LAYERS.indexOf(auth.role)
  if (place < 0) return ['var(--role-accent)']
  return LAYERS.slice(0, place + 1).map((layer) => `var(--layer-${layer})`)
})

// true when this link is the page we are on.
// The messages page has a child in its address (/messages/c_1), so a link counts as open for its own address
// and for the addresses under it. A link that has other links under it (the teacher's Dashboard) is only open on its own address.
function isOpen(link) {
  if (route.path === link.to) return true
  const hasLinksUnderIt = links.value.some((other) => other.to.startsWith(link.to + '/'))
  if (hasLinksUnderIt) return false
  return route.path.startsWith(link.to + '/')
}

// the first letter of the user's name (not of a title like Ms or Mr), shown in the round avatar
const initial = computed(() => {
  if (!auth.user) return ''
  const name = auth.user.name.replace(/^(mr|mrs|ms|mdm|miss|dr)\.?\s+/i, '')
  return name.charAt(0).toUpperCase()
})

// the photo of a child, shown in the round avatar instead of the letter (it is saved on the child, not on the user)
const photo = ref('')

async function fetchPhoto() {
  if (auth.role !== 'child' || !auth.user?.childId) {
    photo.value = ''
    return
  }
  try {
    const res = await api.get(`/children/${auth.user.childId}`)
    photo.value = (res.data.avatar || '').startsWith('/') ? res.data.avatar : ''
  } catch {
    photo.value = '' // the letter is shown instead
  }
}

// how many messages the user has not read yet (shown next to Messages)
const unreadTotal = ref(0)

async function fetchUnread() {
  if (!auth.isLoggedIn || !['teacher', 'parent'].includes(auth.role)) return
  try {
    const res = await api.get('/messages/unread')
    unreadTotal.value = Object.values(res.data).reduce((a, b) => a + b, 0)
  } catch {
    // the number is not important, so we ignore errors
  }
}

onMounted(() => {
  fetchUnread()
  fetchPhoto()
})
</script>

<template>
  <nav class="lapis-nav sticky-top">
    <div class="container lapis-nav-inner">
      <RouterLink class="lapis-brand" :to="auth.homePath">
        <img src="/logo.webp" alt="" width="38" height="38" />
        Kids Lapis
      </RouterLink>

      <!-- the menu button (only shown on a small screen) -->
      <button type="button" class="lapis-burger" aria-label="Menu" :aria-expanded="menuOpen" data-test="nav-burger" @click="menuOpen = !menuOpen">
        <i class="bi" :class="menuOpen ? 'bi-x-lg' : 'bi-list'"></i>
      </button>

      <div class="lapis-menu" :class="{ open: menuOpen }">
        <!-- the links, on the left next to the logo -->
        <div class="lapis-links">
          <RouterLink v-for="link in links" :key="link.to" class="lapis-nav-link" :class="{ open: isOpen(link) }" :to="link.to">
            {{ link.label }}
            <span v-if="link.to === '/messages' && unreadTotal > 0" class="lapis-badge">{{ unreadTotal }}</span>
          </RouterLink>
        </div>

        <!-- the user, on the right -->
        <div v-if="auth.isLoggedIn" class="lapis-user">
          <RouterLink to="/profile" class="lapis-user-link" data-test="nav-profile">
            <span class="lapis-avatar">
              <img v-if="photo" :src="photo" alt="" />
              <template v-else>{{ initial }}</template>
            </span>
            <span class="lapis-who">
              <b>{{ auth.user.name }}</b>
              <small>{{ auth.role }}</small>
            </span>
          </RouterLink>
        </div>

        <div v-else class="lapis-user">
          <RouterLink class="lapis-button" to="/login">Log in</RouterLink>
          <RouterLink class="lapis-button lapis-button-filled" to="/signup">Sign up</RouterLink>
        </div>
      </div>
    </div>

    <!-- the stripes: the same on every page of a role -->
    <div class="role-stripes" aria-hidden="true">
      <i v-for="colour in stripes" :key="colour" :style="{ background: colour }"></i>
    </div>
  </nav>
</template>
