const AUTH_ERROR_MARKERS = ['Unauthorized', 'Unauthenticated'] as const

export function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const code = 'code' in error ? error.code : undefined
  // Convex wraps server errors, so auth failures can appear in either the
  // message text or a structured code depending on where they are caught.
  return AUTH_ERROR_MARKERS.some((marker) => error.message.includes(marker) || code === marker)
}
