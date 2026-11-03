/*
Component Test for SignupView.vue (the sign up page)   Owner: Kai Sen

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
import SignupView from '@/views/auth/SignupView.vue'

// pretend server: api.post is a fake we control in each test
vi.mock('@/services/api', () => ({
  default: { post: vi.fn() },
  errorMessage: (err) => err.response?.data?.message || err.message,
}))

const Blank = { template: '<div />' } // the other pages don't matter here

// build the page the way the real app shows it: inside a router, with a Pinia store
async function mountSignup(startAt = '/signup') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/signup', component: SignupView },
      { path: '/login', component: Blank },
      { path: '/parent', component: Blank },
      { path: '/volunteer', component: Blank },
    ],
  })
  router.push(startAt)
  await router.isReady()
  const wrapper = mount(SignupView, { global: { plugins: [router, createPinia()] } })
  return { wrapper, router }
}

// fill in the boxes every role has
async function fillBasics(wrapper) {
  await wrapper.find('[data-test="signup-name"]').setValue('Ravi Kumar')
  await wrapper.find('[data-test="signup-email"]').setValue('ravi@example.com')
  await wrapper.find('[data-test="signup-password"]').setValue('secret123')
  await wrapper.find('[data-test="signup-confirm"]').setValue('secret123')
}

beforeEach(() => {
  sessionStorage.clear()
  vi.mocked(api.post).mockReset()
  setActivePinia(createPinia())
})

describe('SignupView', () => {
  // Test case (1): Verify that the questions change with the role: volunteers pick skills and days,
  // parents get the child code box instead.
  it('shows skills and days for volunteers, and the child code box for parents', async () => {
    const { wrapper } = await mountSignup()

    // Volunteer is chosen at the start
    expect(wrapper.find('[data-test="signup-skills"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="signup-days"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="signup-child-code"]').exists()).toBe(false)

    // choose Parent
    await wrapper.find('#role-par').setValue(true)

    expect(wrapper.find('[data-test="signup-skills"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="signup-days"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="signup-child-code"]').exists()).toBe(true)
  })

  // Test case (2): Verify that the "Parent sign up" button on the home page (/signup?role=parent)
  // opens the page with Parent already chosen.
  it('starts with Parent chosen when opened with ?role=parent', async () => {
    const { wrapper } = await mountSignup('/signup?role=parent')

    expect(wrapper.find('#role-par').element.checked).toBe(true)
    expect(wrapper.find('[data-test="signup-child-code"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="signup-skills"]').exists()).toBe(false)
  })

  // Test case (3): Verify that an empty form shows the problems in red and is NOT sent to the server.
  it('shows the problems and does not sign up when the form is empty', async () => {
    const { wrapper } = await mountSignup()

    await wrapper.find('form').trigger('submit')

    // the boxes turn red and say what is wrong
    expect(wrapper.find('[data-test="signup-name"]').classes()).toContain('is-invalid')
    expect(wrapper.text()).toContain('Please enter your full name.')
    expect(wrapper.text()).toContain('Please enter your email.')
    expect(wrapper.text()).toContain('at least 8 characters')
    expect(wrapper.text()).toContain('Pick at least one skill')
    // nothing was sent
    expect(api.post).not.toHaveBeenCalled()
  })

  // Test case (4): Verify that a parent's sign up sends the child code in capitals (and no
  // volunteer fields), then goes to the parent page.
  it('sends a parent sign up with the child code in capitals, then opens the parent page', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { token: 'new-token', user: { id: 'u_new', name: 'Ravi Kumar', role: 'parent' } },
    })
    const { wrapper, router } = await mountSignup()
    await wrapper.find('#role-par').setValue(true)
    await fillBasics(wrapper)
    await wrapper.find('[data-test="signup-child-code"]').setValue('k7p3qx') // typed in small letters

    await wrapper.find('form').trigger('submit')
    await flushPromises() // wait for the (fake) server to answer

    expect(api.post).toHaveBeenCalledWith('/auth/signup', {
      name: 'Ravi Kumar',
      email: 'ravi@example.com',
      password: 'secret123', // confirmPassword is NOT sent, it only matters on the page
      role: 'parent',
      childCode: 'K7P3QX',
    })
    expect(router.currentRoute.value.path).toBe('/parent')
  })
})
