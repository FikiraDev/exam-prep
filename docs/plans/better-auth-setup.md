# Better Auth Setup Plan

> Convex + Better Auth + TanStack Start — Email/Password (Pass 1)

## Overview

Add authentication to the exam-prep monorepo using `@convex-dev/better-auth` as a Convex component. Pass 1 covers email + password login. Pass 2 (separate ticket) adds Google OAuth.

### Key Decisions

| Decision            | Choice                                                           | Rationale                                                       |
| ------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Auth method         | Email + Password                                                 | Simplest first pass; email retained for OAuth linking in pass 2 |
| Session persistence | `ConvexBetterAuthProvider` + `initialToken` + `expectAuth: true` | Fixes refresh-logout bug; official pattern                      |
| Route protection    | `_authenticated` layout + `<Authenticated>` wrapper              | SSR redirect + Convex token safety                              |
| UI                  | shadcn `login-01` / `signup-01` blocks                           | Polished, consistent with existing `base-luma` style            |
| Testing             | Vitest (unit) + convex-test (integration) + Playwright (E2E)     | Full coverage pyramid                                           |
| Local URL           | `https://exam-prep.localhost`                                    | Portless provides stable HTTPS hostname                         |

---

## Phase 1: Package Installation

### New Packages

```bash
# From repo root
pnpm add @convex-dev/better-auth
pnpm add better-auth@~1.6.9 --save-exact

# From apps/web
cd apps/web
pnpm add @convex-dev/better-auth
pnpm add better-auth@~1.6.9 --save-exact

# E2E testing
pnpm add -D @playwright/test playwright

# Convex integration testing (repo root — tests live near convex/)
pnpm add -D convex-test
```

### Already Installed (No Action)

| Package                   | Location   | Version    |
| ------------------------- | ---------- | ---------- |
| `convex`                  | root + web | `^1.32.0`  |
| `@convex-dev/react-query` | web        | `0.1.0`    |
| `@tanstack/react-start`   | web        | `latest`   |
| `@tanstack/react-router`  | web        | `latest`   |
| `@tanstack/react-query`   | web        | `latest`   |
| `vitest`                  | web        | `^4.1.5`   |
| `@testing-library/react`  | web        | `^16.3.0`  |
| `@testing-library/dom`    | web        | `^10.4.1`  |
| `jsdom`                   | web        | `^28.1.0`  |
| `zod`                     | web        | `^4.4.2`   |
| `@types/node`             | web        | `^22.10.2` |

### shadcn Blocks (from `apps/web/`)

```bash
pnpm dlx shadcn@latest add login-01
pnpm dlx shadcn@latest add signup-01
```

> **NOTE:** After installing blocks, remove `"use client"` directives — TanStack Start, not Next.js (per AGENTS.md).

---

## Phase 2: Convex Backend Setup

### 2.1 Register Component

Create `convex/convex.config.ts`:

```typescript
import betterAuth from '@convex-dev/better-auth/convex.config'
import { defineApp } from 'convex/server'

const app = defineApp()
app.use(betterAuth)
export default app
```

### 2.2 Auth Config (JWT Provider)

Create `convex/auth.config.ts`:

```typescript
import { getAuthConfigProvider } from '@convex-dev/better-auth/auth-config'
import type { AuthConfig } from 'convex/server'

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig
```

### 2.3 Better Auth Server Instance

Create `convex/auth.ts`:

```typescript
import { betterAuth } from 'better-auth/minimal'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import authConfig from './auth.config'
import { components } from './_generated/api'
import { query } from './_generated/server'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'

const siteUrl = process.env.SITE_URL!

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [convex({ authConfig })],
  })
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx)
  },
})
```

> **IMPORTANT:** User data (user, session, account tables) lives in **component tables** managed by `@convex-dev/better-auth`. You do NOT define these in `convex/schema.ts`. The component owns its schema. Access user data via `authComponent.getAuthUser(ctx)` or `ctx.auth.getUserIdentity()`.

### 2.4 HTTP Route Handler

