// Messages journey: a message goes from one person to the other, and the bell tells them.
// Owner: Kat
//
// Seed data used:
//   parent@kidslapis.sg = Ms Grace, parent of Ethan (c_1) and Mia (c_7)
//   coordinator@kidslapis.sg = the centre coordinator, who can see every child's chat
//
// These tests send real messages, so they run on Desktop Chrome only.
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Sending messages', () => {
  // these tests send a real message, so skip them on the iPhone-sized run
  test.skip(({ isMobile }) => isMobile, 'sends a real message, so it runs on Desktop Chrome only')

  // each test uses two tabs, one for each person (the login is kept per tab, so they do not mix)
  // Test case (1): Verify that a message from the parent reaches the coordinator, the bell tells them, and the bell clears once they read it.
  test('a message from the parent reaches the coordinator', async ({ page, context }) => {
    const coordinatorPage = await context.newPage()

    // the parent sends a message in Ethan's chat
    await loginAs(page, 'parent')
    await page.goto('/messages/c_1')
    const message = `Hello from the parent ${Date.now()}`
    await page.locator('[data-test="chat-input"]').pressSequentially(message)
    await page.locator('[data-test="chat-send"]').click()
    await expect(page.locator('[data-test="chat-messages"]')).toContainText(message)

    // the coordinator logs in: the bell shows a new message about Ethan
    await loginAs(coordinatorPage, 'coordinator')
    await coordinatorPage.locator('[data-test="nav-bell"]').click()
    const bellLine = coordinatorPage.locator('[data-test="nav-message"][href="/messages/c_1"]')
    await expect(bellLine).toBeVisible()

    // pressing it opens the chat, and the message is there
    await bellLine.click()
    await expect(coordinatorPage.locator('[data-test="chat-messages"]')).toContainText(message)

    // the message is now read, so the bell does not show it any more
    await coordinatorPage.locator('[data-test="nav-bell"]').click()
    await expect(bellLine).toHaveCount(0)
  })

  // Test case (2): Verify that a reply from the coordinator reaches the parent, and the bell tells them.
  test('a reply from the coordinator reaches the parent', async ({ page, context }) => {
    const parentPage = await context.newPage()

    // the coordinator sends a reply in Ethan's chat
    await loginAs(page, 'coordinator')
    await page.goto('/messages/c_1')
    const reply = `Reply from the coordinator ${Date.now()}`
    await page.locator('[data-test="chat-input"]').pressSequentially(reply)
    await page.locator('[data-test="chat-send"]').click()
    await expect(page.locator('[data-test="chat-messages"]')).toContainText(reply)

    // the parent logs in: the bell shows a new message about Ethan
    await loginAs(parentPage, 'parent')
    await parentPage.locator('[data-test="nav-bell"]').click()
    const bellLine = parentPage.locator('[data-test="nav-message"][href="/messages/c_1"]')
    await expect(bellLine).toBeVisible()

    // pressing it opens the chat, and the reply is there
    await bellLine.click()
    await expect(parentPage.locator('[data-test="chat-messages"]')).toContainText(reply)
  })

  // Test case (3): Verify that each child has a separate chat, so a message about one child does not show in another child's chat.
  test('each child has a separate chat', async ({ page }) => {
    // the parent sends a message in Ethan's chat
    await loginAs(page, 'parent')
    await page.goto('/messages/c_1')
    const message = `Only about Ethan ${Date.now()}`
    await page.locator('[data-test="chat-input"]').pressSequentially(message)
    await page.locator('[data-test="chat-send"]').click()
    await expect(page.locator('[data-test="chat-messages"]')).toContainText(message)

    // Mia's chat (the second child) does not have it
    await page.locator('[data-test="child-item"]').nth(1).click()
    await expect(page).toHaveURL(/\/messages\/c_7/)
    await expect(page.locator('[data-test="chat-messages"]')).not.toContainText(message)

    // going back to Ethan's chat, the message is still there
    await page.locator('[data-test="child-item"]').nth(0).click()
    await expect(page).toHaveURL(/\/messages\/c_1/)
    await expect(page.locator('[data-test="chat-messages"]')).toContainText(message)
  })
})
