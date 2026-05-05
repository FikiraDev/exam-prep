import { Outlet, createFileRoute, redirect, useRouter } from '@tanstack/react-router'

import { AuthBoundary } from '@convex-dev/better-auth/react'

import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'
import { AlertCircleIcon } from 'lucide-react'

import { api } from '../../../../../convex/_generated/api'
import { DashboardPending } from './dashboard'

export function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  // Convex wraps server errors so the client-side message includes the
  // original server error text, e.g.:
  //   "[CONVEX Q(todos:list)] Unauthorized\n  Called by client"
  //   "[CONVEX Q(auth:getCurrentUser)] Unauthenticated\n  Called by client"
  // Both shapes originate from auth checks and must be caught by the
  // AuthBoundary so they never reach the route-level errorComponent.
  return error.message.includes('Unauthorized') || error.message.includes('Unauthenticated')
}

function AuthenticatedLayout() {
  const router = useRouter()

  return (
    <AuthBoundary
      authClient={authClient}
      getAuthUserFn={api.auth.getCurrentUser}
      isAuthError={isAuthError}
      onUnauth={async () => {
        await router.navigate({ to: '/login', replace: true })
      }}
      renderFallback={() => <DashboardPending />}
    >
      <Outlet />
    </AuthBoundary>
  )
}

function AuthenticatedError({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'

  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircleIcon className="size-6 text-destructive" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <Button onClick={() => window.location.reload()} type="button" variant="outline">
          Reload page
        </Button>
      </div>
    </main>
  )
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    // Only enforce the redirect during SSR. On the client, AuthBoundary
    // handles unauthenticated users reactively so that logout (and other
    // auth transitions) never flash the route errorComponent.
    if (typeof window === 'undefined' && !context.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthenticatedLayout,
  pendingComponent: DashboardPending,
  errorComponent: AuthenticatedError,
})
