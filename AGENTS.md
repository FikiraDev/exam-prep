# Agent Instructions

## Read First

- Convex backend changes: read `convex/_generated/ai/guidelines.md` first.
- Local dev, `portless`, auth callbacks, or browser origins: read `docs/agents/portless.md`.
- Issue tracker, triage labels, domain docs, and hook policy live in `docs/agents/`.

## Frontend Imports

- This is TanStack Start, not Next.js. Remove imported Next.js artifacts and do not keep `"use client"` unless a TanStack-specific need is verified.
- When importing shadcn/ui or other third-party component files, clean them for this repo: no inline suppressions, no memo hooks added just to satisfy lint, explicit `htmlFor` when wrapping `<label>`, CVA `defaultVariants` in typed constants, stable empty `[]`/`{}` fallbacks as module constants.
- Do not hand-edit generated TanStack Router or Convex headers; keep generated files generated and excluded from linting.

## Verification

- After any repo file change, run `pnpm run verify`.
- Do not suppress verify errors or warnings with `lint-disable`, `fallow-ignore`, or similar directives without explicit user consent.
