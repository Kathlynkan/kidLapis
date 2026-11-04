// Leaderboard journey.                                    Owner: Jachin
// Seed data: multiple children have verified homework this week (Mia 1st, Chloe 2nd,
// Ryan 3rd, Ethan 4th) — podium-1 is always occupied.
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'child')
    await page.goto('/child/leaderboard')
    await expect(page.getByRole('heading', { name: /Leaderboard/i })).toBeVisible()
  })

  // ── Test Case 1: podium structure ────────────────────────────────────────────
  // Feature: the weekly leaderboard shows a podium card with the top-3 entries.
  // DB involvement: reads from GET /homework/leaderboard?period=week which
  //   aggregates verified homework points for the current rolling 7-day window.
  test('podium renders with at least one ranked entry', async ({ page }) => {
    await expect(page.locator('[data-test="podium-1"]')).toBeVisible()

    const stars = page.locator('[data-test="podium-1"] .lb-stars')
    await expect(stars).toBeVisible()
    const text = await stars.textContent()
    expect(Number(text?.replace(/[^\d]/g, ''))).toBeGreaterThan(0)
  })

  // ── Test Case 2: "Go do a quest" link ───────────────────────────────────────
  // Feature: the footer always shows a link back to the child's home page
  //   so they can navigate to their quests without using the nav bar.
  test('footer link navigates back to the child home page', async ({ page }) => {
    const goLink = page.getByRole('link', { name: /Go do a quest/i })
    await expect(goLink).toBeVisible()
    await goLink.click()
    await expect(page).toHaveURL(/\/child$/)
  })
})
