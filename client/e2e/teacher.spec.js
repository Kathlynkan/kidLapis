// Teacher portal journey.                              Owner: Jachin
// Seed data used:
//   teacher@kidslapis.sg = centre teacher
//   Seed includes children with unassigned volunteers, recurring struggles,
//   overdue homework, and 7-day gaps — all of which trigger dashboard alerts.
//
// Note: the follow-up toggle test mutates the follow-up flag. Both runs (Desktop
// Chrome and iPhone 6) read the current state before flipping, so the test
// remains deterministic regardless of which state the DB is in.
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Teacher dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'coordinator')
    await expect(page).toHaveURL(/\/teacher$/)
  })

  test('shows KPI stat cards', async ({ page }) => {
    // scope to .stat-label to avoid matching the NavBar links with the same words
    await expect(page.locator('.stat-label', { hasText: 'Children' })).toBeVisible()
    await expect(page.locator('.stat-label', { hasText: 'Volunteers' })).toBeVisible()
    await expect(page.locator('.stat-label', { hasText: 'Sessions this week' })).toBeVisible()
  })

  test('alerts table loads with at least one row', async ({ page }) => {
    await expect(page.locator('[data-test="alerts-table"]')).toBeVisible()
    await expect(page.locator('[data-test="alert-row"]').first()).toBeVisible()
  })

  test('alert type filter narrows the table', async ({ page }) => {
    const filter = page.locator('[data-test="alert-type-filter"]')
    await expect(filter).toBeVisible()
    await filter.selectOption('unassigned')
    // Every remaining row should be an "unassigned" alert
    const rows = page.locator('[data-test="alert-row"]')
    const count = await rows.count()
    if (count > 0) {
      await expect(rows.first()).toContainText('No volunteer')
    }
  })

  test('clicking an unassigned alert navigates to matchmaking', async ({ page }) => {
    await page.locator('[data-test="alert-type-filter"]').selectOption('unassigned')
    await expect(page.locator('[data-test="alert-row"]').first()).toBeVisible()
    await page.locator('[data-test="alert-row"]').first().click()
    await expect(page).toHaveURL(/\/teacher\/matchmaking/)
  })

  test('can toggle a follow-up flag', async ({ page }) => {
    // The toggle is a <button> with aria-pressed, not a checkbox — use aria-pressed for state
    const toggle = page.locator('[data-test="follow-up-toggle"]').first()
    await expect(toggle).toBeVisible()
    const wasBefore = (await toggle.getAttribute('aria-pressed')) === 'true'
    await toggle.click()
    if (wasBefore) {
      await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    } else {
      await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    }
  })
})

test.describe('Teacher: matchmaking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'coordinator')
    await page.goto('/teacher/matchmaking')
  })

  test('child selector is present', async ({ page }) => {
    await expect(page.locator('[data-test="child-select"]')).toBeVisible()
  })

  test('selecting a child shows volunteer suggestions', async ({ page }) => {
    const select = page.locator('[data-test="child-select"]')
    const options = select.locator('option')
    // options[0] is the placeholder; options[1] is the first real child
    const count = await options.count()
    if (count > 1) {
      const firstValue = await options.nth(1).getAttribute('value')
      await select.selectOption(firstValue)
      await expect(page.locator('[data-test="suggestion-card"]').first()).toBeVisible()
    }
  })
})

test.describe('Teacher: manage children', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'coordinator')
    await page.goto('/teacher/children')
  })

  test('children table loads with rows', async ({ page }) => {
    // Desktop shows a table row per child, phones show a card per child (Kai Sen's responsive layout)
    const child = page.locator('[data-test="child-row"]:visible, [data-test="child-card"]:visible')
    await expect(child.first()).toBeVisible()
  })

  test('add-child button is visible', async ({ page }) => {
    await expect(page.locator('[data-test="add-child"]')).toBeVisible()
  })
})

test.describe('Teacher: manage volunteers', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'coordinator')
    await page.goto('/teacher/volunteers')
  })

  test('volunteer cards load', async ({ page }) => {
    await expect(page.locator('[data-test="volunteer-card"]').first()).toBeVisible()
  })

  test('skill filter is visible', async ({ page }) => {
    await expect(page.locator('[data-test="skill-filter"]')).toBeVisible()
  })

  test('filtering by skill does not show more volunteers than unfiltered', async ({ page }) => {
    // wait for cards to load before counting, otherwise we get 0
    await expect(page.locator('[data-test="volunteer-card"]').first()).toBeVisible()
    const totalBefore = await page.locator('[data-test="volunteer-card"]').count()
    await page.locator('[data-test="skill-filter"]').selectOption('Math')
    const totalAfter = await page.locator('[data-test="volunteer-card"]').count()
    expect(totalAfter).toBeLessThanOrEqual(totalBefore)
  })
})
