# Repository Guidelines

## Rule 1 — Think Before Coding.

No silent assumptions. State what you're assuming. Surface tradeoffs. Ask before guessing. Push back when a simpler approach exists.

## Rule 2 — Simplicity First.

Minimum code that solves the problem. No speculative features. No abstractions for single-use code. If a senior engineer would call it overcomplicated — simplify.

## Rule 3 — Surgical Changes.

Touch only what you must. Don't "improve" adjacent code, comments, or formatting. Don't refactor what isn't broken. Match existing style.

## Rule 4 — Goal-Driven Execution.

Define success criteria. Loop until verified. Don't tell the Agent what steps to follow, tell it what success looks like and let it iterate.

## Project skills

Use `.agents/skills/bia-tdd/SKILL.md` for behavior changes and bug fixes. Use `.agents/skills/bia-quality/SKILL.md` for validation and delivery. Limits live only in `quality.policy.json`. Policy reductions require a dedicated, justified change, separate from functionality and automation.

## Delivery workflow

The owner has authorized delivery without PRs. Use GitButler for local commits and branches, native `git push` for transport, and `gh` for GitHub operations. Push a working branch for CI, then fast-forward `main` to the same SHA only after `quality-gate` passes. Keep required checks, no bypass, no force-push and no deletion on `main`. PRs are optional.
