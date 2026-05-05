import { describe, expect, it } from 'vitest'

import { loginSchema, signupSchema } from './auth-validation'

describe('auth validation', () => {
  it('accepts valid login credentials', () => {
    expect(
      loginSchema.parse({
        email: '  test@example.com  ',
        password: 'TestPassword123!',
      }),
    ).toEqual({
      email: 'test@example.com',
      password: 'TestPassword123!',
    })
  })

  it('rejects invalid login email', () => {
    expect(loginSchema.safeParse({ email: 'bad-email', password: 'password' }).success).toBe(false)
  })

  it('accepts valid signup input', () => {
    expect(
      signupSchema.parse({
        name: '  Test User  ',
        email: 'test@example.com',
        password: 'TestPassword123!',
      }),
    ).toEqual({
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPassword123!',
    })
  })

  it('requires stronger signup passwords', () => {
    expect(
      signupSchema.safeParse({
        name: 'Test User',
        email: 'test@example.com',
        password: 'short',
      }).success,
    ).toBe(false)
  })

  it('rejects passwords longer than the client cap', () => {
    expect(
      loginSchema.safeParse({
        email: 'test@example.com',
        password: 'x'.repeat(129),
      }).success,
    ).toBe(false)
  })
})