Create `convex/http.ts`:

```typescript
import { httpRouter } from 'convex/server'
import { authComponent, createAuth } from './auth'

const http = httpRouter()
authComponent.registerRoutes(http, createAuth)
export default http
```

> **TIP:** If you hit memory issues later (more plugins), switch to `authComponent.registerRoutesLazy(http, createAuth)` and use subpath imports for plugins (e.g., `better-auth/plugins/magic-link`).

---

## Phase 3: Frontend Auth Setup

### 3.1 Auth Client

Create `apps/web/src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from 'better-auth/react'
import { convexClient } from '@convex-dev/better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [convexClient()],
})
```

### 3.2 Auth Server Utilities

Create `apps/web/src/lib/auth-server.ts`:

```typescript
import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'

export const { handler, getToken, fetchAuthQuery, fetchAuthMutation, fetchAuthAction } =
  convexBetterAuthReactStart({
    convexUrl: process.env.VITE_CONVEX_URL!,
    convexSiteUrl: process.env.VITE_CONVEX_SITE_URL!,
  })
```

### 3.3 API Proxy Route

Create `apps/web/src/routes/api/auth/$.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { handler } from '#/lib/auth-server'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handler(request),
      POST: ({ request }) => handler(request),
    },
  },
})
```

### 3.4 Vite Config — SSR noExternal

Update `apps/web/vite.config.ts` — add SSR config:

```diff
 const config = defineConfig(() => {
   const isVitest = process.env.VITEST === 'true'

   return {
     envDir: '../../',
     resolve: { tsconfigPaths: true },
+    ssr: {
+      noExternal: ['@convex-dev/better-auth'],
+    },
     plugins: [
       devtools(),
       !isVitest && cloudflare({ viteEnvironment: { name: 'ssr' } }),
       tailwindcss(),
       tanstackStart(),
       viteReact(),
     ],
   }
 })
```

---

## Phase 4: Session Persistence Fix (Router + Provider Refactor)

This is the critical section that fixes the "refresh = logged out" bug.

### 4.1 Refactor `root-provider.tsx`

Replace `apps/web/src/integrations/tanstack-query/root-provider.tsx`:

```typescript
import { ConvexQueryClient } from '@convex-dev/react-query'
import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const convexUrl = (import.meta as any).env.VITE_CONVEX_URL!
  if (!convexUrl) {
    throw new Error('VITE_CONVEX_URL is not set')
  }

  const convexQueryClient = new ConvexQueryClient(convexUrl, {
    expectAuth: true,
  })

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  })

  convexQueryClient.connect(queryClient)

  return {
    queryClient,
    convexQueryClient,
  }
}
```

> **WARNING:** `expectAuth: true` means Convex won't run queries until auth token arrives. This prevents the flash-of-unauthenticated state but requires `location.reload()` on sign-out to reset the expectation.

### 4.2 Refactor `router.tsx`

Replace `apps/web/src/router.tsx`:

```typescript
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

import { getContext } from './integrations/tanstack-query/root-provider'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  setupRouterSsrQueryIntegration({
    router,
    queryClient: context.queryClient,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
```

> **NOTE:** Router context now includes `convexQueryClient` alongside `queryClient`. The router itself stays mostly the same — the key change is `getContext()` now returns both.

### 4.3 Refactor `__root.tsx`

This is where session persistence is wired:

