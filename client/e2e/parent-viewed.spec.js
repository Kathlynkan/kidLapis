// E2E tests for the "seen by parent" rule   Owner: Kat
//
// once the parent has opened her page, the sessions count as read and the volunteer isnt allowed to change them anymore
// opening the page changes the database (it marks them as read) so these only run on desktop
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.skip(({ isMobile }) => isMobile, 'changes data, so it runs on Desktop Chrome only')

// Test case (1): Verify that after the parent opens her page, the volunteer sees "Seen by parent" on the sessions and the Edit and Delete buttons are gone.
test('after the parent opens her page, the volunteer sees the sessions as locked', async ({ page, context }) => {
  const volunteerPage = await context.newPage()

  // 1. the parent logs in. her page opens on Ethan and that marks all his sessions as read
  // the page only asks for the homework after its done marking, so if we wait for that we know the marking is finished
  const marked = page.waitForResponse((response) => response.url().includes('/homework'))
  await loginAs(page, 'parent')
  await marked

  // 2. now the volunteer logs in on the other tab and opens Ethan's page
  await loginAs(volunteerPage, 'volunteer')
  await volunteerPage.goto('/children/c_1')

  // 3. one of Aisha's own sessions should say "Seen by parent" and it shouldnt have an Edit or Delete button
  // (the newest session is Daniel's, and a volunteer only gets the lock box on her own sessions, so we pick one of Aisha's)
  const session = volunteerPage.locator('[data-test="session-card"]', { hasText: 'by Aisha Rahman' }).first()
  await expect(session).toContainText(/seen by parent/i)
  await expect(session.getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await expect(session.getByRole('button', { name: 'Delete' })).toHaveCount(0)
})

// Test case (2): Verify that the volunteer still cant save a change to a read session, even if she skips the buttons and types the edit page address.
test('the volunteer cannot save a change to a session the parent has read', async ({ page, context }) => {
  const volunteerPage = await context.newPage()

  // 1. the parent logs in. her page opens on Ethan and that marks all his sessions as read
  const marked = page.waitForResponse((response) => response.url().includes('/homework'))
  await loginAs(page, 'parent')
  await marked

  // 2. the volunteer doesnt use the buttons, she goes straight to the edit page of one of Ethan's sessions (s_1, the Fractions one)
  await loginAs(volunteerPage, 'volunteer')
  await volunteerPage.goto('/sessions/s_1/edit')
  await expect(volunteerPage.getByLabel(/topic covered/i)).toHaveValue('Fractions') // wait until the form has filled in

  // 3. she presses Save Changes. the server should say no and the page shows why
  await volunteerPage.locator('[data-test="session-submit"]').click()
  await expect(volunteerPage.getByText(/cannot be edited/i)).toBeVisible()
})
