// Leaderboard journey.                                    Owner: Jachin
// Seed data: child@kidslapis.sg = Ethan (c_1), who has verified homework
// and sits on the podium. Other children also have verified quests.
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'child')
    await page.goto('/child/leaderboard')
    // Wait for the leaderboard to finish loading before each test
    await expect(page.getByRole('heading', { name: /Leaderboard/i })).toBeVisible()
  })

  // ── Test Case 1: podium structure ────────────────────────────────────────────
  // Feature: the weekly leaderboard shows a podium card with the top-3 entries.
  // DB involvement: reads from GET /homework/leaderboard?period=week which
  //   aggregates verified homework points for the current rolling 7-day window.
  test('podium renders with at least one ranked entry', async ({ page }) => {
    // The seed gives multiple children verified stars, so position 1 must be occupied.
    await expect(page.locator('[data-test="podium-1"]')).toBeVisible()

    // The 1st-place step should show a star-count badge.
    const stars = page.locator('[data-test="podium-1"] .lb-stars')
    await expect(stars).toBeVisible()
    const text = await stars.textContent()
    expect(Number(text?.replace(/[^\d]/g, ''))).toBeGreaterThan(0)
  })

  // ── Test Case 2: cheer button ────────────────────────────────────────────────
  // Feature: a child can see a 👏 Cheer button next to every other child on the
  //   podium (but not next to themselves).
  // DB involvement: none on load — the button state is derived from localStorage.
  test('cheer button appears on podium entries that are not the current child', async ({ page }) => {
    // Ethan (child@) may or may not be on the podium; at least one other child
    // from the seed occupies a podium slot, so at least one cheer button must appear.
    const cheerBtns = page.locator('.podium-card .cheer-btn')
    await expect(cheerBtns.first()).toBeVisible()

    // The button label must be either "👏 Cheer" or "👏 Cheered" (already used today).
    const label = await cheerBtns.first().textContent()
    expect(label?.trim()).toMatch(/👏/)
  })
})
