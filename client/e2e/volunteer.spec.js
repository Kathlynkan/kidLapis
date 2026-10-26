// Core journey: volunteer opens a child, sees the handover, records a session, assigns homework.
// Owner: Yuqi (handover), Ning Xuan (session form), Jachin (homework)
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Volunteer handover', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'volunteer')
    // the Today tab depends on the real day of the week,
    // so tests use the "All my children" tab
    await page.locator('[data-test="tab-all"]').click()
  })

  test('sees only the children assigned to them', async ({ page }) => {
    // Aisha (volunteer@) is assigned Ethan, Arjun and Chloe in the seed data
    await expect(page.locator('[data-test="child-card"]')).toHaveCount(4)
  })

  test('search filters the children by name', async ({ page }) => {
    await page.locator('[data-test="child-search"]').fill('eth')
    await expect(page.locator('[data-test="child-card"]')).toHaveCount(1)
    await expect(page.locator('[data-test="child-card"]')).toContainText('Ethan')
  })

  test('level filter shows only that level', async ({ page }) => {
    // Ethan and Chloe are P4, Arjun is P3
    await page.locator('[data-test="level-filter"]').selectOption('P4')
    await expect(page.locator('[data-test="child-card"]')).toHaveCount(2)
  })

  test('opening a child shows the handover and history', async ({ page }) => {
    await page.locator('[data-test="child-card"]', { hasText: 'Ethan Wong' }).click()
    await expect(page).toHaveURL(/\/children\/c_1$/)

    const handover = page.locator('[data-test="handover-card"]')
    // works for both the AI summary and the fallback
    await expect(handover).toContainText('4/5')
    // Ethan's "Finding common denominators" appears twice in his last 5 sessions
    await expect(page.locator('[data-test="recurring-badge"]').first()).toBeVisible()

    await expect(page.locator('[data-test="session-card"]').first()).toBeVisible()
  })

  test('can open the record-session form', async ({ page }) => {
    await page.locator('[data-test="child-card"]', { hasText: 'Ethan Wong' }).click()
    await page.locator('[data-test="record-session"]').click()
    await expect(page.locator('[data-test="session-form"]')).toBeVisible()
  })
})

// ── Test: record a session ────────────────────────────────────────────────────
// Feature: volunteer fills in the session form and submits it (POST /sessions).
// DB involvement: writes a new Session document to MongoDB; the server validates
//   that date is not in the future and topic is not empty before creating it.
// chromium-only: mutates the DB (adds a session); mobile runs read-only checks.
test.describe('Volunteer records a session', () => {
  test('submitting the session form creates a session and returns to child profile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'state-mutating — runs on chromium only')

    // Use Chloe (c_4) to avoid contaminating Ethan's session history,
    // which other tests (handover, recurring-badge) rely on.
    await loginAs(page, 'volunteer')
    await page.locator('[data-test="tab-all"]').click()
    await page.locator('[data-test="child-card"]', { hasText: 'Chloe Lee' }).click()
    await expect(page).toHaveURL(/\/children\/c_4$/)

    await page.locator('[data-test="record-session"]').click()
    await expect(page.locator('[data-test="session-form"]')).toBeVisible()

    // Fill in the required topic field
    await page.locator('#topic').fill('Adding unlike fractions')
    // Set attempted / correct directly in the number inputs
    await page.locator('#attempted').fill('5')
    await page.locator('#correct').fill('4')

    // Submit — POST /sessions writes to MongoDB and redirects to child profile
    await page.locator('[data-test="session-submit"]').click()

    await expect(page).toHaveURL(/\/children\/c_4/)
    // handover-card only renders after loadData() finishes (v-else block)
    await expect(page.locator('[data-test="handover-card"]')).toBeVisible({ timeout: 10000 })
  })
})

// ── Test: assign homework ─────────────────────────────────────────────────────
// Feature: volunteer assigns a homework quest to a child (POST /homework).
// DB involvement: writes a new Homework document; validates title and due date.
// chromium-only: mutates the DB (adds homework).
test.describe('Volunteer assigns homework', () => {
  test('filling the homework form and submitting creates new homework', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'state-mutating — runs on chromium only')

    await loginAs(page, 'volunteer')
    await page.locator('[data-test="tab-all"]').click()
    await page.locator('[data-test="child-card"]', { hasText: 'Ethan Wong' }).click()
    await expect(page).toHaveURL(/\/children\/c_1$/)

    // Navigate to the homework assignment form via the Give homework button
    await page.locator('[data-test="assign-homework"]').click()
    await expect(page).toHaveURL(/\/homework\/new/)

    // Title is required; due date must not be in the past
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dueDate = tomorrow.toISOString().slice(0, 10)

    await page.locator('[data-test="hw-title"]').fill('E2E Test Worksheet')
    await page.locator('[data-test="hw-due"]').fill(dueDate)

    // POST /homework writes to MongoDB and redirects back to child profile
    await page.locator('[data-test="hw-submit"]').click()

    await expect(page).toHaveURL(/\/children\/c_1/)
    // The newly assigned homework card should appear in the quest list
    await expect(page.locator('[data-test="homework-card"]').first()).toBeVisible()
  })
})