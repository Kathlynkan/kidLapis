import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth' // get Pinia auth store

import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/auth/LoginView.vue'

// array of all pages
// meta is extra information
const routes = [
  // Public
  { path: '/', name: 'home', component: HomeView },
  { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('@/views/auth/SignupView.vue'),
    meta: { guestOnly: true },
  },

  // Volunteer
  {
    path: '/volunteer',
    name: 'volunteer-home',
    // lazy loading: load volunteer page only when needed
    // wait until user visits /volunteer
    component: () => import('@/views/volunteer/VolunteerHomeView.vue'),
    meta: { roles: ['volunteer'] }, // only volunteers allowed
  },
  {
    path: '/volunteer/requests', // new sessions the coordinator assigned: Accept / Decline
    name: 'volunteer-requests',
    component: () => import('@/views/volunteer/RequestsView.vue'),
    meta: { roles: ['volunteer'] },
  },
  {
    path: '/children/:id', // dynamic route
    name: 'child-profile',
    component: () => import('@/views/volunteer/ChildProfileView.vue'),
    meta: { roles: ['volunteer', 'coordinator'] },
  },
  {
    path: '/children/:id/sessions/new', // record new session
    name: 'session-new',
    component: () => import('@/views/volunteer/SessionFormView.vue'),
    meta: { roles: ['volunteer'] },
  },
  {
    path: '/sessions/:sessionId/edit', // edit existing session
    name: 'session-edit',
    component: () => import('@/views/volunteer/SessionFormView.vue'), // same form
    meta: { roles: ['volunteer', 'coordinator'] },
  },
  {
    path: '/children/:id/homework/new', // assign new homework
    name: 'homework-new',
    component: () => import('@/views/volunteer/HomeworkAssignView.vue'),
    meta: { roles: ['volunteer'] },
  },
  {
    path: '/children/:id/homework/:homeworkId/edit', // edit existing homework
    name: 'homework-edit',
    component: () => import('@/views/volunteer/HomeworkAssignView.vue'),
    meta: { roles: ['volunteer'] },
  },

  // Profile - all roles
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/shared/ProfileView.vue'),
    meta: { roles: ['volunteer', 'coordinator', 'parent', 'child'] },
  },

  // Messages - shared by volunteer, parent, coordinator
  {
    path: '/messages/:childId?', // ?: childId parameter optional
    name: 'messages',
    component: () => import('@/views/shared/MessagesView.vue'),
    meta: { roles: ['parent', 'coordinator'] },
  },

  // Parent
  {
    path: '/parent',
    name: 'parent-home',
    component: () => import('@/views/parent/ParentHomeView.vue'),
    meta: { roles: ['parent'] },
  },

  // Child
  {
    path: '/child',
    name: 'child-home',
    component: () => import('@/views/child/ChildHomeView.vue'),
    meta: { roles: ['child'] },
  },
  {
    path: '/child/leaderboard',
    name: 'leaderboard',
    component: () => import('@/views/child/LeaderboardView.vue'),
    meta: { roles: ['child'] },
  },

  // Coordinator
  {
    path: '/coordinator',
    name: 'coordinator-home',
    component: () => import('@/views/coordinator/CoordinatorDashboardView.vue'),
    meta: { roles: ['coordinator'] },
  },
  {
    path: '/coordinator/children',
    name: 'manage-children',
    component: () => import('@/views/coordinator/ManageChildrenView.vue'),
    meta: { roles: ['coordinator'] },
  },
  {
    path: '/coordinator/volunteers',
    name: 'manage-volunteers',
    component: () => import('@/views/coordinator/ManageVolunteersView.vue'),
    meta: { roles: ['coordinator'] },
  },
  {
    path: '/coordinator/matchmaking/:childId?',
    name: 'matchmaking',
    component: () => import('@/views/coordinator/MatchmakingView.vue'),
    meta: { roles: ['coordinator'] },
  },
  {
    path: '/coordinator/schedule',
    name: 'schedule',
    component: () => import('@/views/coordinator/ScheduleView.vue'),
    meta: { roles: ['coordinator'] },
  },

  // 404
  {
    path: '/:pathMatch(.*)*', // catch everything not matched earlier
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },

]

// create router
const router = createRouter({
  // use normal URLs
  history: createWebHistory(import.meta.env.BASE_URL),
  routes, // above array of all pages
  // when changing pages, automatically scroll to the top
  scrollBehavior: () => ({ top: 0 }),
})

// Navigation guard: runs before every page change
router.beforeEach((to) => {
  const auth = useAuthStore() // open auth store

  // if user is guest and is already logged in
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return auth.homePath // direct to user role homepage
  }
  // if protected page
  if (to.meta.roles) {
    // if user not logged in
    if (!auth.isLoggedIn) {
      // direct to login page
      // query: redirect to query page after logging in
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    // if wrong role: role not in meta{ (roles:[xx,xx]) }
    if (!to.meta.roles.includes(auth.role)) {
      return auth.homePath // direct to user correct role homepage
    }
  }
})

export default router