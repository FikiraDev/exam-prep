import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'

import { isAuthError } from './auth-error-detection'

const authServerOptions = {
  convexUrl: import.meta.env.VITE_CONVEX_URL!,
  convexSiteUrl: import.meta.env.VITE_CONVEX_SITE_URL!,
  jwtCache: {
    enabled: true,
    isAuthError,
  },
} as const

export const { handler, getToken } = convexBetterAuthReactStart(authServerOptions)
