import { useEffect, useState } from 'react'

// Intentional: aliased as RouterLink because oxlint's jsx-a11y/anchor-is-valid
// maps `Link` → `<a>` but does not recognize `to` as a valid link attribute,
// causing a false positive. Using `RouterLink` avoids the lint error while
// keeping SPA navigation via TanStack Router.
import { Link as RouterLink, useNavigate, useRouter } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { authClient } from '#/lib/auth-client'
import { getAuthErrorMessage } from '#/lib/auth-errors'
import { PASSWORD_MAX_LENGTH, loginSchema, signupSchema } from '#/lib/auth-validation'

function SubmittingSkeleton() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <div className="mx-auto h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="mx-auto h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-9 animate-pulse rounded-md bg-muted" />
        <div className="h-9 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-9 animate-pulse rounded-md bg-muted" />
    </div>
  )
}

type AuthMode = 'login' | 'signup'
type AuthValues = {
  name?: string
  email: string
  password: string
}
type FieldErrors = Partial<Record<keyof AuthValues, string>>

const modeConfig = {
  login: {
    title: 'Sign in',
    description: 'Use your email and password.',
    submitLabel: 'Sign in',
    pendingLabel: 'Signing in...',
    formError: 'Unable to sign in.',
    helperText: 'No account?',
    helperHref: '/signup',
    helperLabel: 'Create one',
  },
  signup: {
    title: 'Create account',
    description: 'Start with email and password.',
    submitLabel: 'Create account',
    pendingLabel: 'Creating...',
    formError: 'Unable to create account.',
    helperText: 'Have account?',
    helperHref: '/login',
    helperLabel: 'Sign in',
  },
} as const

function formString(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

function validateAuthValues(mode: AuthMode, values: AuthValues) {
  const result = mode === 'login' ? loginSchema.safeParse(values) : signupSchema.safeParse(values)

  if (result.success) {
    return {}
  }

  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path[0], issue.message]),
  ) as FieldErrors
}

function formValues(formData: FormData) {
  return {
    name: formString(formData, 'name'),
    email: formString(formData, 'email'),
    password: formString(formData, 'password'),
  }
}

async function submitAuth(mode: AuthMode, values: AuthValues) {
  if (mode === 'login') {
    return await authClient.signIn.email({
      email: values.email,
      password: values.password,
    })
  }

  return await authClient.signUp.email({
    name: values.name ?? '',
    email: values.email,
    password: values.password,
  })
}

function hasFieldErrors(errors: FieldErrors) {
  return Object.keys(errors).length > 0
}

function getAuthResultError(
  result: Awaited<ReturnType<typeof submitAuth>>,
  fallbackMessage: string,
) {
  return getAuthErrorMessage(result.error, fallbackMessage)
}

async function finishAuthSubmit({
  config,
  mode,
  navigate,
  router,
  setFormError,
  setIsSubmitting,
  values,
}: {
  config: (typeof modeConfig)[AuthMode]
  mode: AuthMode
  navigate: ReturnType<typeof useNavigate>
  router: ReturnType<typeof useRouter>
  setFormError: React.Dispatch<React.SetStateAction<string | null>>
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>
  values: AuthValues
}) {
  try {
    const result = await submitAuth(mode, values)
    if (result.error) {
      setIsSubmitting(false)
      setFormError(getAuthResultError(result, config.formError))
      return
    }

    await router.invalidate()
    await navigate({ to: '/dashboard', replace: true })
  } catch {
    setIsSubmitting(false)
    setFormError(config.formError)
  }
}

function TextField({
  autoComplete,
  error,
  label,
  maxLength,
  name,
  type = 'text',
}: {
  autoComplete: string
  error?: string
  label: string
  maxLength?: number
  name: keyof AuthValues
  type?: React.HTMLInputTypeAttribute
}) {
  const id = `auth-${name}`

  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        aria-invalid={!!error || undefined}
        autoComplete={autoComplete}
        id={id}
        maxLength={maxLength}
        name={name}
        type={type}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function AuthFields({ errors, mode }: { errors: FieldErrors; mode: AuthMode }) {
  return (
    <div className="flex flex-col gap-4">
      {mode === 'signup' ? (
        <TextField autoComplete="name" error={errors.name} label="Name" name="name" />
      ) : null}
      <TextField
        autoComplete="email"
        error={errors.email}
        label="Email"
        name="email"
        type="email"
      />
      <TextField
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        error={errors.password}
        label="Password"
        maxLength={PASSWORD_MAX_LENGTH}
        name="password"
        type="password"
      />
    </div>
  )
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate()
  const router = useRouter()
  const config = modeConfig[mode]
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const values = formValues(new FormData(event.currentTarget))
    const nextErrors = validateAuthValues(mode, values)
    setErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) {
      return
    }

    setIsSubmitting(true)
    await finishAuthSubmit({
      config,
      mode,
      navigate,
      router,
      setFormError,
      setIsSubmitting,
      values,
    })
  }

  if (isSubmitting) {
    return <SubmittingSkeleton />
  }

  return (
    <form className="flex w-full max-w-sm flex-col gap-6" onSubmit={(e) => void handleSubmit(e)}>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{config.title}</h1>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </div>

      <AuthFields errors={errors} mode={mode} />

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <Button disabled={!isHydrated} type="submit">
        {config.submitLabel}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {config.helperText}{' '}
        <RouterLink
          className="font-medium text-foreground underline-offset-4 hover:underline"
          to={config.helperHref}
        >
          {config.helperLabel}
        </RouterLink>
      </p>
    </form>
  )
}
