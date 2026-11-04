// Verify that volunteer can assign homework and homework 
// appears in child's quest dashboard

import { test, expect } from '@playwright/test'

test.describe('Assign Homework', () => {

    // Login
    test.beforeEach(async ({ page }) => {
        await page.goto('/login')

        await page.fill('[data-test="login-email"]', 'volunteer@kidslapis.sg')
        await page.fill('[data-test="login-password"]', 'password123')
        await page.click('[data-test="login-submit"]')

        await expect(page).toHaveURL(/volunteer/)
        console.log('After login:', await page.url())
    })

    // Test Case 1: Valid homework assignment
    test('creates homework successfully', async ({ page }) => {
    await page.goto('/children/c_1/homework/new')


    console.log('Current page:', await page.url())
    await page.screenshot({ path: 'homework-page.png' })
    await expect(page.locator('[data-test="hw-title"]')).toBeVisible()


    await page.locator('[data-test="hw-title"]')
        .fill('Homework Test 1')

    await page.locator('[data-test="hw-due"]')
        .fill('2026-11-20')

    await page.locator('[data-test="hw-submit"]')
        .click()

    await expect(
        page.getByText('Homework created successfully')
    ).toBeVisible()
    })

    // Test Case 2: Empty homework title
    test('rejects homework with empty title', async ({ page }) => {
        await page.goto('/children/c_1/homework/new')

        await page.locator('[data-test="hw-due"]')
            .fill('2026-11-20')

        await page.locator('[data-test="hw-submit"]')
            .click()

        await expect(
            page.getByText('Title is required')
        ).toBeVisible()
    })

    // Test Case 3: Due date does not exist
    test('rejects homework without due date', async ({ page }) => {
        await page.goto('/children/c_1/homework/new')

        await page.locator('[data-test="hw-title"]')
            .fill('Homework Test 3')

        await page.locator('[data-test="hw-submit"]')
            .click()

        await expect(
            page.getByText('Due date is required')
        ).toBeVisible()
    })

    // Test Case 4: Due date is in the past
    test('rejects homework with past due date', async ({ page }) => {
        await page.goto('/children/c_1/homework/new')

        await page.locator('[data-test="hw-title"]')
            .fill('Past Homework')

        await page.locator('[data-test="hw-due"]')
            .fill('2026-10-01')

        await page.locator('[data-test="hw-submit"]')
            .click()

        await expect(
            page.getByText('Due date cannot be in the past')
        ).toBeVisible()
    })

    // Test Case 5: Homework appears on child profile after creation
    test('displays newly created homework on child profile', async ({ page }) => {
        await page.goto('/children/c_1/homework/new')

        await page.locator('[data-test="hw-title"]')
            .fill('Homework Test 5')

        await page.locator('[data-test="hw-due"]')
            .fill('2026-11-20')

        await page.locator('[data-test="hw-submit"]')
            .click()

        // Redirect back to child profile
        await expect(
            page.getByText('Homework created successfully')
        ).toBeVisible()

        // newly created homework card appears
        await expect(
            page.getByText('Homework Test 5').first()
        ).toBeVisible()
    })

})