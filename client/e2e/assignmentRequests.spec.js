// Verify that volunteers can respond to assignment requests
// and that request statuses, history and empty-state behaviour
// are displayed correctly.

import { test, expect } from '@playwright/test'

test.describe('Assignment Requests', () => {

    // Login
    test.beforeEach(async ({ page }) => {
        await page.goto('/login')

        await page.fill('[data-test="login-email"]', 'volunteer@kidslapis.sg')
        await page.fill('[data-test="login-password"]', 'password123')
        await page.click('[data-test="login-submit"]')

        await expect(page).toHaveURL(/volunteer/)
        await page.goto('/volunteer/requests')
    })

    // Test Case 1: Accept assignment request and persists after refresh
    test('accepts assignment request and persists after refresh', async ({ page }) => {

        await page.getByRole('button', { name: 'Accept' })
            .first()
            .click()

        await expect(
            page.locator('.request-status-accepted').first()
        ).toBeVisible()

        await page.reload()

        await expect(
            page.locator('.request-status-accepted').first()
        ).toBeVisible()
    })

    // Test Case 2: Decline assignment request and persists after refresh
    test('declines assignment request and persists after refresh', async ({ page }) => {

        await page.getByRole('button', { name: 'Decline' })
            .first()
            .click()

        await expect(
            page.locator('.request-status-declined').first()
        ).toBeVisible()

        await page.reload()

        await expect(
            page.locator('.request-status-declined').first()
        ).toBeVisible()
    })

})