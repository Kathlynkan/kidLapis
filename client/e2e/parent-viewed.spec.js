// Owner: Kat
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

// Test case 1 Verify that after the parent opens her page, the volunteer sees "Seen by parent" on the sessions and the Edit and Delete buttons are gone.
test('after the parent opens her page, the volunteer sees the sessions as locked', async ({ page, context }) => {
  const volunteerPage = await context.newPage()

  // the parent logs in. her page opens on Ethan and that marks all his sessions as read
  const marked = page.waitForResponse((response) => response.url().includes('/homework'))
  await loginAs(page, 'parent')
  await marked

  // now the volunteer logs in on the other tab and opens Ethan's page
  await loginAs(volunteerPage, 'volunteer')
  await volunteerPage.goto('/children/c_1')

  // one of Aisha's own sessions should say "Seen by parent" and it shouldnt have an Edit or Delete button
  const session = volunteerPage.locator('[data-test="session-card"]', { hasText: 'by Aisha Rahman' }).first()
  await expect(session).toContainText(/seen by parent/i)
  await expect(session.getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await expect(session.getByRole('button', { name: 'Delete' })).toHaveCount(0)
})

// Test case 2: Verify that the volunteer still cant save a change to a read session, even if she skips the buttons and types the edit page address.
test('the volunteer cannot save a change to a session the parent has read', async ({ page, context }) => {
  const volunteerPage = await context.newPage()

  // the parent logs in. her page opens on Ethan and that marks all his sessions as read
  const marked = page.waitForResponse((response) => response.url().includes('/homework'))
  await loginAs(page, 'parent')
  await marked

  // the volunteer doesnt use the buttons, she goes straight to the edit page of one of Ethan's sessions (s_1, the Fractions one)
  await loginAs(volunteerPage, 'volunteer')
  await volunteerPage.goto('/sessions/s_1/edit')
  await expect(volunteerPage.getByLabel(/topic covered/i)).toHaveValue('Fractions') // wait until the form has filled in

  //8 she presses Save Changes. the server should say no and the page shows why
  await volunteerPage.locator('[data-test="session-submit"]').click()
  await expect(volunteerPage.getByText(/cannot be edited/i)).toBeVisible()
})
