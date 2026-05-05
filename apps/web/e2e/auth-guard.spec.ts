import { expect, test } from '@playwright/test'

test('unauthenticated users are redirected to login from dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})
