<!-- =============================================================
  NavBar — shows different links for each role.      Owner: Kai Sen
  The logo and the links are on the left, and the user is on the right (the name opens the profile page, where the user logs out).
  On a small screen the links and the user hide behind a menu button.
  The bell (volunteers and parents) stays outside the menu, so it is visible on a phone too.
    Volunteer: - session requests: the coordinator assigned them a new day in Matchmaking -> the Session
                 requests page, where they Accept / Decline (RequestsView, routes/requests.js)
               - quests to check: their children pressed "I'm done!" on a quest
    Parent:    - new updates: sessions the parent hasn't seen yet, so the weekly summary has changed
                 -> opens that child on the parent page, which marks them seen
============================================================= -->
<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import { formatDate } from '@/utils/format'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

// the Log out button next to the user's name (the profile page still has one too)
async function logout() {
  await auth.logout()
  router.push('/login')
}
const menuOpen = ref(false) // on a small screen the menu is hidden until this is true

// every time the user goes to another page: close the menu, look for new messages and for the photo of a child
watch(() => route.fullPath, () => {
  menuOpen.value = false
  bellOpen.value = false
  fetchUnread()
  fetchPhoto()
  fetchBell()
})

const LINKS = {
  volunteer: [
    { to: '/volunteer', label: 'My Children' },
    { to: '/volunteer/requests', label: 'Requests' }, // new sessions to accept / decline (Kai Sen)
  ],
  coordinator: [
    { to: '/coordinator', label: 'Dashboard' },
    { to: '/coordinator/children', label: 'Children' },
    { to: '/coordinator/volunteers', label: 'Volunteers' },
    { to: '/coordinator/matchmaking', label: 'Matchmaking' },
    { to: '/messages', label: 'Messages' },
    { to: '/coordinator/schedule', label: 'Schedule'},
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
// A role shows the layers up to its own: a coordinator has one stripe (purple), a volunteer has two (purple, green),
// a parent has three (purple, green, aqua) and a child has all four (purple, green, aqua, pink).
const LAYERS = ['coordinator', 'volunteer', 'parent', 'child']
const LAYER_COLOURS = { coordinator: '#D5CBEA', volunteer: '#9BD3B2', parent: '#AED9D8', child: '#E8A0B8' }
const stripes = computed(() => {
  const place = LAYERS.indexOf(auth.role)
  // a visitor who is not logged in sees all four layers
  const shown = place < 0 ? LAYERS : LAYERS.slice(0, place + 1)
  // the stripes are drawn from the top down, so the bottom layer (purple) comes last
  return [...shown].reverse().map((layer) => LAYER_COLOURS[layer])
})

// true when this link is the page we are on.
// The messages page has a child in its address (/messages/c_1), so a link counts as open for its own address
// and for the addresses under it. A link that has other links under it (the coordinator's Dashboard) is only open on its own address.
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
  if (!auth.isLoggedIn || !['coordinator', 'parent'].includes(auth.role)) return
  try {
    const res = await api.get('/messages/unread')
    unreadTotal.value = Object.values(res.data).reduce((a, b) => a + b, 0)
  } catch {
    // the number is not important, so we ignore errors
  }
}

// ---------- The bell (volunteers and parents) ----------
// Volunteer:
//   1. Session requests: new days the coordinator assigned in Matchmaking (GET /requests).
//   2. Quests a child pressed "I'm done!" on (status 'submitted'): the volunteer needs to check them.
//      GET /homework only returns the quests of the volunteer's own children, so no other filter is needed.
// Parent:
//   3. New updates: sessions the parent hasn't opened yet (session.parentViewed is empty).
//      A new session means the child's weekly summary has changed too.
// Everyone (coordinator, volunteer, parent):
//   4. Updates: saved one-off events (GET /notifications), e.g. a coordinator sees "Aisha accepted
//      Sofia Ong", a volunteer sees "You no longer see Sofia Ong on Mon". Opening the bell
//      marks them read (the count drops); closing the bell removes them, so each update is
//      shown once.
// Children: only Updates, e.g. "'Read one story' was approved! +10 stars" or "... was returned" (routes/homework.js)
const hasBell = computed(() => ['volunteer', 'parent', 'coordinator', 'child'].includes(auth.role))
const requests = ref([]) // [{ childId, childName, day, time, ... }]
const questsToCheck = ref([]) // [{ id, title, childId, childName }]
const parentUpdates = ref([]) // [{ childId, childName, count, latestDate }], one per child
const notices = ref([]) // [{ id, text, icon, link, createdAt, readAt }]
const bellOpen = ref(false)
const bellRef = ref(null) // the bell and its dropdown, to close it when clicking somewhere else

const unreadNotices = computed(() => notices.value.filter((n) => !n.readAt).length)
const bellCount = computed(
  () =>
    requests.value.length +
    questsToCheck.value.length +
    parentUpdates.value.reduce((n, u) => n + u.count, 0) +
    unreadNotices.value,
)

// Open/close the bell. Opening it marks the updates as read (the count drops, they stay listed
// while the bell is open). Closing it - with the bell, a click elsewhere or a page change - removes them.
async function toggleBell() {
  bellOpen.value = !bellOpen.value
  if (bellOpen.value && unreadNotices.value) {
    const now = new Date().toISOString()
    notices.value = notices.value.map((n) => (n.readAt ? n : { ...n, readAt: now }))
    api.put('/notifications/read').catch(() => {})
  }
}

watch(bellOpen, (open) => {
  if (!open) notices.value = notices.value.filter((n) => !n.readAt)
})

// "3 Nov, 14:05" for an update
const noticeTime = (iso) =>
  new Date(iso).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

async function fetchBell() {
  if (!hasBell.value) {
    requests.value = []
    questsToCheck.value = []
    parentUpdates.value = []
    notices.value = []
    return
  }
  try {
    const unread = (await api.get('/notifications')).data
    // While the bell is open, keep showing the ones just read (they disappear when it closes)
    const justRead = bellOpen.value ? notices.value.filter((n) => n.readAt && !unread.some((u) => u.id === n.id)) : []
    notices.value = [...unread, ...justRead]
  } catch {
    // keep the old list
  }
  try {
    if (auth.role === 'volunteer') {
      const [requestsRes, homeworkRes, childrenRes] = await Promise.all([
        api.get('/requests'),
        api.get('/homework'),
        api.get('/children'),
      ])
      requests.value = requestsRes.data.filter(
        r => r.status === 'pending'
      )
      const nameOf = Object.fromEntries(childrenRes.data.map((c) => [c.id, c.name]))
      questsToCheck.value = homeworkRes.data
        .filter((h) => h.status === 'submitted')
        .map((h) => ({ id: h.id, title: h.title, childId: h.childId, childName: nameOf[h.childId] || 'A child' }))
      parentUpdates.value = []
    } else if (auth.role === 'parent') {
      const [sessionsRes, childrenRes] = await Promise.all([api.get('/sessions'), api.get('/children')])
      const updates = {}
      for (const s of sessionsRes.data) {
        if (s.parentViewed) continue
        updates[s.childId] ??= { childId: s.childId, count: 0, latestDate: '' }
        updates[s.childId].count++
        if (s.date > updates[s.childId].latestDate) updates[s.childId].latestDate = s.date
      }
      parentUpdates.value = childrenRes.data
        .filter((c) => updates[c.id])
        .map((c) => ({ ...updates[c.id], childName: c.name }))
      requests.value = []
      questsToCheck.value = []
    } else {
      requests.value = []
      questsToCheck.value = []
      parentUpdates.value = []
    }
  } catch {
    // the bell is not important, so we ignore errors and keep the old lists
  }
}

function closeBellOnOutsideClick(event) {
  if (bellOpen.value && bellRef.value && !bellRef.value.contains(event.target)) bellOpen.value = false
}

// The bell reloads:
//   - INSTANTLY when the server says something changed for this user: a live socket.io
//     connection in the user's private room (server.js + utils/notify.js), e.g. the coordinator
//     assigned a session, a child handed in a quest, a volunteer recorded a session
//   - straight away when a page on this browser changed something (RequestsView and
//     ParentHomeView send a 'bell-refresh' window event)
//   - every 60 seconds as a backup, in case the live connection dropped
let bellTimer = null
let bellSocket = null

// Coordinators have no bell, but use the same live connection: when a volunteer accepts or
// declines a session, the server sends 'schedule-changed', and the open coordinator page
// (Dashboard, Matchmaking, Schedule) reloads its data (they listen for the window event).
function connectBellSocket() {
  bellSocket?.disconnect()
  bellSocket = null
  const isCoordinator = auth.role === 'coordinator'
  if ((!hasBell.value && !isCoordinator) || !auth.token) return
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  bellSocket = io(apiBase, { auth: { token: auth.token }, transports: ['websocket', 'polling'] })
  bellSocket.on('bell-refresh', fetchBell)
  bellSocket.on('schedule-changed', () => window.dispatchEvent(new Event('schedule-changed')))
}

onMounted(() => {
  fetchUnread()
  fetchPhoto()
  fetchBell()
  connectBellSocket()
  bellTimer = setInterval(fetchBell, 60000)
  document.addEventListener('click', closeBellOnOutsideClick)
  window.addEventListener('bell-refresh', fetchBell)
})

onUnmounted(() => {
  clearInterval(bellTimer)
  bellSocket?.disconnect()
  document.removeEventListener('click', closeBellOnOutsideClick)
  window.removeEventListener('bell-refresh', fetchBell)
})

// someone else logs in, or the user logs out: load their bell and live connection, not the last user's
watch(
  () => auth.user?.id,
  () => {
    fetchBell()
    connectBellSocket()
  },
)
</script>

<template>
  <nav class="lapis-nav sticky-top">
    <div class="container lapis-nav-inner">
      <RouterLink class="lapis-brand" :to="auth.homePath">
        <img src="/logo.webp" alt="" width="38" height="38" />
        Kids Lapis
      </RouterLink>

      <!-- the bell: updates for everyone, + session requests and quests (volunteers), new sessions (parents) -->
      <div v-if="hasBell" ref="bellRef" class="lapis-bell-wrap">
        <button
          type="button"
          class="lapis-bell"
          :aria-label="`Notifications: ${bellCount} new`"
          :aria-expanded="bellOpen"
          data-test="nav-bell"
          @click="toggleBell"
        >
          <i class="bi" :class="bellCount ? 'bi-bell-fill' : 'bi-bell'"></i>
          <span v-if="bellCount" class="lapis-bell-count" data-test="nav-bell-count">
            {{ bellCount }}
          </span>
        </button>

        <div v-if="bellOpen" class="lapis-bell-menu" data-test="nav-bell-menu">
          <!-- EVERYONE: saved updates ("Aisha accepted Sofia", "You no longer see Sofia on Mon") -->
          <template v-if="notices.length || ['coordinator', 'child'].includes(auth.role)">
            <div class="lapis-bell-title">Updates</div>
            <p v-if="!notices.length" class="lapis-bell-empty">No updates yet.</p>
            <component
              :is="n.link ? RouterLink : 'div'"
              v-for="n in notices"
              :key="n.id"
              :to="n.link || undefined"
              class="lapis-bell-item"
              data-test="nav-notice"
            >
              <i class="bi" :class="n.icon || 'bi-info-circle'"></i>
              <span>
                {{ n.text }}
                <small class="lapis-bell-time">{{ noticeTime(n.createdAt) }}</small>
              </span>
            </component>
          </template>

          <!-- VOLUNTEER -->
          <template v-if="auth.role === 'volunteer'">
            <!-- new sessions the coordinator assigned: answered on the Session requests page -->
            <template v-if="requests.length">
              <div class="lapis-bell-title">Assignment Requests</div>
              <RouterLink
                v-for="r in requests"
                :key="`${r.childId}|${r.day}`"
                :to="{ name: 'volunteer-requests' }"
                class="lapis-bell-item"
                data-test="nav-request"
              >
                <i class="bi bi-calendar-plus"></i>
                <span>
                  <b>{{ r.childName }}</b> ({{ r.level }}) every <b>{{ r.day }}</b
                  ><template v-if="r.time"> at {{ r.time }}</template>
                </span>
              </RouterLink>
              <RouterLink :to="{ name: 'volunteer-requests' }" class="lapis-bell-more" data-test="nav-requests-link">
                Accept or decline <i class="bi bi-arrow-right"></i>
              </RouterLink>
            </template>

            <div class="lapis-bell-title">Quests to check</div>
            <p v-if="questsToCheck.length === 0" class="lapis-bell-empty">Nothing to check right now.</p>
            <RouterLink
              v-for="q in questsToCheck"
              :key="q.id"
              :to="{ name: 'child-profile', params: { id: q.childId } }"
              class="lapis-bell-item"
              data-test="nav-bell-item"
            >
              <i class="bi bi-journal-check"></i>
              <span><b>{{ q.childName }}</b> handed in "{{ q.title }}"</span>
            </RouterLink>
          </template>

          <!-- PARENT -->
          <template v-else-if="auth.role === 'parent'">
            <div class="lapis-bell-title">New updates</div>
            <p v-if="parentUpdates.length === 0" class="lapis-bell-empty">You're all caught up.</p>
            <RouterLink
              v-for="u in parentUpdates"
              :key="u.childId"
              :to="{ name: 'parent-home', query: { child: u.childId } }"
              class="lapis-bell-item"
              data-test="nav-parent-update"
            >
              <i class="bi bi-stars"></i>
              <span>
                <b>{{ u.childName }}</b>'s summary was updated:
                {{ u.count }} new session{{ u.count === 1 ? '' : 's' }}<template v-if="u.latestDate">,
                latest {{ formatDate(u.latestDate) }}</template>
              </span>
            </RouterLink>
          </template>
        </div>
      </div>

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
            <span
              v-if="link.to === '/volunteer/requests' && requests.filter(r => r.status === 'pending').length > 0"
              class="lapis-badge"
              data-test="nav-requests-badge"
            >
              {{ requests.filter(r => r.status === 'pending').length }}
            </span>
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
          <button type="button" class="lapis-button" data-test="nav-logout" @click="logout">Log out</button>
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
   Purple is the bottom layer, then green, aqua and pink on top. A role shows the layers up to its own: a coordinator has one
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

  height: 100%;
  min-height: 58px;

  padding: 0 14px;

  border-radius: 6px;
  color: inherit;
  text-decoration: none;
}

