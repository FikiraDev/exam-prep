import { createFileRoute } from '@tanstack/react-router'

import { AuthPage, redirectAuthenticated } from '#/components/auth-page'

export const Route = createFileRoute('/signup')({
  beforeLoad: redirectAuthenticated,
  component: SignupPage,
})

function SignupPage() {
  return <AuthPage mode="signup" />
}
