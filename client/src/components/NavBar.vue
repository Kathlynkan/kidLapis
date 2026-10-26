<!-- =============================================================
  NavBar — shows different links for each role.      Owner: Kai Sen
============================================================= -->
<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const LINKS = {
  volunteer: [
    { to: '/volunteer', label: 'My Children', icon: 'bi-people' },
    { to: '/profile',   label: 'Profile',     icon: 'bi-person-gear' },
  ],
  teacher: [
    { to: '/coordinator',             label: 'Dashboard',   icon: 'bi-speedometer2' },
    { to: '/coordinator/children',    label: 'Children',    icon: 'bi-person-badge' },
    { to: '/coordinator/volunteers',  label: 'Volunteers',  icon: 'bi-person-heart' },
    { to: '/coordinator/matchmaking', label: 'Matchmaking', icon: 'bi-shuffle' },
    { to: '/coordinator/schedule',    label: 'Schedule',    icon: 'bi-calendar-week' },
    { to: '/messages',                label: 'Messages',    icon: 'bi-chat-dots' },
    { to: '/profile',                 label: 'Profile',     icon: 'bi-person-gear' },
  ],
  parent: [
    { to: '/parent',   label: 'My Child',  icon: 'bi-house-heart' },
    { to: '/messages', label: 'Messages',  icon: 'bi-chat-dots' },
    { to: '/profile',  label: 'Profile',   icon: 'bi-person-gear' },
  ],
  child: [
    { to: '/child',             label: 'My Quests',   icon: 'bi-stars' },
    { to: '/child/leaderboard', label: 'Bounty Board', icon: 'bi-trophy' },
    { to: '/profile',           label: 'Profile',     icon: 'bi-person-gear' },
  ],
}

const links = computed(() => LINKS[auth.role] || [])

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="lapis-nav navbar navbar-expand-md sticky-top">
    <div class="container">
      <RouterLink class="navbar-brand lapis-brand d-flex align-items-center gap-2" :to="auth.homePath">
        <img src="/favicon.svg" alt="" width="30" height="30" />
        Kids Lapis
      </RouterLink>

      <button
        class="lapis-toggler navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNav"
        aria-controls="mainNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="mainNav" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto gap-1">
          <li v-for="link in links" :key="link.to" class="nav-item">
            <RouterLink class="lapis-nav-link" :to="link.to">
              <i class="bi me-1" :class="link.icon"></i>{{ link.label }}
            </RouterLink>
          </li>
        </ul>

        <div v-if="auth.isLoggedIn" class="d-flex align-items-center gap-2">
          <RouterLink
            to="/profile"
            class="lapis-user-pill"
            data-test="nav-profile"
          >
            <i class="bi bi-person-circle me-1"></i>{{ auth.user.name }}
            <span class="lapis-role-badge ms-1">{{ auth.role }}</span>
          </RouterLink>
          <button class="btn btn-outline-secondary btn-sm" data-test="logout" @click="logout">
            Log out
          </button>
        </div>

        <div v-else class="d-flex gap-2">
          <RouterLink class="btn btn-outline-secondary btn-sm" to="/login">Log in</RouterLink>
          <RouterLink class="btn btn-primary btn-sm" to="/signup">Sign up</RouterLink>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Nav IS the kueh — same fixed gradient as the body, no cream slab on top */
.lapis-nav {
  background-color: transparent !important;
  background-image: repeating-linear-gradient(
    to bottom,
    var(--lapis-pink)   0                     calc(var(--band) * 1),
    var(--lapis-cream)  calc(var(--band) * 1)  calc(var(--band) * 2),
    var(--lapis-lime)   calc(var(--band) * 2)  calc(var(--band) * 3),
    var(--lapis-cream)  calc(var(--band) * 3)  calc(var(--band) * 4),
    var(--lapis-yellow) calc(var(--band) * 4)  calc(var(--band) * 5),
    var(--lapis-cream)  calc(var(--band) * 5)  calc(var(--band) * 6),
    var(--lapis-orange) calc(var(--band) * 6)  calc(var(--band) * 7),
    var(--lapis-cream)  calc(var(--band) * 7)  calc(var(--band) * 8)
  );
  background-attachment: fixed;
  background-size: 100% calc(var(--band) * 8);
  border-bottom: 4px solid var(--lapis-shadow);
  box-shadow: 0 1px 3px rgba(74, 63, 58, 0.10);
  min-height: calc(var(--band) * 2);
}

.lapis-brand {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  font-size: 1.4rem;
  color: var(--lapis-plum) !important;
  text-decoration: none;
  background: var(--lapis-cream);
  border: 1px solid var(--lapis-shadow);
  border-radius: 6px;
  padding: 0.25rem 1rem;
  box-shadow: 0 1px 3px rgba(74, 63, 58, 0.10);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.lapis-brand:hover {
  box-shadow: 0 6px 16px rgba(74, 63, 58, 0.12);
}

/* Each nav link is a cream pill with plum text */
.lapis-nav-link {
  display: inline-block;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.78rem;
  color: var(--lapis-plum) !important;
  background: var(--lapis-cream);
  border: 1px solid var(--lapis-shadow);
  border-radius: 6px;
  padding: 0.3rem 0.9rem;
  text-decoration: none;
  box-shadow: 0 1px 3px rgba(74, 63, 58, 0.10);
  transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
}

.lapis-nav-link:hover {
  background: var(--lapis-yellow);
  box-shadow: 0 6px 16px rgba(74, 63, 58, 0.12);
}

/* Active link: cream + stronger shadow */
.lapis-nav-link.router-link-active {
  background: var(--lapis-cream);
  border-color: var(--lapis-shadow);
  box-shadow: 0 1px 3px rgba(74, 63, 58, 0.10);
  color: var(--lapis-plum) !important;
}

/* User pill */
.lapis-user-pill {
  display: inline-flex;
  align-items: center;
  background: var(--lapis-cream);
  border: 1px solid var(--lapis-shadow);
  border-radius: 6px;
  padding: 0.25rem 0.8rem;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--lapis-plum) !important;
  text-decoration: none;
  box-shadow: 0 1px 3px rgba(74, 63, 58, 0.10);
  transition: transform 0.1s ease;
}

.lapis-user-pill:hover {
}

.lapis-role-badge {
  background: var(--lapis-pink);
  color: var(--lapis-cream);
  border: 2px solid var(--lapis-shadow);
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 1px 6px;
}

.lapis-toggler {
  background: var(--lapis-cream);
  border: 1px solid var(--lapis-shadow);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(74, 63, 58, 0.10);
}
</style>
