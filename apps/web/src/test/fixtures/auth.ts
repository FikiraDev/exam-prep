const TEST_USER_PASSWORD = 'TestPassword123!'
const TEST_USER_NAME = 'Test User'

export function buildTestUser() {
  const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`

  return {
    email: `e2e-${runId}@example.test`,
    password: TEST_USER_PASSWORD,
    name: TEST_USER_NAME,
  } as const
}

export const TEST_USER_INVALID = {
  email: 'wrong@example.com',
  password: 'wrong',
} as const
