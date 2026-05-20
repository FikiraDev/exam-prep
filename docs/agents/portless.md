# Portless (local dev)

This app uses [portless](https://github.com/vercel-labs/portless) for local development URLs.

## Expected URL

- **App:** https://exam-prep.localhost

Portless infers the name from `package.json` (`exam-prep`). Git worktrees get a branch prefix automatically (e.g. `https://fix-ui.exam-prep.localhost`).

## Commands

```bash
bun run dev          # portless → vite dev (HTTPS at exam-prep.localhost)
PORTLESS=0 bun run dev   # bypass proxy; vite on its default port
portless list        # active routes
portless trust       # trust local HTTPS CA (first-time setup)
portless proxy start # start proxy manually if auto-start fails
```

## Healthy state

`bun run dev` should print a `PORTLESS_URL` for `https://exam-prep.localhost`, and `portless list` should show:

```text
https://exam-prep.localhost -> localhost:<vite-port> (pid <pid>)
```

Verify the route without a browser:

```bash
curl -k -I https://exam-prep.localhost/
```

Expected result: `HTTP/2 200` and an `x-portless: 1` response header.

## Config

- `package.json` → `"portless": "exam-prep"`
- `dev` runs `portless run vite dev` so portless can inject `--port` / `--host` (Vite ignores `PORT` when invoked via nested package scripts).
- `dev:app` runs plain `vite dev` for direct access without the proxy.

## Auth / OAuth / CORS

When adding auth callbacks or CORS allowlists, use the portless URL (`https://exam-prep.localhost`), not `http://localhost:3000`.

## Troubleshooting

- **Certificate warning:** run `portless trust`, then restart the browser.
- **Safari can't resolve `.localhost`:** run `portless hosts sync`.
- **Proxy not running:** run `portless proxy start`, then confirm with `portless list`.
- **Route is `http://exam-prep.localhost:1355`:** the proxy is running in fallback mode instead of normal HTTPS on port 443. Run `portless proxy stop`, then `portless proxy start`.
- **`exam-prep.localhost` is already registered:** a previous `bun run dev` process is still active. Use `portless list` to find the PID, stop that process, and run `bun run dev` again.
- **Portless says no app is registered:** `bun run dev` is not running or exited before Vite started. Run `bun run dev` and keep it open while testing.
- **Wrong app after refresh:** use named URLs; avoid bookmarking raw `localhost:<port>`.