```typescript
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";

import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";

import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { TooltipProvider } from "#/components/ui/tooltip";
import { authClient } from "#/lib/auth-client";
import { getToken } from "#/lib/auth-server";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

// Server function: get auth token from cookies during SSR
const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

interface MyRouterContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

const devtoolsConfig = {
  position: "bottom-right",
} as const;

const devtoolsPlugins = [
  {
    name: "Tanstack Router",
    render: <TanStackRouterDevtoolsPanel />,
  },
  TanStackQueryDevtools,
];

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Exam Prep" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  beforeLoad: async (ctx) => {
    const token = await getAuth();

    // During SSR, set auth token so HTTP queries are authenticated
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    return {
      isAuthenticated: !!token,
      token,
    };
  },
  component: RootComponent,
  shellComponent: RootDocument,
});

function RootComponent() {
  const context = useRouteContext({ from: Route.id });

  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <Outlet />
      <TanStackDevtools config={devtoolsConfig} plugins={devtoolsPlugins} />
    </ConvexBetterAuthProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

### 4.4 Delete Old Provider

Delete `apps/web/src/integrations/convex/provider.tsx` — its logic is now in `__root.tsx` via `ConvexBetterAuthProvider`.

### Session Persistence — How It Works

```
Browser → TanStack SSR: GET / (with cookies)
  SSR → beforeLoad → getAuth() reads cookies
  SSR → Convex Cloud: getToken() validates session via .site URL
  Convex → BetterAuth: Validate session cookie → returns JWT
  SSR ← token
  SSR: setAuth(token) on serverHttpClient
  SSR → Browser: SSR HTML (authenticated)
Browser: Hydrate with initialToken → no flash, no logout on refresh
Browser → Convex Cloud: WebSocket auth with token
```

---

## Phase 5: Route Structure

### New File Tree

```
apps/web/src/routes/
  __root.tsx                          ← refactored (Phase 4)
  index.tsx                           ← public landing page (simplified)
  login.tsx                           ← login page (shadcn login-01)
  signup.tsx                          ← signup page (shadcn signup-01)
  api/auth/$.tsx                      ← auth proxy handler
  _authenticated/
    route.tsx                         ← layout with beforeLoad guard
    dashboard.tsx                     ← protected, existing todo UI moves here
```

### 5.1 Login Route — `login.tsx`

```typescript
import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginForm } from "#/components/login-form";

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: "/_authenticated/dashboard" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoginForm />
    </div>
  );
}
```

### 5.2 Signup Route — `signup.tsx`

Same pattern, uses `SignupForm` from shadcn block. Redirect if already authenticated.

### 5.3 Authenticated Layout — `_authenticated/route.tsx`

```typescript
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { Authenticated } from "convex/react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <Authenticated>
      <Outlet />
    </Authenticated>
  );
}
```

> **IMPORTANT:** Double protection: `beforeLoad` handles SSR redirect. `<Authenticated>` from `convex/react` prevents Convex queries from firing before JWT validation completes on the client.

### 5.4 Dashboard — `_authenticated/dashboard.tsx`

Existing todo UI from `index.tsx` moves here. No logic changes to todos themselves.

### 5.5 Sign Out Pattern

```typescript
import { authClient } from '#/lib/auth-client'

async function handleSignOut() {
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        location.reload() // Required with expectAuth: true
      },
    },
  })
}
```

---

## Phase 6: Environment Variables & Syncing Strategy

The problem: Convex backend env vars live on the deployment (set via CLI/dashboard), while frontend env vars live in `.env.local`. These drift apart easily. Here's a robust strategy using Convex's latest tooling.

### 6.1 Environment Variable Inventory

Auth introduces variables that must exist in **two places** — some only on Convex, some only locally, some on both:

| Variable               | Where             | Dev Value                                     | Prod Value               |
| ---------------------- | ----------------- | --------------------------------------------- | ------------------------ |
| `BETTER_AUTH_SECRET`   | Convex only       | `$(openssl rand -base64 32)`                  | Different secret         |
| `SITE_URL`             | Convex only       | `https://exam-prep.localhost`                 | `https://fikira.uk`      |
| `CONVEX_DEPLOYMENT`    | `.env.local` only | `dev:outstanding-iguana-455`                  | N/A (CI uses deploy key) |
| `VITE_CONVEX_URL`      | `.env.local` only | `https://outstanding-iguana-455.convex.cloud` | Set by hosting provider  |
| `VITE_CONVEX_SITE_URL` | `.env.local` only | `https://outstanding-iguana-455.convex.site`  | Set by hosting provider  |
| `VITE_SITE_URL`        | `.env.local` only | `https://exam-prep.localhost`                 | `https://fikira.uk`      |

