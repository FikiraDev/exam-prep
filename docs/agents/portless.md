# Portless

How agents should work with local development URLs in this repo.

## Current setup

- The web app lives in `apps/web`.
- Convex lives at the repo root and still runs through the existing root `convex:dev` script.
- `apps/web` uses `portless exam-prep --force vite dev` for `dev`, with the direct Vite command exposed as `dev:app`.
- Default local app URL is `https://exam-prep.localhost`.
- The repo pins `portless@0.12.0` in the root `package.json`.

## Commands

- Normal local development: `pnpm dev`
- Run the web app without portless: `pnpm --filter web run dev:app`
- Run portless commands with the repo-pinned version: `pnpm exec portless <command>`

## Global install

- A global `portless` install may also exist on the machine.
- Do not rely on the global binary for repo instructions.
- `pnpm dev` and `pnpm exec portless ...` resolve the repo-pinned version first, which avoids version drift.

## Vite and ports

- Do not reintroduce a hardcoded `--port 3000` to the app `dev` script.
- `portless` injects the right `PORT` and Vite-compatible flags automatically.
- If debugging outside portless, use `dev:app` rather than editing scripts.

## Convex

- Keep `VITE_CONVEX_URL` pointed at the Convex deployment URL from `.env.local`.
- Do not replace `VITE_CONVEX_URL` with a `portless` URL.
- `portless` fronts the web server, not the Convex backend.

## Auth

- When auth is introduced, register `https://exam-prep.localhost` as the local origin and callback base.
- Do not assume `http://localhost:3000` in auth docs, provider config, cookie config, or CSRF allowlists.
- `portless` no longer rewrites `Origin` or `Referer` for you, so future auth work must allow the real local origin explicitly.
- If the auth provider does not support wildcard callback URLs, prefer the main checkout instead of a git worktree for local auth testing.

## Convex auth requirements

- Create `convex/auth.config.ts` when enabling auth.
- In client code, switch from `ConvexProvider` to `ConvexProviderWithAuth` when tokens need to be sent.
- In Convex functions, derive identity server-side with `ctx.auth.getUserIdentity()`.
- Use `identity.tokenIdentifier` as the stable auth-linked identifier.
- Never accept a user identifier from the client for authorization checks.

## Multi-service proxying

- If this repo later proxies requests from one `portless` app to another through Vite, set `changeOrigin: true` and `ws: true` where needed.
- If a request loops back to the wrong app, check for a missing host rewrite first.

## Troubleshooting

- Inspect routes: `pnpm exec portless list`
- Re-sync hosts entries: `pnpm exec portless hosts sync`
- Reset local state: `pnpm exec portless clean`
- Bypass portless for one run: `PORTLESS=0 pnpm dev`
