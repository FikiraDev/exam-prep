# Husky + lint-staged + Fallow Plan

## Objective

Ship features quickly while keeping local quality gates strict and fast using Git hooks only.

## Constraints

- No Cursor hooks.
- No locking tools.
- Use Husky-based Git hooks.

## Stack Decision

- **Husky** as hook runner.
- **lint-staged** for staged-file format/lint checks.
- **Fallow** for graph-level changed-scope audit in pre-commit.

## Why this combination

- `lint-staged` catches file-level issues quickly (formatting/linting on staged files only).
- `fallow audit` catches repository-level regressions (dead code, duplication, complexity) that file-level linters miss.
- Default Fallow gate mode (`new-only`) avoids blocking on inherited backlog while blocking newly introduced issues.

## Implementation plan

1. **Pre-commit hook**
   - Run `lint-staged` first.
   - Run `fallow audit --quiet` second (through Husky pre-commit flow).
   - Keep strict local lint warning policy (`--deny-warnings`) for lint commands.

2. **Fallow hook install**
   - Install using Fallow’s Git hook integration in Husky context.
   - Ensure fallback behavior remains safe for machines where Fallow is not installed yet.

3. **Pre-push hook**
   - Run fixed-scope checks for `web` + `convex`.
   - Keep pre-push bounded and faster than full CI.

4. **Documentation**
   - Document exact hook commands, globs, policies, and troubleshooting in `docs/agents/hooks.md`.
   - Add a short pointer in `AGENTS.md` to `docs/agents/hooks.md`.

5. **Rollout policy**
   - Start with Fallow audit default gate (`new-only`).
   - Optionally tighten to strict (`all`) after backlog cleanup.
   - Use severity hardening (`warn` -> `error`) and/or baselines for gradual adoption.

## Success criteria

- Git hooks only (no Cursor/locking dependency).
- Staged files are formatted/linted before commit.
- New dead-code/duplication/complexity regressions are blocked at commit time.
- Pre-commit remains fast for small diffs.
- Hook documentation is clear and discoverable.

## Research sources

- [Fallow docs](https://docs.fallow.tools/)
- [Fallow docs index](https://docs.fallow.tools/llms.txt)
- [Fallow init / hooks](https://docs.fallow.tools/cli/init)
- [Fallow audit](https://docs.fallow.tools/cli/audit)
- [Fallow CI integration](https://docs.fallow.tools/integrations/ci)
- [Fallow vs linters](https://docs.fallow.tools/explanations/fallow-vs-linters)
- [Fallow repository](https://github.com/fallow-rs/fallow)
- [Husky get started](https://typicode.github.io/husky/get-started.html)
- [lint-staged README](https://github.com/lint-staged/lint-staged/blob/main/README.md)