> **NOTE:** `CONVEX_CLOUD_URL` and `CONVEX_SITE_URL` are **system env vars** — always available in Convex functions automatically. You do NOT need to set them manually.

### 6.2 Single Source of Truth: `.env.convex`

Create a **checked-in** file that defines all Convex deployment env vars (values are per-environment, secrets are placeholders):

Create `.env.convex.dev`:

```env
# Convex deployment environment variables (dev)
# Sync to deployment: npx convex env set --from-file .env.convex.dev
# NOTE: BETTER_AUTH_SECRET is generated once, do not overwrite
SITE_URL=https://exam-prep.localhost
```

Create `.env.convex.prod`:

```env
# Convex deployment environment variables (prod)
# Sync to deployment: npx convex env set --from-file .env.convex.prod --prod
SITE_URL=https://fikira.uk
```

> **WARNING:** Never put actual secrets (like `BETTER_AUTH_SECRET`) in these files. Secrets are set once via CLI and live only on the deployment.

### 6.3 Bulk Sync with `--from-file`

Instead of running individual `npx convex env set` commands, use bulk sync:

```bash
# Sync all non-secret env vars to dev deployment
npx convex env set --from-file .env.convex.dev

# Sync to prod deployment
npx convex env set --from-file .env.convex.prod --prod
```

### 6.4 One-Time Secret Setup

Secrets are set once and never checked in:

```bash
# Dev deployment — run once
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)

# Prod deployment — run once with different secret
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32) --prod
```

### 6.5 Project Environment Variable Defaults

Set project-level defaults in Convex Dashboard (**Project Settings → Environment Variable Defaults**) or via CLI. These auto-apply to **new** deployments (preview, new dev):

```bash
# Set defaults that new deployments inherit
npx convex env default set SITE_URL https://exam-prep.localhost
```

The dashboard shows a mismatch indicator when a deployment's vars differ from project defaults — useful for catching drift.

### 6.6 Helper Script: `env:sync`

Add to root `package.json`:

```json
{
  "scripts": {
    "env:sync:dev": "npx convex env set --from-file .env.convex.dev",
    "env:sync:prod": "npx convex env set --from-file .env.convex.prod --prod",
    "env:list": "npx convex env list",
    "env:list:prod": "npx convex env list --prod"
  }
}
```

### 6.7 `.env.local` Updates

Add these lines to existing `.env.local`:

```env
# Same as VITE_CONVEX_URL but ends in .site
VITE_CONVEX_SITE_URL=https://outstanding-iguana-455.convex.site

# Your local site URL (must match SITE_URL on Convex deployment)
VITE_SITE_URL=https://exam-prep.localhost
```

### 6.8 `.gitignore` Verification

Ensure these are in `.gitignore` (secrets must never be committed):

```gitignore
.env.local
```

And these are **tracked** (no secrets, just non-sensitive config):

```
.env.convex.dev   ← tracked (no secrets)
.env.convex.prod  ← tracked (no secrets)
```

### 6.9 Environment Variable Sync Checklist

When onboarding or after pulling changes:

```bash
# 1. Ensure convex dev is running (creates .env.local)
npx convex dev

# 2. Sync non-secret Convex vars
pnpm run env:sync:dev

# 3. Check if secrets exist (run once per deployment)
npx convex env get BETTER_AUTH_SECRET
# If empty: npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)

# 4. Verify local .env.local has VITE_CONVEX_SITE_URL and VITE_SITE_URL
```

> **WARNING:** For production, `SITE_URL` must be your deployed domain (e.g., `https://fikira.uk`). Use `pnpm run env:sync:prod` after updating `.env.convex.prod`.

---

## Phase 7: shadcn Block Adaptation

### Login Form (`login-01`)

After `pnpm dlx shadcn@latest add login-01` from `apps/web/`:

