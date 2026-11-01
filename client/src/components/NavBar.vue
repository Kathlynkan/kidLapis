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

// the layers of the cake, from the bottom up: purple at the bottom, then green, aqua and pink on top.
// A role shows the layers up to its own: a teacher has one stripe (purple), a volunteer has two (purple, green),
// a parent has three (purple, green, aqua) and a child has all four (purple, green, aqua, pink).
const LAYERS = ['teacher', 'volunteer', 'parent', 'child']
const LAYER_COLOURS = { teacher: '#D5CBEA', volunteer: '#9BD3B2', parent: '#AED9D8', child: '#E8A0B8' }
const stripes = computed(() => {
  const place = LAYERS.indexOf(auth.role)
  // a visitor who is not logged in sees all four layers
  const shown = place < 0 ? LAYERS : LAYERS.slice(0, place + 1)
  // the stripes are drawn from the top down, so the bottom layer (purple) comes last
  return [...shown].reverse().map((layer) => LAYER_COLOURS[layer])
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

// the photo shown in the round avatar instead of the letter: a child's photo is saved on the child, everyone else's on the user
const photo = ref('')

async function fetchPhoto() {
  if (auth.role !== 'child' || !auth.user?.childId) {
    photo.value = (auth.user?.avatar || '').startsWith('/') ? auth.user.avatar : ''
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

<style>
/* INTERNAL CSS: only this page uses these styles, so they live here in the .vue file. (CSS shared by several pages is in src/css/.) */

/* The stripes under the navbar (NavBar.vue). They show the layers of the cake, one stripe for each layer.
   Purple is the bottom layer, then green, aqua and pink on top. A role shows the layers up to its own: a teacher has one
   stripe (purple), a volunteer has two (green on purple), a parent has three (aqua on green on purple) and a child has four
   (pink on aqua on green on purple), the whole kueh lapis.
   Every page of a role has the same stripes, because they are part of the navbar.
   The colours are in LAYER_COLOURS in the script above (pink, aqua, mint and purple, the palette in main.css).
   To add a layer for another role: add its colour there and its name to LAYERS in NavBar.vue. */

.role-stripes i {
  display: block;
  height: 5px;
}

/* The navbar (NavBar.vue): a cream bar with the links, the user and the menu button on a small screen.
   The stripes under it are styled in the style block at the bottom of this file, and their colours are the colours of the user's role. */

.lapis-nav {
  background: #FDFAF4;
  color: #414F67;
  font-family: 'Inter', system-ui, 'Segoe UI', sans-serif;
}

.lapis-nav-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 58px;
}

.lapis-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 16px;
  color: #414F67;
  font-size: 19px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

/* the menu: one row on a wide screen */
.lapis-menu {
  display: flex;
  align-items: center;
  align-self: stretch;
  flex: 1;
  min-width: 0;
}

.lapis-links {
  display: flex;
  align-self: stretch;
  justify-content: flex-start;
  flex: 1;
  gap: 2px;
}

.lapis-nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border-bottom: 4px solid transparent;
  color: #414F67;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.lapis-nav-link:hover {
  background: var(--role-accent-soft, #EAF6F5);
  border-radius: 6px;
}

.lapis-nav-link.open {
  background: var(--role-accent-soft, #EAF6F5);
  border-radius: 6px;
  border-bottom-color: transparent;
}

.lapis-badge {
  min-width: 18px;
  padding: 0 5px;
  background: #F6D1AA;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  border-radius: 999px;
}

.lapis-user {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 10px;
  margin-left: auto;
  white-space: nowrap;
}

.lapis-user-link {
  display: flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
}

.lapis-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--role-accent, #AED9D8);
  font-weight: 700;
  overflow: hidden;
}

/* the photo of a child fills the circle */
.lapis-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lapis-who {
  line-height: 1.2;
}

.lapis-who b {
  display: block;
  font-size: 14px;
}

.lapis-who small {
  color: #5E6C80;
  font-size: 12px;
  text-transform: capitalize;
}

.lapis-button {
  padding: 4px 10px;
  border: 0;
  border-radius: 5px;
  background: #FFFFFF;
  box-shadow: inset 0 0 0 2px #D5CBEA;
  color: #4A3F3A;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.lapis-button-filled {
  background: #E8A0B8;
  box-shadow: none;
}

/* the menu button: only shown on a small screen */
.lapis-burger {
  display: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 40px;
  margin-left: auto;
  border: 1px solid #414F67;
  background: transparent;
  color: #414F67;
  font-size: 22px;
  line-height: 1;
}

/* a small screen: the menu hides behind the button and opens as a list */
@media (max-width: 1099px) {
  .lapis-burger {
    display: flex;
  }

  .lapis-brand {
    margin-right: 0;
    font-size: 17px;
  }

  .lapis-menu {
    display: none;
    flex: 0 0 100%;
    flex-direction: column;
    align-items: stretch;
    padding-bottom: 8px;
  }

  .lapis-menu.open {
    display: flex;
  }

  .lapis-links {
    flex: none;
    flex-direction: column;
    justify-content: flex-start;
  }

  .lapis-nav-link {
    justify-content: space-between;
    min-height: 46px;
    padding: 0 4px;
    border-bottom: 1px solid #CFE0DE;
  }

  .lapis-nav-link.open {
    padding-left: 10px;
    border-bottom-color: #CFE0DE;
    background: var(--role-accent-soft, #DDF0EF);
    border-radius: 0;
  }

  .lapis-user {
    justify-content: space-between;
    margin: 10px 0 0;
  }
}
</style>
