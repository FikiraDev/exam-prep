import { isAuthError } from '#/lib/auth-error-detection'
import { describe, expect, it } from 'vitest'

describe('isAuthError', () => {
  it.each([
    // Plain server error from requireAuthUserId
    { message: 'Unauthorized' },
    // Convex-wrapped client error from todos:list
    { message: '[CONVEX Q(todos:list)] Unauthorized\n  Called by client' },
    // Plain server error from Better Auth (ConvexError on server)
    { message: 'Unauthenticated' },
    // Convex-wrapped client error from auth:getCurrentUser
    { message: '[CONVEX Q(auth:getCurrentUser)] Unauthenticated\n  Called by client' },
  ])('returns true for auth error: $message', ({ message }) => {
    expect(isAuthError(new Error(message))).toBe(true)
  })

  it('returns false for a non-auth Error', () => {
    expect(isAuthError(new Error('Database connection failed'))).toBe(false)
  })

  it.each(['Unauthorized', 'Unauthenticated'])('returns true for auth error code: %s', (code) => {
    expect(isAuthError(Object.assign(new Error('Token refresh failed'), { code }))).toBe(true)
  })

  it('returns false for a non-Error thrown value', () => {
    expect(isAuthError('Unauthorized')).toBe(false)
    expect(isAuthError({ message: 'Unauthorized' })).toBe(false)
    expect(isAuthError(null)).toBe(false)
    expect(isAuthError(undefined)).toBe(false)
  })
})
