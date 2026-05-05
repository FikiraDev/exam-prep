import { describe, expect, it } from 'vitest'

import { getAuthErrorMessage } from './auth-errors'

describe('getAuthErrorMessage', () => {
  it('returns the fallback message when there is no error', () => {
    expect(getAuthErrorMessage(null, 'Fallback')).toBe('Fallback')
    expect(getAuthErrorMessage(undefined, 'Fallback')).toBe('Fallback')
  })

  it('returns the error message when present', () => {
    expect(getAuthErrorMessage({ message: 'Invalid credentials.' }, 'Fallback')).toBe(
      'Invalid credentials.',
    )
  })

  it('returns a rate-limit message for 429 status', () => {
    expect(getAuthErrorMessage({ status: 429, message: 'Too many requests.' }, 'Fallback')).toBe(
      'Too many attempts. Please try again later.',
    )
  })

  it('falls back when the error has no message', () => {
    expect(getAuthErrorMessage({ status: 500 }, 'Fallback')).toBe('Fallback')
  })
})
