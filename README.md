Welcome to your new TanStack Start app!

# Getting Started

The TanStack Start app now lives in `apps/web`, while Convex stays at the repository root.

## Local URLs

Local web development uses `portless` so the app runs at a stable HTTPS hostname instead of a hardcoded localhost port.

- Main local app URL: `https://exam-prep.localhost`
- Main command: `pnpm dev`
- Re-running `pnpm dev` automatically replaces an older `exam-prep.localhost` session if one is still registered.
- The repo pins `portless@0.12.0`, so `pnpm dev` and `pnpm exec portless ...` always use the repo version even if you also have `portless` installed globally.

To run local development from the repository root:

```bash
pnpm install
pnpm exec portless trust
pnpm dev
```

`pnpm dev` starts both the web app and Convex together.

If you only want to run the Vite app directly without portless, use `pnpm --filter web run dev:app`.

# Building For Production

To build the workspace from the repository root:

```bash
pnpm build
```

## Deploying

Deploy the web app and Convex separately:

```bash
pnpm deploy:web
pnpm deploy:convex
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
pnpm test
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `apps/web/src/routes/demo/`
2. Replace the Tailwind import in `apps/web/src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `apps/web/vite.config.ts`
4. Uninstall the packages: `pnpm add @tailwindcss/vite tailwindcss --dev`

## Setting up Convex

- Set the `VITE_CONVEX_URL` and `CONVEX_DEPLOYMENT` environment variables in the root `.env.local`. (Or run `pnpm dlx convex init` to set them automatically.)
- Run `pnpm dev` for the standard combined workflow, or `pnpm convex:dev` if you only want Convex.
- Keep `VITE_CONVEX_URL` pointed at the Convex deployment URL. `portless` only fronts the web dev server and does not replace Convex's own URL.

## Portless

`portless` handles the web server only. Turbo still starts Convex from the repo root through the existing `//#convex:dev` task.

- Use `pnpm exec portless list` to inspect active routes.
- Use `pnpm exec portless hosts sync` if Safari fails to resolve `.localhost`.
- Use `pnpm exec portless clean` to reset local certificates, routes, and hosts entries.
- Use `PORTLESS=0 pnpm dev` to bypass portless and fall back to the direct app process.

### Future Auth Work

- Register `https://exam-prep.localhost` as an allowed origin or callback URL in auth providers.
- Do not assume `localhost:3000` once auth is added.
- If you later proxy one portless app to another through Vite, set `changeOrigin: true` in the Vite proxy config.
- If a provider does not support wildcard local callback URLs, prefer the main checkout instead of a git worktree when testing auth locally.

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `apps/web/src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `apps/web/src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from '@tanstack/react-router'
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `apps/web/src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')

  useEffect(() => {
    getServerTime().then(setTime)
  }, [])

  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
