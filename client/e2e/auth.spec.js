// Owner: Kai Sen
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Authentication', () => {
  // Test case (1): Verify that logging in with the wrong password shows an error.
  test('wrong password shows an error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('volunteer@kidslapis.sg')
    await page.getByLabel('Password').fill('wrong-password')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.locator('[data-test="login-error"]')).toContainText('Incorrect')
  })

  // Test case (2): Verify that a parent who types /coordinator is sent back to their own page.
  test('a parent cannot open the coordinator dashboard', async ({ page }) => {
    await loginAs(page, 'parent')
    await page.goto('/coordinator')
    await expect(page).toHaveURL(/\/parent$/)
  })
})
