# Git hooks

Committed, dependency-free git hooks for this repository.

## Why not husky / lint-staged?

This repo deliberately keeps `node_modules` out of the root (see `.gitignore`)
and has no root `package.json` — each app (`backend/`, `frontend/`) owns its own
toolchain. Husky and lint-staged both expect a root package and root
`node_modules`, so they would fight that structure. These plain hooks achieve
the same guarantee using each app's existing local `eslint` and `tsc`.

## Setup (once per clone)

Hook paths are a local Git setting and are not committed, so each contributor
enables them once:

```sh
git config core.hooksPath .githooks
```

## What `pre-commit` does

For whichever app has staged changes, it runs that app's `npm run lint` and
`npm run typecheck`. If either fails, the commit is blocked. To bypass in an
emergency, use `git commit --no-verify` (not recommended).