1. **Remove** `"use client"` directive
2. **Remove** Google OAuth button (add `// TODO: Pass 2 — re-enable Google OAuth`)
3. **Wire** form to `authClient.signIn.email({ email, password })`
4. **Add** error state display (invalid credentials)
5. **Add** loading state during submission
6. **Add** `useNavigate()` redirect to `/dashboard` on success
7. **Clean** per AGENTS.md: no inline suppressions, explicit `htmlFor` on labels

### Signup Form (`signup-01`)

After `pnpm dlx shadcn@latest add signup-01` from `apps/web/`:

1. Same cleanup as login
2. **Wire** to `authClient.signUp.email({ email, password, name })`
3. **Add** name field if not present in block
4. **Add** "Already have an account?" link to `/login`

---

## Phase 8: Testing

### 8.1 Test User Fixture

Create `apps/web/src/test/fixtures/auth.ts`:

```typescript
export const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
} as const

export const TEST_USER_INVALID = {
  email: 'wrong@example.com',
  password: 'wrong',
} as const
```

### 8.2 Unit Tests (Vitest)

Location: `apps/web/src/lib/`

| Test File                 | What It Tests                                                          |
| ------------------------- | ---------------------------------------------------------------------- |
| `auth-client.test.ts`     | `authClient` creates with correct plugins                              |
| `auth-validation.test.ts` | Login/signup form validation schemas (email format, password strength) |

Already have Vitest configured. Run with `pnpm --filter web test`.

### 8.3 Integration Tests (convex-test)

Location: `convex/`

| Test File       | What It Tests                                   |
| --------------- | ----------------------------------------------- |
| `auth.test.ts`  | `getCurrentUser` returns null when unauthed     |
| `auth.test.ts`  | `getCurrentUser` returns user data when authed  |
| `todos.test.ts` | Existing todo mutations still work (regression) |

New package: `convex-test`

### 8.4 E2E Tests (Playwright)

Location: `apps/web/e2e/`

| Test File            | Scenarios                                                                     |
| -------------------- | ----------------------------------------------------------------------------- |
| `auth.spec.ts`       | Full signup -> login -> refresh -> still authenticated -> signout -> redirect |
| `auth-guard.spec.ts` | Unauthenticated user -> `/dashboard` -> redirected to `/login`                |
| `auth-forms.spec.ts` | Validation errors, empty fields, invalid email format                         |

New packages: `@playwright/test`, `playwright`

Playwright config at `apps/web/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'pnpm run dev:app',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'https://exam-prep.localhost',
  },
})
```

### Key E2E Test: Refresh Persistence

```typescript
test('user stays logged in after page refresh', async ({ page }) => {
  // Sign up
  await page.goto('/signup')
  await page.fill('[name="email"]', TEST_USER.email)
  await page.fill('[name="password"]', TEST_USER.password)
  await page.fill('[name="name"]', TEST_USER.name)
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard')

  // Refresh
  await page.reload()

  // Should still be on dashboard, not redirected to login
  await expect(page).toHaveURL(/dashboard/)
  await expect(page.locator('text=Focus Board')).toBeVisible()
})
```

---

## Phase 9: File Change Summary

### New Files

| File                                               | Purpose                                    |
| -------------------------------------------------- | ------------------------------------------ |
| `convex/convex.config.ts`                          | Register betterAuth component              |
| `convex/auth.config.ts`                            | JWT provider config                        |
| `convex/auth.ts`                                   | Auth instance + getCurrentUser query       |
| `convex/http.ts`                                   | HTTP route handler                         |
| `.env.convex.dev`                                  | Convex deployment env vars (dev, tracked)  |
| `.env.convex.prod`                                 | Convex deployment env vars (prod, tracked) |
| `apps/web/src/lib/auth-client.ts`                  | BetterAuth client                          |
| `apps/web/src/lib/auth-server.ts`                  | SSR auth utilities                         |
| `apps/web/src/routes/api/auth/$.tsx`               | Proxy route                                |
| `apps/web/src/routes/login.tsx`                    | Login page                                 |
| `apps/web/src/routes/signup.tsx`                   | Signup page                                |
| `apps/web/src/routes/_authenticated/route.tsx`     | Auth layout guard                          |
| `apps/web/src/routes/_authenticated/dashboard.tsx` | Protected todo page                        |
| `apps/web/src/test/fixtures/auth.ts`               | Test user credentials                      |
| `apps/web/src/lib/auth-validation.test.ts`         | Unit tests                                 |
| `convex/auth.test.ts`                              | Integration tests                          |
| `apps/web/e2e/auth.spec.ts`                        | E2E tests                                  |
| `apps/web/playwright.config.ts`                    | Playwright config                          |

