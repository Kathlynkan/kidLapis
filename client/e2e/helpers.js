// Shared helpers for E2E tests. Import with:  import { loginAs } from './helpers'
import { expect } from '@playwright/test'

export const ACCOUNTS = {
  volunteer: 'volunteer@kidslapis.sg',
  coordinator: 'coordinator@kidslapis.sg',
  parent: 'parent@kidslapis.sg',
  child: 'child@kidslapis.sg',
}

export async function loginAs(page, role) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ACCOUNTS[role])
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)
}
