import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { createMiddleware, createServerFn } from '@tanstack/react-start'

import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import type { ConvexQueryClient } from '@convex-dev/react-query'

import { TooltipProvider } from '#/components/ui/tooltip'
import { authClient } from '#/lib/auth-client'
import { getToken } from '#/lib/auth-server'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

type RootAuthState = {
  isAuthenticated: boolean
  token: string | null
}

const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const token = (await getToken()) ?? null

  return await next({
    context: {
      isAuthenticated: token !== null,
      token,
    } satisfies RootAuthState,
  })
})

const getAuth = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<RootAuthState> => {
    return {
      isAuthenticated: context.isAuthenticated,
      token: context.token,
    }
  })

interface MyRouterContext {
  queryClient: QueryClient
  convexQueryClient: ConvexQueryClient
}

const devtoolsConfig = {
  position: 'bottom-right',
} as const

const devtoolsPlugins = [
  {
    name: 'Tanstack Router',
    render: <TanStackRouterDevtoolsPanel />,
  },
  TanStackQueryDevtools,
]

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Exam Prep',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  beforeLoad: async (ctx) => {
    const auth = await getAuth()

    if (auth.token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(auth.token)
    }

    return auth
  },
  component: RootComponent,
  notFoundComponent: RootNotFound,
  shellComponent: RootDocument,
})

function RootComponent() {
  const context = useRouteContext({ from: Route.id })

  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <Outlet />
      <TanStackDevtools config={devtoolsConfig} plugins={devtoolsPlugins} />
    </ConvexBetterAuthProvider>
  )
}

function RootNotFound() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-6">
        <span className="w-fit rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          404
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">
          The page you requested is not available. Return to the app to continue.
        </p>
        <nav aria-label="Not found navigation" className="flex gap-4 text-sm font-medium">
          <a className="text-primary underline-offset-4 hover:underline" href="/login">
            Sign in
          </a>
          <a
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href="/"
          >
            Home
          </a>
        </nav>
      </section>
    </main>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <TooltipProvider>{children}</TooltipProvider>
        <Scripts />
      </body>
    </html>
  )
}
