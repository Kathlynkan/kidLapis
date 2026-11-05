// Owner: Kai Sen

import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import LoginView from '@/views/auth/LoginView.vue'

// build the log in page, with the router and store it needs
async function mountLogin() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/signup', component: { template: '<div />' } },
    ],
  })
  router.push('/login')
  await router.isReady()
  return mount(LoginView, { global: { plugins: [router, createPinia()] } })
}

describe('LoginView', () => {
  // Test case (1): Verify that the password is hidden, and the Show / Hide button reveals and hides it.
  it('hides the password until Show is pressed', async () => {
    const wrapper = await mountLogin()
    const password = wrapper.find('#password')
    const toggle = wrapper.find('[data-test="toggle-password"]')

    // hidden at first
    expect(password.attributes('type')).toBe('password')
    expect(toggle.text()).toContain('Show')

    // press Show: the password becomes plain text and the button says Hide
    await toggle.trigger('click')
    expect(password.attributes('type')).toBe('text')
    expect(toggle.text()).toContain('Hide')

    // press Hide: hidden again
    await toggle.trigger('click')
    expect(password.attributes('type')).toBe('password')
  })

  // Test case (2): Verify that the "Create an account" link goes to the sign up page.
  it('has a link to the sign up page', async () => {
    const wrapper = await mountLogin()
    const link = wrapper.find('a[href="/signup"]')

    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('Create an account')
  })
})
