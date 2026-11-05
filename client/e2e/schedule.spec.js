import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

// Daniel's Tuesday cell on the timetable
const danielTuesday = (page) =>
  page
    .locator('[data-test="schedule-row"]', { hasText: 'Daniel' })
    .locator('[data-test="schedule-cell"][data-day="Tue"]')

test.describe('Coordinator: weekly schedule', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'coordinator')
    await page.goto('/coordinator/schedule')
    await expect(page.locator('[data-test="schedule-table"]')).toBeVisible()
  })

  test('the timetable shows each volunteer with their confirmed sessions', async ({ page }) => {
    for (const name of ['Aisha', 'Daniel', 'Priya']) {
      await expect(page.locator('[data-test="schedule-row"]', { hasText: name })).toBeVisible()
    }
    // Daniel's Tuesday: Ethan at 16:00 and Ryan at 17:00, both confirmed (no Pending tag)
    const cell = danielTuesday(page)
    await expect(cell.locator('[data-test="schedule-slot"]', { hasText: 'Ethan' })).toContainText('16:00')
    await expect(cell.locator('[data-test="schedule-slot"]', { hasText: 'Ryan' })).toContainText('17:00')
    await expect(cell.locator('[data-test="pending-tag"]')).toHaveCount(0)
  })

  test('times that would double-book a volunteer are greyed out, and the server refuses them', async ({
    page,
    request,
  }) => {
    await danielTuesday(page).locator('[data-test="add-slot"]').click()
    const form = page.locator('[data-test="add-slot-form"]')
    await form.locator('[data-test="add-child"]').selectOption('c_6') // Sofia

    // Daniel has Ethan at 16:00 and Ryan at 17:00, and sessions last an hour
    const time = (t) => form.locator(`[data-test="add-time"] option[value="${t}"]`)
    await expect(time('16:30')).toBeDisabled()
    await expect(time('16:30')).toContainText('Daniel has Ethan at 16:00')
    await expect(time('17:30')).toContainText('Daniel has Ryan at 17:00')
    await expect(time('18:00')).toBeEnabled() // free: Ryan ends at 18:00

    // Even if someone gets past the page, the server checks the clash rule itself and saves nothing
    const API = 'http://localhost:8000'
    const login = await request.post(`${API}/auth/login`, {
      data: { email: 'coordinator@kidslapis.sg', password: 'password123' },
    })
    const { token } = await login.json()
    const res = await request.put(`${API}/matchmaking/c_6/assign`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { action: 'assign', volunteerId: 'u_vol2', day: 'Tue', time: '16:30' }, // Daniel
    })
    expect(res.status()).toBe(409) // 409 Conflict
    expect((await res.json()).message).toContain('already has Ethan Wong on Tue at 16:00')
  })

  test('sending a request shows it as Pending until it is cancelled', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Changes data: runs on desktop only')

    await danielTuesday(page).locator('[data-test="add-slot"]').click()
    const form = page.locator('[data-test="add-slot-form"]')
    await form.locator('[data-test="add-child"]').selectOption('c_6') // Sofia
    await form.locator('[data-test="add-time"]').selectOption('18:00') // free: Ryan ends at 18:00
    await form.locator('[data-test="add-submit"]').click()

    const sofia = danielTuesday(page).locator('[data-test="schedule-slot"]', { hasText: 'Sofia' })
    try {
      await expect(form).toHaveCount(0) // the dialog closed
      // Daniel hasn't accepted yet, so it shows as Pending
      await expect(sofia).toContainText('18:00')
      await expect(sofia.locator('[data-test="pending-tag"]')).toBeVisible()
    } finally {
      // Cancel the request, so the data is back to how the seed left it
      if (await sofia.count()) await sofia.locator('[data-test="remove-slot"]').click()
      await expect(sofia).toHaveCount(0)
    }
  })

  test('the dashboard shows the same timetable, read-only', async ({ page }) => {
    await page.goto('/coordinator')
    await page.locator('[data-test="toggle-week"]').click()
    const table = page.locator('[data-test="schedule-table"]')
    await expect(table).toBeVisible()
    // Same sessions as the Schedule page...
    await expect(danielTuesday(page).locator('[data-test="schedule-slot"]', { hasText: 'Ethan' })).toBeVisible()
    // ...but no "+ Add" or remove buttons: editing only happens on the Schedule page
    await expect(table.locator('[data-test="add-slot"]')).toHaveCount(0)
    await expect(table.locator('[data-test="remove-slot"]')).toHaveCount(0)
  })
})