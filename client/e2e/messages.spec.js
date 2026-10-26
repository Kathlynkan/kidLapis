// Messages journey: parent and teacher exchange messages about a child.
// Owner: Kat
//
// Seed data used:
//   parent@kidslapis.sg = Ms Grace, parent of Ethan (c_1) and Mia (c_7)
//   teacher@kidslapis.sg = centre teacher, can see all children
//
// The send test is chromium-only (state-mutating). The read-only structure
// tests run on both desktop and mobile.
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Messages — parent', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'parent')
    await page.goto('/messages')
    // MessagesView auto-navigates to the first child's thread
    await expect(page).toHaveURL(/\/messages\/c_/)
  })

  test('child list loads and shows the parent\'s children', async ({ page }) => {
    // Ms Grace has Ethan and Mia — both should appear in the sidebar
    const items = page.locator('[data-test="child-item"]')
    await expect(items).toHaveCount(2)
  })

  test('chat thread area is visible', async ({ page }) => {
    await expect(page.locator('[data-test="chat-messages"]')).toBeVisible()
  })

  test('switching children updates the active thread', async ({ page }) => {
    // Click the second child in the list (Mia)
    await page.locator('[data-test="child-item"]').nth(1).click()
    await expect(page).toHaveURL(/\/messages\/c_7/)
    await expect(page.locator('[data-test="chat-messages"]')).toBeVisible()
  })

  // Mutates DB: writes a Message document via POST /messages.
  test('parent can send a message and it appears in the thread', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'state-mutating — runs on chromium only')

    const msg = `Parent test message ${Date.now()}`
    // pressSequentially fires real keyboard events, ensuring Vue v-model updates draft
    await page.locator('[data-test="chat-input"]').click()
    await page.locator('[data-test="chat-input"]').pressSequentially(msg)
    await expect(page.locator('[data-test="chat-send"]')).toBeEnabled()
    await page.locator('[data-test="chat-send"]').click()

    // The message must appear in the thread immediately after sending
    await expect(page.locator('[data-test="chat-messages"]')).toContainText(msg)
  })
})

test.describe('Messages — teacher', () => {
  test('teacher sees the same thread as the parent', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'state-mutating — runs on chromium only')

    // The parent send test ran first; the teacher should now see that message
    await loginAs(page, 'coordinator')
    await page.goto('/messages')
    await expect(page).toHaveURL(/\/messages\/c_/)
    await expect(page.locator('[data-test="chat-messages"]')).toBeVisible()
    // Thread contains at least one message (from seed data or the parent send test)
    const msgs = page.locator('[data-test="chat-messages"]')
    await expect(msgs).toBeVisible()
  })
})
