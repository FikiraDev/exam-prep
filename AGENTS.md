# Agent Notes

## Tooling

- Use Bun for package and script commands.
- At the end of every code-editing turn, run `bun run check`; if it reports errors, warnings, test failures, or build failures, run safe autofix first (`bun run fix`) and then manually fix anything that remains before handing work back.
- Use `bun run fix` for safe repo-wide autofix: oxfmt formats supported files, then oxlint applies safe fixes.
- Use `bun run format:check`, `bun run lint`, `bun run lint:typeaware`, `bun run lint:react19`, `bun run typecheck`, `bun run test`, and `bun run build` when debugging a specific quality stage.
- Treat `bun run lint:react19` as the React 19 best-practices pass; it runs the official React Hooks `recommended-latest` rules, including React Compiler diagnostics.
- Use `bun run scan:react` when doing an Aiden Bai / React Scan-style runtime render review; it starts the local dev server with React Scan injected.
- Do not edit `src/routeTree.gen.ts`; TanStack Router owns that generated file and lint/format configs ignore it.

## Convex

This checkout does not currently contain Convex code. If Convex is added later, keep oxlint/oxfmt as the fast default and add official Convex lint rules as a narrow companion ESLint config for the `convex/` tree instead of forcing them through Oxlint JS plugins.
