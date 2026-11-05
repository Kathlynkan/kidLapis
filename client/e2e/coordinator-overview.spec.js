// Owner: Yuqi
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'


test('should show a coordinator the overview of a child, without the volunteer handover or edit buttons', async ({ page }) => {
  // log in as the coordinator
  await loginAs(page, 'coordinator')

  // open Chloe's page (in the seed data she has overdue homework)
  await page.goto('/children/c_4')

  // the coordinator sees the overview, with the overdue homework flagged at the top
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await expect(page.getByText(/to follow up/)).toContainText('overdue homework')

  // the summary should not show the volunteer's handover notes  
  await expect(page.getByText('Handover Notes')).toHaveCount(0)

  // the sessions recorded are shown below, but they belong to the volunteer -> coordinator no Edit or Delete buttons
  await expect(page.locator('[data-test="session-card"]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0)
})