import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'

const isAuthError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false
  }
  const isUnauth =
    error.message?.includes('Unauthenticated') ||
    ('code' in error && error.code === 'Unauthenticated')
  return isUnauth
}

const authServerOptions = {
  convexUrl: import.meta.env.VITE_CONVEX_URL!,
  convexSiteUrl: import.meta.env.VITE_CONVEX_SITE_URL!,
  jwtCache: {
    enabled: true,
    isAuthError,
  },
} as const

export const { handler, getToken } = convexBetterAuthReactStart(authServerOptions)
