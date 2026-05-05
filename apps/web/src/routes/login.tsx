import { createFileRoute } from '@tanstack/react-router'

import { AuthPage, redirectAuthenticated } from '#/components/auth-page'

export const Route = createFileRoute('/login')({
  beforeLoad: redirectAuthenticated,
  component: LoginPage,
})

function LoginPage() {
  return <AuthPage mode="login" />
}
