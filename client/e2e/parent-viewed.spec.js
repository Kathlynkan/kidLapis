// Parent journey: once the parent has read a session, the volunteer can no longer change it.
// Owner: Kat
//
// Opening the parent page marks the sessions as read in the database, so this runs on Desktop Chrome only.
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.skip(({ isMobile }) => isMobile, 'changes data, so it runs on Desktop Chrome only')

// Test case (1): Verify that once the parent has opened her page, the volunteer sees the sessions as "Seen by parent" and can no longer edit or delete them.
test('after the parent opens her page, the volunteer sees the sessions as locked', async ({ page, context }) => {
  const volunteerPage = await context.newPage()

  // 1. the parent logs in and her page opens on Ethan (this marks his sessions as read)
  const marked = page.waitForResponse((response) => response.url().includes('/homework')) // the page asks for the homework after marking
  await loginAs(page, 'parent')
  await marked

  // 2. the volunteer opens Ethan's page
  await loginAs(volunteerPage, 'volunteer')
  await volunteerPage.goto('/children/c_1')

  // 3. the session says "Seen by parent" and has no Edit or Delete button
  const session = volunteerPage.locator('[data-test="session-card"]').first()
  await expect(session).toContainText(/seen by parent/i)
  await expect(session.getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await expect(session.getByRole('button', { name: 'Delete' })).toHaveCount(0)
})
