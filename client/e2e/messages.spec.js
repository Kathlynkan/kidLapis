// Messages journey: the parent opens the chat with the centre.
// Owner: Kat
//
// Seed data used:
//   parent@kidslapis.sg = Ms Grace, parent of Ethan (c_1) and Mia (c_7)
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Messages — parent', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'parent')
    await page.goto('/messages')
    // MessagesView opens the first child's thread by itself
    await expect(page).toHaveURL(/\/messages\/c_/)
  })

  // Mutates DB: writes a Message document via POST /messages.
  test('parent can send a message and it appears in the thread', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'changes data, so it runs on chromium only')

    const msg = `Hello from the parent ${Date.now()}`
    // pressSequentially types like a real person, so Vue picks up the text
    await page.locator('[data-test="chat-input"]').pressSequentially(msg)
    await page.locator('[data-test="chat-send"]').click()

    await expect(page.locator('[data-test="chat-messages"]')).toContainText(msg)
  })

  test('switching children changes the thread', async ({ page }) => {
    // Ms Grace has Ethan and Mia, so click Mia (the second child)
    await page.locator('[data-test="child-item"]').nth(1).click()

    await expect(page).toHaveURL(/\/messages\/c_7/)
    await expect(page.locator('[data-test="chat-messages"]')).toBeVisible()
  })
})