.lapis-user-link:hover {
  background: var(--role-accent-soft, #EAF6F5);
}

.lapis-user-link:focus-visible {
  background: var(--role-accent-soft, #EAF6F5);
  border-radius: 6px;
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
  border-radius: 6px;
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

/* The bell (everyone who is logged in). It is outside the menu in the HTML, so on a small screen
   it sits next to the menu button and is never hidden in the menu (see the media query below).
   On a wide screen it sits between the links and the user (see the min-width media query). */
.lapis-bell-wrap {
  position: relative;
}

/* Wide screen: "display: contents" lets the links and the user take part in the navbar's own row,
   so "order" can put the bell between them:  logo | links ... | bell | user */
@media (min-width: 1100px) {
  .lapis-menu {
    display: contents;
  }

  .lapis-links {
    order: 1;
  }

  .lapis-bell-wrap {
    order: 2;
    margin-left: auto; /* pushed to the right, next to the user */
  }

  .lapis-user {
    order: 3;
    margin-left: 8px;
  }
}

.lapis-bell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #414F67;
  font-size: 20px;
}

.lapis-bell:hover {
  background: var(--role-accent-soft, #EAF6F5);
}

.lapis-bell-count {
  position: absolute;
  top: 2px;
  right: 0;
  min-width: 18px;
  padding: 0 5px;
  background: #E8A0B8;
  color: #4A3F3A;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  border-radius: 999px;
}

.lapis-bell-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 1050;
  width: min(300px, calc(100vw - 32px));
  padding: 8px;
  background: #FFFFFF;
  border: 1px solid #CFE0DE;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(74, 63, 58, 0.15);
}

.lapis-bell-title {
  padding: 4px 8px 8px;
  font-size: 13px;
  font-weight: 700;
}

.lapis-bell-empty {
  margin: 0;
  padding: 4px 8px 8px;
  color: #5E6C80;
  font-size: 14px;
}

.lapis-bell-item {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  color: #414F67;
  font-size: 14px;
  text-decoration: none;
}

.lapis-bell-item:hover {
  background: var(--role-accent-soft, #EAF6F5);
}

.lapis-bell-time {
  display: block;
  color: #8D97A6;
  font-size: 11px;
}

/* "Accept or decline ->" under the session requests */
.lapis-bell-more {
  display: block;
  margin: 0 0 8px;
  padding: 4px 8px 8px;
  border-bottom: 1px solid #CFE0DE;
  color: #2F6F5A;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.lapis-bell-more:hover {
  text-decoration: underline;
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

  /* the bell moves next to the menu button and pushes both to the right */
  .lapis-bell-wrap {
    order: 0;
    margin-left: auto;
  }

  .lapis-bell-wrap + .lapis-burger {
    margin-left: 4px;
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
