export function getAuthErrorMessage(
  error: { status?: number; message?: string } | null | undefined,
  fallbackMessage: string,
): string {
  if (error?.status === 429) {
    return 'Too many attempts. Please try again later.'
  }
  return fallbackMessage
}
