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
import '@/css/stripes.css' // the colours and the size of the stripes under the bar

const auth = useAuthStore()
const route = useRoute()
const menuOpen = ref(false) // on a small screen the menu is hidden until this is true

// every time the user goes to another page: close the menu and look for new messages
watch(() => route.fullPath, () => {
  menuOpen.value = false
  fetchUnread()
})

const LINKS = {
  volunteer: [
    { to: '/volunteer', label: 'My Children' },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard' },
    { to: '/teacher/children', label: 'Children' },
    { to: '/teacher/volunteers', label: 'Volunteers' },
    { to: '/teacher/matchmaking', label: 'Matchmaking' },
    { to: '/messages', label: 'Messages' },
  ],
  parent: [
    { to: '/parent', label: 'My Child' },
    { to: '/messages', label: 'Messages' },
  ],
  child: [
    { to: '/child', label: 'My Quests' },
    { to: '/child/leaderboard', label: 'Bounty Board' },
  ],
}

const links = computed(() => LINKS[auth.role] || [])

// the layers of the cake, in order. A role shows the layers up to its own: a parent has one stripe, a volunteer has two.
// The other roles have one stripe in their own colour for now.
const LAYERS = ['parent', 'volunteer']
const stripes = computed(() => {
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

onMounted(fetchUnread)
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
            <span class="lapis-avatar">{{ initial }}</span>
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

<style scoped>
/* the bar: cream. The stripes under it (css/stripes.css) are the colours of the user's role */
.lapis-nav {
  background: #FDFAF4;
  color: #414F67;
  font-family: Georgia, 'Times New Roman', serif;
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
  background: #EAF6F5;
}

.lapis-nav-link.open {
  border-bottom-color: var(--role-accent, #AED9D8);
}

.lapis-badge {
  min-width: 18px;
  padding: 0 5px;
  background: #F6D1AA;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
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
  padding: 5px 12px;
  border: 1px solid #414F67;
  background: transparent;
  color: #414F67;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.lapis-button-filled {
  background: var(--role-accent, #AED9D8);
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
    background: #DDF0EF;
  }

  .lapis-user {
    justify-content: space-between;
    margin: 10px 0 0;
  }
}
</style>
