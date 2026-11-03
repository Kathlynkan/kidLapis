/*
Component Test for LoginView.vue (the log in page)   Owner: Kai Sen

    User behavior
        ↓
    Expected outcome
        ↓
    Test implementation

The page is mounted on its own with a small test router and a fresh Pinia store.
The real server is replaced with a fake (vi.mock), so no API server is needed.
*/

import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import api from '@/services/api'
import LoginView from '@/views/auth/LoginView.vue'

// pretend server: api.post is a fake we control in each test
vi.mock('@/services/api', () => ({
  default: { post: vi.fn() },
  errorMessage: (err) => err.response?.data?.message || err.message,
}))

const Blank = { template: '<div />' } // the other pages don't matter here

// build the page the way the real app shows it: inside a router, with a Pinia store
async function mountLogin(startAt = '/login') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/signup', component: Blank },
      { path: '/parent', component: Blank },
      { path: '/coordinator', component: Blank },
      { path: '/messages', component: Blank },
    ],
  })
  router.push(startAt)
  await router.isReady()
  const wrapper = mount(LoginView, { global: { plugins: [router, createPinia()] } })
  return { wrapper, router }
}

// type an email + password and press Log in, like a real user
async function logIn(wrapper, email, password) {
  await wrapper.find('#email').setValue(email)
  await wrapper.find('#password').setValue(password)
  await wrapper.find('form').trigger('submit')
  await flushPromises() // wait for the (fake) server to answer
}

beforeEach(() => {
  sessionStorage.clear()
  vi.mocked(api.post).mockReset()
  setActivePinia(createPinia())
})

describe('LoginView', () => {
  // Test case (1): Verify that the password is hidden, and the Show / Hide button reveals and hides it.
  it('hides the password until Show is pressed', async () => {
    const { wrapper } = await mountLogin()
    const password = wrapper.find('#password')
    const toggle = wrapper.find('[data-test="toggle-password"]')

    // hidden at first
    expect(password.attributes('type')).toBe('password')
    expect(toggle.text()).toContain('Show')

    // press Show: the password becomes plain text and the button says Hide
    await toggle.trigger('click')
    expect(password.attributes('type')).toBe('text')
    expect(toggle.text()).toContain('Hide')
    expect(toggle.attributes('aria-pressed')).toBe('true')

    // press Hide: hidden again
    await toggle.trigger('click')
    expect(password.attributes('type')).toBe('password')
  })

  // Test case (2): Verify that a wrong password shows the server's message and stays on the log in page.
  it('shows the error from the server when the login is wrong', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: { status: 401, data: { message: 'Incorrect email or password.' } },
    })
    const { wrapper, router } = await mountLogin()

    await logIn(wrapper, 'parent@kidslapis.sg', 'wrong-password')

    expect(wrapper.find('[data-test="login-error"]').text()).toContain('Incorrect email or password.')
    expect(router.currentRoute.value.path).toBe('/login') // not let in
  })

  // Test case (3): Verify that a correct login sends the user to the home page of their role.
  it('sends a parent to the parent page after logging in', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { token: 'abc123', user: { id: 'u_par1', name: 'Ms Grace Wong', role: 'parent' } },
    })
    const { wrapper, router } = await mountLogin()

    await logIn(wrapper, 'parent@kidslapis.sg', 'password123')

    // the page sent exactly what was typed to POST /auth/login
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'parent@kidslapis.sg',
      password: 'password123',
    })
    expect(router.currentRoute.value.path).toBe('/parent')
    expect(wrapper.find('[data-test="login-error"]').exists()).toBe(false)
  })

  // Test case (4): Verify that after logging in, the user goes back to the page they first wanted
  // (the route guard sends them to /login?redirect=... when they are not logged in yet).
  it('goes back to the page in ?redirect= after logging in', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { token: 'abc123', user: { id: 'u_coord', name: 'Tan Mei Ling', role: 'coordinator' } },
    })
    const { wrapper, router } = await mountLogin('/login?redirect=/messages')

    await logIn(wrapper, 'coordinator@kidslapis.sg', 'password123')

    expect(router.currentRoute.value.path).toBe('/messages') // not the coordinator's home page
  })
})
