// Leaderboard journey.                                    Owner: Jachin
// Seed data: multiple children have verified homework this week (Mia 1st, Chloe 2nd,
// Ryan 3rd, Ethan 4th) — podium has at least 2 occupied places after seeding.
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'child')
    await page.goto('/child/leaderboard')
    await expect(page.getByRole('heading', { name: /Leaderboard/i })).toBeVisible()
  })

  // ── Test Case 1: ranking order ────────────────────────────────────────────────
  // Feature: GET /homework/leaderboard sorts entries by weekly verified stars descending.
  // The view must display rank 1 with at least as many stars as rank 2 — if the sort
  // is ever broken, this assertion catches it without depending on specific star counts.
  test('podium rank 1 has at least as many stars as rank 2', async ({ page }) => {
    const getStars = async (rank) => {
      const el = page.locator(`[data-test="podium-${rank}"] .lb-stars`)
      await expect(el).toBeVisible()
      const text = await el.textContent()
      return Number(text?.replace(/[^\d]/g, '') || '0')
    }
    const rank1Stars = await getStars(1)
    const rank2Stars = await getStars(2)
    expect(rank1Stars).toBeGreaterThanOrEqual(rank2Stars)
  })

  // ── Test Case 2: logged-in child identification ──────────────────────────────
  // Feature: the view marks the logged-in child's entry with a "You" label
  //   so they can find themselves at a glance, regardless of rank.
  // The label appears either in the podium (top 3) or in the ranked rows below.
  test('logged-in child is identified with a "You" label wherever they rank', async ({ page }) => {
    await expect(page.locator('.lb-you')).toBeVisible()
  })

  // ── Test Case 3: footer navigation ──────────────────────────────────────────
  // Feature: the footer always shows a link back to the child's home page
  //   so they can navigate to their quests without using the nav bar.
  test('footer link navigates back to the child home page', async ({ page }) => {
    const goLink = page.getByRole('link', { name: /Go do a quest/i })
    await expect(goLink).toBeVisible()
    await goLink.click()
    await expect(page).toHaveURL(/\/child$/)
  })
})
