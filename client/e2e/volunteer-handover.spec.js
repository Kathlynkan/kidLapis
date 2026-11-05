/*
  Owner: Yuqi
*/
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test('should let a volunteer find a child and read the handover before the session', async ({ page }) => {
  // log in as the volunteer (Aisha)
  await loginAs(page, 'volunteer')

  // she open "All Children", search for Ethan and open his page
  await page.getByRole('button', { name: /All Children/i }).click()
  await page.getByLabel('Search').fill('eth')
  await expect(page.locator('[data-test="child-card"]')).toHaveCount(1) // only Ethan is left
  await page.getByText('Ethan Wong').click()

  // she should see the handover handover notes
  await expect(page).toHaveURL(/\/children\/c_1$/)
  await expect(page.getByText('Handover Notes')).toBeVisible()
  // the AI can take a few seconds, so wait up to 20 seconds for the notes
  await expect(page.getByText('Teach Next')).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('What Helps')).toBeVisible()
  // "Record Session" should be visible on the page
  await expect(page.getByRole('link', { name: /Record Session/i })).toBeVisible()
})

