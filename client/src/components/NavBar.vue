<!-- =============================================================
  NavBar — shows different links for each role.      Owner: Kai Sen
============================================================= -->
<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const menuOpen = ref(false) // on a small screen the links hide behind the hamburger button until this is true

// close the menu every time the parent goes to another page
watch(() => route.fullPath, () => {
  menuOpen.value = false
  fetchUnread()
})

const LINKS = {
  volunteer: [
    { to: '/volunteer', label: 'My Children', icon: 'bi-people' },
  ],
  teacher: [
    { to: '/teacher',             label: 'Dashboard',   icon: 'bi-speedometer2' },
    { to: '/teacher/children',    label: 'Children',    icon: 'bi-person-badge' },
    { to: '/teacher/volunteers',  label: 'Volunteers',  icon: 'bi-person-heart' },
    { to: '/teacher/matchmaking', label: 'Matchmaking', icon: 'bi-shuffle' },
    { to: '/messages',                label: 'Messages',    icon: 'bi-chat-dots' },
  ],
  parent: [
    { to: '/parent',   label: 'My Child',  icon: 'bi-house-heart' },
    { to: '/messages', label: 'Messages',  icon: 'bi-chat-dots' },
  ],
  child: [
    { to: '/child',             label: 'My Quests',   icon: 'bi-stars' },
    { to: '/child/leaderboard', label: 'Bounty Board', icon: 'bi-trophy' },
  ],
}

const links = computed(() => LINKS[auth.role] || [])

const unreadTotal = ref(0)

async function fetchUnread() {
  if (!auth.isLoggedIn || !['teacher', 'parent'].includes(auth.role)) return
  try {
    const res = await api.get('/messages/unread')
    unreadTotal.value = Object.values(res.data).reduce((a, b) => a + b, 0)
  } catch {
    // badge is non-critical — silently ignore errors
  }
}

onMounted(fetchUnread)

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="lapis-nav sticky-top">
    <div class="container lapis-nav-inner">
      <RouterLink class="lapis-brand" :to="auth.homePath">
        <img src="/favicon.svg" alt="" width="26" height="26" />
        Kids Lapis
      </RouterLink>

      <button
        type="button"
        class="lapis-burger"
        aria-label="Menu"
        :aria-expanded="menuOpen"
        data-test="nav-burger"
        @click="menuOpen = !menuOpen"
      >
        <i class="bi" :class="menuOpen ? 'bi-x-lg' : 'bi-list'"></i>
      </button>

      <div class="lapis-menu" :class="{ open: menuOpen }">
      <div class="lapis-links">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          class="lapis-nav-link"
          :to="link.to"
        >
          <i class="bi me-1" :class="link.icon"></i>{{ link.label }}
          <span
            v-if="link.icon === 'bi-chat-dots' && unreadTotal > 0"
            class="badge rounded-pill ms-1"
            style="background:var(--lapis-pink);color:var(--lapis-plum);font-size:0.6rem"
          >{{ unreadTotal }}</span>
        </RouterLink>
      </div>

      <div v-if="auth.isLoggedIn" class="lapis-right">
        <RouterLink to="/profile" class="lapis-user-pill" data-test="nav-profile">
          <i class="bi bi-person-circle me-1"></i>{{ auth.user.name }}
          <span class="lapis-role-badge ms-1">{{ auth.role }}</span>
        </RouterLink>
        <button class="btn btn-outline-secondary btn-sm" data-test="logout" @click="logout">
          Log out
        </button>
      </div>

      <div v-else class="lapis-right">
        <RouterLink class="btn btn-outline-secondary btn-sm" to="/login">Log in</RouterLink>
        <RouterLink class="btn btn-primary btn-sm" to="/signup">Sign up</RouterLink>
      </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.lapis-nav {
  background-color: var(--role-accent, var(--lapis-pink));
  border-bottom: 3px solid var(--role-accent-dark, var(--lapis-pink-dark));
}

.lapis-nav-inner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  flex-wrap: wrap;
}

.lapis-brand {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--lapis-plum);
  text-decoration: none;
  background: var(--lapis-cream);
  border: 1px solid var(--lapis-cream-dark);
  border-radius: 4px;
  padding: 0.2rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.lapis-links {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
  flex: 1;
}

.lapis-nav-link {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.72rem;
  color: var(--lapis-plum);
  background: var(--lapis-cream);
  border: 1px solid var(--lapis-cream-dark);
  border-radius: 4px;
  padding: 0.2rem 0.55rem;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.1s ease;
}

.lapis-nav-link:hover {
  background: var(--role-accent-soft, var(--lapis-cream));
  border-color: var(--role-accent-dark, var(--lapis-cream-dark));
  color: var(--lapis-plum);
}

.lapis-nav-link.router-link-active {
  background: var(--role-accent-soft, var(--lapis-cream));
  border-color: var(--role-accent-dark, var(--lapis-cream-dark));
  color: var(--lapis-plum);
}

.lapis-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
  margin-left: auto;
}

.lapis-user-pill {
  display: inline-flex;
  align-items: center;
  background: var(--lapis-cream);
  border: 1px solid var(--lapis-cream-dark);
  border-radius: 4px;
  padding: 0.2rem 0.7rem;
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--lapis-plum);
  text-decoration: none;
  white-space: nowrap;
}

.lapis-role-badge {
  background: var(--role-accent, var(--lapis-pink));
  border: 1px solid var(--role-accent-dark, var(--lapis-pink-dark));
  border-radius: 3px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px 5px;
  color: var(--lapis-plum);
}

/* the menu: on a wide screen it is one row beside the brand, on a small screen it hides behind the hamburger */
.lapis-menu {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.lapis-burger {
  display: none;
  margin-left: auto;
  width: 44px;
  height: 40px;
  align-items: center;
  justify-content: center;
  background: var(--lapis-cream);
  border: 1px solid var(--lapis-cream-dark);
  border-radius: 4px;
  color: var(--lapis-plum);
  font-size: 1.5rem;
  line-height: 1;
}

@media (max-width: 767px) {
  .lapis-burger {
    display: flex;
  }
  .lapis-menu {
    display: none;
    flex: 0 0 100%;
    flex-direction: column;
    align-items: stretch;
    padding-top: 0.5rem;
  }
  .lapis-menu.open {
    display: flex;
  }
  .lapis-links {
    flex-direction: column;
    align-items: stretch;
    flex: none;
  }
  .lapis-nav-link {
    padding: 0.7rem 0.75rem;
    font-size: 0.85rem;
  }
  .lapis-right {
    flex-direction: column;
    align-items: stretch;
    margin-left: 0;
  }
  .lapis-user-pill {
    justify-content: center;
    padding: 0.6rem 0.7rem;
  }
}
</style>
