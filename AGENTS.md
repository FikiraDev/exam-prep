# Agent Instructions

## Read First

- Convex backend changes: read `convex/_generated/ai/guidelines.md` first.
- Local dev, `portless`, auth callbacks, or browser origins: read `docs/agents/portless.md`.
- Issue tracker, triage labels, domain docs, and hook policy live in `docs/agents/`.

## Environment Variables / Secrets

- `.env.convex.dev` and `.env.convex.prod` are tracked in git and must contain **only non-sensitive config** (e.g. `SITE_URL`).
- Secrets (`BETTER_AUTH_SECRET`, `E2E_CLEANUP_SECRET`, API keys, etc.) must **never** be committed.
- For local dev, keep secrets in untracked `.env.local`.
- For CI, inject secrets via the platform's secret mechanism and set them on the deployment with `npx convex env set` (do not check them into `.env.convex.*`).
- Rotating a secret that was previously committed is required: update `.env.local`, run `npx convex env set <NAME> <VALUE>`, and invalidate the old value.

## Frontend Imports

- This is TanStack Start, not Next.js. Remove imported Next.js artifacts and do not keep `"use client"` unless a TanStack-specific need is verified.
- When importing shadcn/ui or other third-party component files, clean them for this repo: no inline suppressions, no memo hooks added just to satisfy lint, explicit `htmlFor` when wrapping `<label>`, CVA `defaultVariants` in typed constants, stable empty `[]`/`{}` fallbacks as module constants.
- Do not hand-edit generated TanStack Router or Convex headers; keep generated files generated and excluded from linting.

## Verification

- After any repo file change, run `pnpm run verify`.
- Do not suppress verify errors or warnings with `lint-disable`, `fallow-ignore`, or similar directives without explicit user consent.

## Intentional Decisions

- When a review item or linter rule is intentionally skipped, not followed, or worked around, **you must add an explanatory comment in the code** (not just in the commit message or PR description). The comment must state **why** the deviation is acceptable and under what conditions it should be revisited. Never leave an intentional deviation uncommented.
- If an intentional decision affects repo conventions or future agent behavior, update `AGENTS.md` so subsequent agents are aware of the precedent and do not revert the decision blindly.
