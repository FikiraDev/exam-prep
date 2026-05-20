Welcome to your new TanStack Start app!

# Getting Started

To run this application:

```bash
bun install
bun run dev
```

The dev server runs at **https://exam-prep.localhost** via [portless](https://github.com/vercel-labs/portless). Portless assigns a free port to Vite and routes the stable `.localhost` URL through a local HTTPS proxy.

To run Vite directly without the proxy:

```bash
bun run dev:app
```

## First-time setup

Start the HTTPS proxy once. macOS/Linux may prompt for sudo because the normal setup binds HTTPS on port 443:

```bash
portless proxy start
portless trust
```

Then run `bun run dev` and open **https://exam-prep.localhost**.

If `portless proxy start` falls back to an explicit port, the app will be reachable at a URL like `http://exam-prep.localhost:1355`, but that is a degraded local setup. Stop the fallback proxy and restart the normal HTTPS proxy:

```bash
portless proxy stop
portless proxy start
```

Use `portless list` to confirm the active route. A healthy route for this app looks like:

```text
https://exam-prep.localhost -> localhost:<vite-port> (pid <pid>)
```

If `bun run dev` says `exam-prep.localhost` is already registered, another dev process is still running. Check `portless list`, stop the stale process, then run `bun run dev` again.

# Building For Production

To build this application for production:

```bash
bun --bun run build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
bun --bun run test
```

## Linting and Formatting

This project uses [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) for formatting and [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) for fast JavaScript/TypeScript linting.

```bash
bun run format         # write formatting changes
bun run format:check   # check formatting without writing
bun run lint           # fast lint pass
bun run lint:fix       # safe lint autofixes
bun run lint:typeaware # type-aware lint pass for full local checks
bun run lint:react19   # React 19 hooks/compiler best-practices pass
bun run scan:react     # start dev server with React Scan injected
bun run fix            # formatter + safe lint fixes
bun run check          # full local quality gate
```

Pre-commit hooks run `bun run lint:staged`, which formats staged supported files and applies safe oxlint fixes. `bun run check` also runs the official React Hooks `recommended-latest` rules so React 19 and React Compiler diagnostics are part of the local gate.

For a runtime render review, run `bun run scan:react` and open `https://exam-prep-scan.localhost`. This starts a separate local dev server with React Scan injected, using the Aiden Bai/Million tool for finding slow or unnecessary renders that static linting cannot prove.

TanStack Router owns `src/routeTree.gen.ts`; it is intentionally ignored by linting, formatting, file watching, and editor search.

Convex-specific lint rules are not installed yet because this checkout does not include Convex code. When Convex is added, keep oxlint/oxfmt as the default fast path and add the official Convex ESLint plugin as a focused companion check for the Convex directory.

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Uninstall the packages: `bun install @tailwindcss/vite tailwindcss -D`

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

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

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

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
