# Git Hooks

This repo uses Git hooks only for local quality gates. There are no Cursor hooks and no file-locking tools in the loop.

## Tooling

- `husky` installs and runs the Git hooks from `.husky/`.
- `lint-staged` formats and lints staged files only during `pre-commit`.
- `fallow audit --quiet` runs during `pre-push` to catch changed-scope dead code, duplication, and complexity regressions.
- `pnpm run verify` runs the full repo verification flow plus richer Fallow reporting stages for agent-friendly cleanup and refactor follow-up.

## Hook flow

### `pre-commit`

Runs `pnpm exec lint-staged`.

The `lint-staged` config lives in `lint-staged.config.mjs` and uses these globs:

- `*.{js,cjs,mjs,jsx,ts,tsx,cts,mts}`: `pnpm exec oxfmt`, then `pnpm exec oxlint -c ./oxlint.config.mjs --deny-warnings`
- `*.{css,html,json,md,mdx,yaml,yml}`: `pnpm exec oxfmt`

Notes:

- `oxlint` stays strict locally with `--deny-warnings`.
- `lint-staged` re-stages formatter edits automatically.

### `pre-push`

Runs in this order:

1. `pnpm run hooks:fallow:audit`
2. `pnpm run lint:root`
3. `pnpm --filter web lint`
4. `pnpm --filter web test`

Fallow uses its default `new-only` audit gate. The hook resolves a base ref explicitly and passes Fallow a concrete commit SHA, so clones that only have `origin/main` and no local `main` branch still work.

`.fallowrc.json` carries a minimal dependency ignore baseline for the current repo backlog so the hook can focus on newly introduced regressions instead of known unused-package noise.

This keeps push-time feedback focused on the current app surfaces.

## Installation

After pulling hook changes or cloning fresh:

```sh
pnpm install
```

That triggers the root `prepare` script (`husky`) and installs the Git hook shims.

## Direct commands

Run the same checks without making a commit or push:

```sh
pnpm exec lint-staged
pnpm run hooks:prepush
```

`pnpm run hooks:prepush` is the canonical pre-push pipeline and includes the Fallow audit before the lint and test checks.

`pnpm run verify` is the broader repo-wide verification entrypoint. It keeps the fast changed-scope audit and adds:

- `pnpm run fallow:dead-code:web`
- `pnpm run fallow:health:web`
- `pnpm run fallow:dupes:web`

Those extra stages are intentionally in `verify`, not `pre-push`, so pushes stay focused on the fast structural gate while agents still get actionable file-level Fallow output during a fuller validation run.

Useful direct commands:

- `pnpm run fallow:audit`: changed-scope audit with actionable dead-code, complexity, and duplication details
- `pnpm run fallow:dead-code:web`: changed-workspace dead-code scan grouped by package
- `pnpm run fallow:health:web`: web workspace health score, file scores, and large-function reporting
- `pnpm run fallow:dupes:web`: semantic duplication scan for the web workspace
- `pnpm run fallow:fix:preview:web`: dry-run preview of Fallow auto-fixes in the web workspace
- `pnpm run fallow:list:plugins`: inspect the framework plugins Fallow detected in this repo
- `pnpm exec fallow dead-code --format json --quiet --workspace web --include-entry-exports`: occasional entry-export typo check
- `pnpm exec fallow dead-code --format json --quiet --trace <file>:<export>`: prove why an export is live or dead before deleting it

## Troubleshooting

### Hooks do not run

- Run `pnpm install` to ensure Husky has installed the hook shims.
- Check `git config core.hooksPath`. Husky expects `.husky/_`.

### Fallow audit is skipped

The hook intentionally exits successfully in two bootstrap cases:

- `fallow` is not available yet
- no usable base ref could be resolved

To re-enable the audit gate, make sure one of these is true:

- `pnpm exec fallow --version` works
- a global `fallow` binary is installed
- the repo can resolve a comparison base through `origin/HEAD`, `main`, `master`, or `HEAD~1`

### Pre-commit reformats files

That is expected. Review the staged diff, then commit again if needed.

### Fallow audit during pre-commit

Fallow audit was moved to `pre-push` because it creates temporary git worktrees internally, and `git worktree add` fails while `git commit` is holding the repository index (`fatal: .git/index: index file open failed: Not a directory`). Pre-push does not hold the index, so the audit runs correctly there.
