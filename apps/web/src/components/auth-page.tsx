import { redirect } from '@tanstack/react-router'

import { AuthForm } from '#/components/auth-form'

export async function redirectAuthenticated({
  context,
}: {
  context: { isAuthenticated: boolean }
}) {
  if (context.isAuthenticated) {
    throw redirect({ to: '/dashboard' })
  }
}

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <AuthForm mode={mode} />
    </main>
  )
}
