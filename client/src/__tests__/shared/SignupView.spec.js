// Owner: Kai Sen

import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import SignupView from '@/views/auth/SignupView.vue'

// build the sign up page, with the router and store it needs
async function mountSignup(startAt = '/signup') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/signup', component: SignupView },
      { path: '/login', component: { template: '<div />' } },
    ],
  })
  router.push(startAt)
  await router.isReady()
  return mount(SignupView, { global: { plugins: [router, createPinia()] } })
}

describe('SignupView', () => {
  // Test case (1): Verify that the questions change with the role: volunteers pick skills and days,
  // parents get the child code box instead.
  it('shows skills and days for volunteers, and the child code box for parents', async () => {
    const wrapper = await mountSignup()

    // Volunteer is chosen at the start
    expect(wrapper.find('[data-test="signup-skills"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="signup-child-code"]').exists()).toBe(false)

    // choose Parent (a radio button tells Vue it was picked with a "change" event)
    await wrapper.find('#role-par').trigger('change')

    expect(wrapper.find('[data-test="signup-skills"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="signup-child-code"]').exists()).toBe(true)
  })

  // Test case (2): Verify that the "Parent sign up" button on the home page (/signup?role=parent)
  // opens the page with Parent already chosen.
  it('starts with Parent chosen when opened with ?role=parent', async () => {
    const wrapper = await mountSignup('/signup?role=parent')

    expect(wrapper.find('#role-par').element.checked).toBe(true)
    expect(wrapper.find('[data-test="signup-child-code"]').exists()).toBe(true)
  })

  // Test case (3): Verify that pressing Sign up on an empty form shows what is wrong.
  it('shows the problems when the form is empty', async () => {
    const wrapper = await mountSignup()

    await wrapper.find('[data-test="signup-submit"]').trigger('submit')

    expect(wrapper.text()).toContain('Please enter your full name.')
    expect(wrapper.text()).toContain('Please enter your email.')
    expect(wrapper.text()).toContain('at least 8 characters')
  })
})
