// Child journey: quests and leaderboard.              Owner: Jachin
// Seed data used:
//   child@kidslapis.sg = Ethan (c_1)
//   h_1 "Fraction addition worksheet" is status='assigned' at the start of each run
//   h_2 is status='verified' (Ethan has 120 points in seed)
//
// Note: tests run sequentially across projects (chromium then mobile) against one
// shared database. The submit test mutates h_1, so it is marked chromium-only.
// Mobile tests check structure and read-only behaviour only.
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Child quests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'child')
    await expect(page).toHaveURL(/\/child$/)
  })

  test('My Quests page shows the quest and finished sections', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Quests to do/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Finished/i })).toBeVisible()
    // Ethan always has homework in some state regardless of prior test mutations
    await expect(page.locator('[data-test="homework-card"]').first()).toBeVisible()
  })

  // Mutates h_1 from 'assigned' -> 'submitted'; only run once on chromium so the
  // mobile project (which runs after) is not left with zero assigned quests.
  test('clicking I\'m done! submits the quest and shows waiting message', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'state-mutating test runs on chromium only')

    await expect(page.locator('[data-test="submit-quest-btn"]').first()).toBeVisible()
    const todoBefore = await page.locator('[data-test="submit-quest-btn"]').count()

    await page.locator('[data-test="submit-quest-btn"]').first().click()

    await expect(page.locator('[data-test="submit-quest-btn"]')).toHaveCount(todoBefore - 1)
    await expect(page.locator('[data-test="waiting-message"]').first()).toBeVisible()
  })

  test('badge shelf renders all expected badges', async ({ page }) => {
    await expect(page.getByText('First Quest')).toBeVisible()
    await expect(page.getByText('Century')).toBeVisible()
  })
})

// ── Test Case 1: Quest verification ──────────────────────────────────────────
// Feature: volunteer verifies a submitted quest (PUT /homework/:id/verify).
// DB involvement: writes homework.status → 'verified' and awards berry points to the child.
// Depends on the 'clicking I\'m done!' test above having run first on chromium,
// which moves h_1 from 'assigned' → 'submitted'.
test.describe('Quest verification (volunteer)', () => {
  test('verifying a submitted quest removes the verify button', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'state-mutating — runs on chromium only')

    await loginAs(page, 'volunteer')
    await page.goto('/children/c_1')
    await expect(page).toHaveURL(/\/children\/c_1/)

    // The submitted quest (h_1) shows a "Verify & give points" button to volunteers.
    // This button only appears when homework.status === 'submitted' in the DB.
    const verifyBtn = page.locator('[data-test="verify-quest-btn"]').first()
    await expect(verifyBtn).toBeVisible()
    const countBefore = await page.locator('[data-test="verify-quest-btn"]').count()

    await verifyBtn.click()

    // PUT /homework/:id/verify writes to MongoDB: sets status → 'verified', adds points.
    // The view reloads homework from the DB; one fewer verify button should appear.
    await expect(page.locator('[data-test="verify-quest-btn"]')).toHaveCount(countBefore - 1)
  })
})

// ── Test Case 2: API failure on ChildHomeView ─────────────────────────────────
// Feature: the child's "My Quests" page handles a server error gracefully.
// DB involvement: the page normally reads from MongoDB via GET /homework and
//   GET /children/:id. Here we simulate the server being down (500) to verify
//   the error state renders instead of a blank/crashed page.
test.describe('ChildHomeView API failure', () => {
  test('shows error state when the homework API returns 500', async ({ page }) => {
    // Set up the intercept BEFORE navigation so it is in place when onMounted fires.
    await page.route('**/homework*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Database error' }),
      }),
    )

    await loginAs(page, 'child')

    // ChildHomeView catches the Promise.all rejection and sets error.value,
    // which renders <StateMessage type="error"> → <div role="alert"> in the DOM.
    await expect(page.locator('[role="alert"]')).toBeVisible()

    // The quest cards must NOT appear — the page should not partially render.
    await expect(page.locator('[data-test="homework-card"]')).toHaveCount(0)
  })
})

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'child')
    await page.goto('/child/leaderboard')
  })

  test('leaderboard page loads and shows entries', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Leaderboard/i })).toBeVisible()
    await expect(page.locator('[data-test="podium-1"]')).toBeVisible()
  })

  test('switching to Most improved tab activates it', async ({ page }) => {
    await page.locator('[data-test="tab-improved"]').click()
    await expect(page.locator('[data-test="tab-improved"]')).toHaveClass(/active/)
  })
})
