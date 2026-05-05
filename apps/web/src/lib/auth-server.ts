import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'

import { isAuthError } from './auth-error-detection'

const convexUrl = import.meta.env.VITE_CONVEX_URL
const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

if (!convexUrl) {
  throw new Error('VITE_CONVEX_URL is not set')
}
if (!convexSiteUrl) {
  throw new Error('VITE_CONVEX_SITE_URL is not set')
}

const authServerOptions = {
  convexUrl,
  convexSiteUrl,
  jwtCache: {
    enabled: true,
    isAuthError,
  },
} as const

export const { handler, getToken } = convexBetterAuthReactStart(authServerOptions)
