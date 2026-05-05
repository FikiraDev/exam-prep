import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { redirectAuthenticated } from '#/components/auth-page'
import { Button } from '#/components/ui/button'
import { ArrowRightIcon } from 'lucide-react'

export const Route = createFileRoute('/')({
  beforeLoad: redirectAuthenticated,
  component: LandingPage,
  head: () => ({
    meta: [
      { title: 'Exam Prep' },
      { name: 'description', content: 'Focused practice workspace for exam prep.' },
    ],
  }),
})

function LandingPage() {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-screen items-center bg-background px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">Exam Prep</p>
          <h1 className="text-3xl font-semibold tracking-tight">Build focus before test day.</h1>
          <p className="text-muted-foreground">
            Keep study tasks organized in one protected workspace backed by live Convex data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void navigate({ to: '/login' })} type="button">
            Sign in
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button onClick={() => void navigate({ to: '/signup' })} type="button" variant="outline">
            Create account
          </Button>
        </div>
      </div>
    </main>
  )
}
