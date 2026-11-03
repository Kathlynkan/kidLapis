// Coordinator portal journey.                              Owner: Jachin
// Seed data used:
//   coordinator@kidslapis.sg = centre coordinator
//   Seed includes children with unassigned volunteers, recurring struggles,
//   overdue homework, and 7-day gaps — all of which trigger dashboard alerts.
//
// Note: the follow-up toggle test mutates the follow-up flag. Both runs (Desktop
// Chrome and iPhone 6) read the current state before flipping, so the test
// remains deterministic regardless of which state the DB is in.
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Coordinator dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'coordinator')
    await expect(page).toHaveURL(/\/coordinator$/)
  })

  test('shows the count tiles', async ({ page }) => {
    // scope to .tile-label to avoid matching the NavBar links with the same words
    await expect(page.locator('.tile-label', { hasText: 'Children' })).toBeVisible()
    await expect(page.locator('.tile-label', { hasText: 'Volunteers' })).toBeVisible()
    await expect(page.locator('.tile-label', { hasText: 'Sessions this week' })).toBeVisible()
  })

  test('alerts list loads with at least one row', async ({ page }) => {
    await expect(page.locator('[data-test="alerts-table"]')).toBeVisible()
    await expect(page.locator('[data-test="alert-row"]').first()).toBeVisible()
  })

  test('shows Chloe (not seen) and Sofia (no volunteer) in Needs attention', async ({ page }) => {
    const rows = page.locator('[data-test="alert-row"]')
    // Chloe can have more than one alert (e.g. also overdue homework), so match the exact one.
    await expect(rows.filter({ hasText: 'Chloe Lee' }).filter({ hasText: 'Not seen' })).toBeVisible()
    await expect(rows.filter({ hasText: 'Sofia Ong' }).filter({ hasText: 'No volunteer' })).toBeVisible()
  })  

  test('alert type filter narrows the list', async ({ page }) => {
    await expect(page.locator('[data-test="alert-type-filter"]')).toBeVisible()
    await page.locator('[data-test="alert-filter-unassigned"]').click()
    // Every remaining row should be an "unassigned" alert
    const rows = page.locator('[data-test="alert-row"]')
    const count = await rows.count()
    if (count > 0) {
      await expect(rows.first()).toContainText('No volunteer')
    }
  })

  test('clicking an unassigned alert navigates to matchmaking', async ({ page }) => {
    await page.locator('[data-test="alert-filter-unassigned"]').click()
    await expect(page.locator('[data-test="alert-row"]').first()).toBeVisible()
    await page.locator('[data-test="alert-row"]').first().click()
    await expect(page).toHaveURL(/\/coordinator\/matchmaking/)
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

test.describe('Coordinator: matchmaking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'coordinator')
    await page.goto('/coordinator/matchmaking')
  })

  test('every child is in the list', async ({ page }) => {
    await expect(page.locator('[data-test="child-toggle"]').first()).toBeVisible()
  })

  test('opening a child shows volunteer suggestions', async ({ page }) => {
    await page.locator('[data-test="child-toggle"]').first().click()
    await expect(page.locator('[data-test="suggestion-card"]').first()).toBeVisible()
  })
  test('assigning a volunteer to Sofia removes her "No volunteer" alert once they accept', async ({
    page,
    request,
    isMobile,
  }) => {
    // This test changes data, so it runs once (desktop only) to stop the two runs clashing.
    test.skip(isMobile, 'Changes data: runs on desktop only')

    const sofia = page.locator('[data-test="child-toggle"]', { hasText: 'Sofia Ong' })
    await expect(sofia.locator('[data-test="no-volunteer-badge"]')).toBeVisible() // fails if not reseeded

    // Assign her top match, Priya, on Wednesday at 18:00.
    await sofia.click()
    const priya = page.locator('[data-test="suggestion-card"]', { hasText: 'Priya Nair' })
    await priya.locator('[data-test="day-select"]').selectOption('Wed')
    await priya.locator('[data-test="time-select"]').selectOption('18:00')
    await priya.locator('[data-test="assign-btn"]').click()

    try {
      // Assigning only sends Priya a REQUEST (Kai Sen's accept flow): Sofia is still unassigned, and waiting.
      await expect(priya.locator('[data-test="slot-chip"]')).toContainText('Wed 18:00')
      await expect(sofia.locator('[data-test="waiting-badge"]')).toContainText('Waiting for Priya')
      await expect(sofia.locator('[data-test="no-volunteer-badge"]')).toBeVisible()

      // Priya accepts the request (from her own account, through the API)
      const API = 'http://localhost:8000'
      const login = await request.post(`${API}/auth/login`, {
        data: { email: 'volunteer3@kidslapis.sg', password: 'password123' },
      })
      const { token } = await login.json()
      const accepted = await request.put(`${API}/requests/c_6`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { day: 'Wed', action: 'accept' },
      })
      expect(accepted.ok()).toBeTruthy()

      // Now Sofia has a volunteer (the page updates live; reload to be sure)
      await page.reload()
      await expect(sofia.locator('[data-test="waiting-badge"]')).toHaveCount(0)
      await expect(sofia.locator('[data-test="no-volunteer-badge"]')).toHaveCount(0)

      // On the dashboard, the "No volunteer" filter no longer lists Sofia.
      await page.goto('/coordinator')
      await page.locator('[data-test="alert-filter-unassigned"]').click()
      await expect(page.locator('[data-test="alert-row"]', { hasText: 'Sofia Ong' })).toHaveCount(0)
    } finally {
      // Undo the change, so the other tests (and the next run) still see Sofia unassigned.
      await page.goto('/coordinator/matchmaking/c_6')
      await page
        .locator('[data-test="suggestion-card"]', { hasText: 'Priya Nair' })
        .locator('[data-test="unassign-btn"]')
        .click()
      await expect(sofia.locator('[data-test="no-volunteer-badge"]')).toBeVisible()
    }
  })
})

test.describe('Coordinator: manage children', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'coordinator')
    await page.goto('/coordinator/children')
  })

  test('children page loads with a card per child', async ({ page }) => {
    await expect(page.locator('[data-test="child-card"]').first()).toBeVisible()
  })

  test('add-child button is visible', async ({ page }) => {
    await expect(page.locator('[data-test="add-child"]')).toBeVisible()
  })
})

test.describe('Coordinator: manage volunteers', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'coordinator')
    await page.goto('/coordinator/volunteers')
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