### Modified Files

| File                                                         | Change                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| `apps/web/vite.config.ts`                                    | Add `ssr.noExternal`                                           |
| `apps/web/src/routes/__root.tsx`                             | Full refactor — ConvexBetterAuthProvider, beforeLoad, getAuth  |
| `apps/web/src/router.tsx`                                    | Context now includes `convexQueryClient`                       |
| `apps/web/src/integrations/tanstack-query/root-provider.tsx` | Add ConvexQueryClient with `expectAuth: true`                  |
| `apps/web/src/routes/index.tsx`                              | Simplify to public landing page                                |
| `.env.local`                                                 | Add `VITE_SITE_URL`, `VITE_CONVEX_SITE_URL`                    |
| `apps/web/package.json`                                      | New deps                                                       |
| `package.json`                                               | New deps + `env:sync:dev`, `env:sync:prod`, `env:list` scripts |

### Deleted Files

| File                                            | Reason                                                 |
| ----------------------------------------------- | ------------------------------------------------------ |
| `apps/web/src/integrations/convex/provider.tsx` | Replaced by `ConvexBetterAuthProvider` in `__root.tsx` |

---

## Implementation Order

```
1. Install packages
2. Convex backend (convex.config + auth.config + auth.ts + http.ts)
3. Create .env.convex.dev + .env.convex.prod files
4. Set BETTER_AUTH_SECRET (one-time): npx convex env set BETTER_AUTH_SECRET=...
5. Sync env vars: pnpm run env:sync:dev
6. Update .env.local (VITE_CONVEX_SITE_URL + VITE_SITE_URL)
7. Set project env defaults: npx convex env default set SITE_URL ...
8. Frontend auth files (auth-client.ts + auth-server.ts)
9. Vite SSR config
10. Router + Provider refactor (root-provider + router + __root)
11. API proxy route (api/auth/$.tsx)
12. Delete old provider
13. Verify: pnpm run verify
14. Route structure (login + signup + _authenticated layout)
15. shadcn blocks (login-01 + signup-01)
16. Wire forms to authClient
17. Move todos to dashboard
18. Simplify index.tsx
19. Unit + Integration tests
20. E2E tests
21. Final verify
```

---

## Pass 2 Prep (Google OAuth — Future)

When ready, the changes are minimal:

1. Add `socialProviders: { google: { clientId, clientSecret } }` to `createAuth` in `convex/auth.ts`
2. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on Convex env
3. Re-enable Google OAuth button in login/signup forms
4. Add `authClient.signIn.social({ provider: "google" })` handler
5. No router/provider changes needed — infrastructure already supports it

---

## Gotchas and Notes

**Do NOT use `authClient.useSession()` or `getSession()` for UI gating.** Always use `useConvexAuth()` or `<Authenticated>` from `convex/react`. BetterAuth reflects auth state before Convex validates the JWT — calling Convex queries too early will throw.

**Sign out MUST call `location.reload()`** when using `expectAuth: true`. Without reload, Convex queries fire before re-authentication, causing errors.

**Portless provides HTTPS** at `https://exam-prep.localhost`. Cookie `secure: true` and `sameSite: "lax"` defaults work correctly. Do NOT hardcode `http://localhost:3000`.

**User data lives in component tables.** You don't define user/session/account tables in `convex/schema.ts`. The `@convex-dev/better-auth` component manages its own schema. Access via `authComponent.getAuthUser(ctx)`.
