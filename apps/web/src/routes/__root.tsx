import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import { TooltipProvider } from '#/components/ui/tooltip'

import ConvexProvider from '../integrations/convex/provider'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

interface MyRouterContext {
  queryClient: QueryClient
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
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <TooltipProvider>
          <ConvexProvider>
            {children}
            <TanStackDevtools config={devtoolsConfig} plugins={devtoolsPlugins} />
          </ConvexProvider>
        </TooltipProvider>
        <Scripts />
      </body>
    </html>
  )
}
