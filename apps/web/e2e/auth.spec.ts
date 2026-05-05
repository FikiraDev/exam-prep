import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { buildTestUser } from '../src/test/fixtures/auth'

async function expectDashboard(page: Page) {
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Focus Board' })).toBeVisible()
}

async function expectLoggedOut(page: Page) {
  await expect(page).toHaveURL(/\/login$/)

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
}

async function fillCredentials(
  page: Page,
  user: ReturnType<typeof buildTestUser>,
  options?: { includeName?: boolean },
) {
  if (options?.includeName) {
    await page.getByLabel('Name').fill(user.name)
  }

  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
}

function collectPageIssues(page: Page) {
  const messages: string[] = []

  page.on('console', (message) => {
    const text = message.text()
    const isNotFoundBoundaryWarning =
      text.includes('notFoundError') || text.includes('defaultNotFoundComponent')
    if (
      (message.type() === 'error' || isNotFoundBoundaryWarning) &&
      !text.includes('Failed to load resource: the server responded with a status of 401')
    ) {
      messages.push(`[console:${message.type()}] ${text}`)
    }
  })

  page.on('pageerror', (error) => {
    messages.push(`[pageerror] ${error.message}`)
  })

  return {
    expectNone: () => expect(messages).toEqual([]),
  }
}

async function emulateSlow4G(page: Page) {
  const client = await page.context().newCDPSession(page)
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
  })
}

function waitForErrorFlash(page: Page) {
  return page
    .getByText('Something went wrong')
    .waitFor({ state: 'visible', timeout: 300 })
    .then(
      () => true,
      () => false,
    )
}

async function signUpForTest(page: Page, testUser: ReturnType<typeof buildTestUser>) {
  await page.goto('/signup')
  await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled()
  await fillCredentials(page, testUser, { includeName: true })
  await page.getByRole('button', { name: 'Create account' }).click()
  await expectDashboard(page)
}

async function signOut(page: Page) {
  const errorFlash = waitForErrorFlash(page)

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(errorFlash).resolves.toBe(false)
}

async function login(page: Page, testUser: ReturnType<typeof buildTestUser>) {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  await fillCredentials(page, testUser)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expectDashboard(page)
}

async function addTodo(page: Page, text: string) {
  await page.getByPlaceholder('Add a task...').fill(text)
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText(text)).toBeVisible()
}

async function deleteTodo(page: Page, text: string) {
  await page
    .getByRole('listitem')
    .filter({ hasText: text })
    .getByRole('button', { name: 'Delete task' })
    .click()
  await expect(page.getByText(text)).toBeHidden()
}

test.describe('Authentication Flow', () => {
  test('login, persist through todo changes and refreshes, then sign out cleanly', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    const testUser = buildTestUser()
    const todoText = `E2E persistence ${Date.now()}`
    const otherTodoText = `E2E keep ${Date.now()}`
    const pageIssues = collectPageIssues(page)

    await signUpForTest(page, testUser)
    await signOut(page)

    await login(page, testUser)
    await addTodo(page, otherTodoText)
    await addTodo(page, todoText)

    await page.reload()
    await expectDashboard(page)
    await expect(page.getByText(todoText)).toBeVisible()

    await deleteTodo(page, todoText)
    await expect(page.getByText(otherTodoText)).toBeVisible()

    await page.reload()
    await expectDashboard(page)
    await expect(page.getByText(todoText)).toBeHidden()
    await expect(page.getByText(otherTodoText)).toBeVisible()

    await emulateSlow4G(page)
    await signOut(page)
    await expectLoggedOut(page)
    pageIssues.expectNone()
  })
})
