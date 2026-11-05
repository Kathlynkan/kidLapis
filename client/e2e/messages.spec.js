// E2E tests for the messages: the parent and the coordinator send messages to each other   Owner: Kat
//
// logins from the seed data:
//   parent@kidslapis.sg = Ms Grace, she has two kids, Ethan (c_1) and Mia (c_7)
//   coordinator@kidslapis.sg = the coordinator, she can open the chat of every child
//
// these tests run twice, once on the desktop browser and once on the iphone size
// they really send messages, but every message has the time in it, so the second run never mixes with the first
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Sending messages', () => {
  // Test case 1: Verify that a message from the parent reaches the coordinator, the bell tells her, and the bell goes away once she reads it.
  test('a message from the parent reaches the coordinator', async ({ page, context }) => {
    const coordinatorPage = await context.newPage()

    // the parent sends a message in Ethan's chat
    await loginAs(page, 'parent')
    await page.goto('/messages/c_1')
    const message = `Hello from the parent ${Date.now()}`
    await page.locator('[data-test="chat-input"]').pressSequentially(message)
    await page.locator('[data-test="chat-send"]').click()
    await expect(page.locator('[data-test="chat-messages"]')).toContainText(message)

    // now the coordinator logs in, her bell should say there is a new message about Ethan
    await loginAs(coordinatorPage, 'coordinator')
    await coordinatorPage.locator('[data-test="nav-bell"]').click()
    const bellLine = coordinatorPage.locator('[data-test="nav-message"][href="/messages/c_1"]')
    await expect(bellLine).toBeVisible()

    // click it, the chat opens and the message is in there
    await bellLine.click()
    await expect(coordinatorPage.locator('[data-test="chat-messages"]')).toContainText(message)

    // she has read it now, so the bell shouldnt show it anymore
    await coordinatorPage.locator('[data-test="nav-bell"]').click()
    await expect(bellLine).toHaveCount(0)
  })

  // Test case 2: Verify that a reply from the coordinator reaches the parent and the bell tells her.
  test('a reply from the coordinator reaches the parent', async ({ page, context }) => {
    const parentPage = await context.newPage()

    // the coordinator replies in Ethan's chat
    await loginAs(page, 'coordinator')
    await page.goto('/messages/c_1')
    const reply = `Reply from the coordinator ${Date.now()}`
    await page.locator('[data-test="chat-input"]').pressSequentially(reply)
    await page.locator('[data-test="chat-send"]').click()
    await expect(page.locator('[data-test="chat-messages"]')).toContainText(reply)

    // then the parent logs in and her bell should show a new message about Ethan
    await loginAs(parentPage, 'parent')
    await parentPage.locator('[data-test="nav-bell"]').click()
    const bellLine = parentPage.locator('[data-test="nav-message"][href="/messages/c_1"]')
    await expect(bellLine).toBeVisible()

    // click it, the chat opens and the reply is there
    await bellLine.click()
    await expect(parentPage.locator('[data-test="chat-messages"]')).toContainText(reply)
  })

  // Test case 3: Verify that each child has their own chat, so a message about Ethan doesnt show up in Mia's chat.
  test('each child has a separate chat', async ({ page }) => {
    // the parent sends a message in Ethan's chat
    await loginAs(page, 'parent')
    await page.goto('/messages/c_1')
    const message = `Only about Ethan ${Date.now()}`
    await page.locator('[data-test="chat-input"]').pressSequentially(message)
    await page.locator('[data-test="chat-send"]').click()
    await expect(page.locator('[data-test="chat-messages"]')).toContainText(message)

    // Mia is the second child, her chat shouldnt have it
    await page.locator('[data-test="child-item"]').nth(1).click()
    await expect(page).toHaveURL(/\/messages\/c_7/)
    await expect(page.locator('[data-test="chat-messages"]')).not.toContainText(message)

    // go back to Ethan's chat and the message is still there
    await page.locator('[data-test="child-item"]').nth(0).click()
    await expect(page).toHaveURL(/\/messages\/c_1/)
    await expect(page.locator('[data-test="chat-messages"]')).toContainText(message)
  })
})
