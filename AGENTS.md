# AGENTS.md

## Mission
Ship frontend features with strict alignment to constitution and active Speckit artifacts.

## Required Context
- Always read active feature docs first:
- `specs/<feature>/spec.md`
- `specs/<feature>/plan.md`
- `specs/<feature>/tasks.md`
- `.specify/memory/constitution.md`
- If no active feature exists, start with `speckit-specify`.

## Workflow (Mandatory)
1. `speckit-specify "<feature description>"`
2. `speckit-plan`
3. `speckit-tasks`
4. `speckit-implement` (or manual implementation from `tasks.md`)

### Codex Command Mapping
- `$speckit-specify`
- `$speckit-plan`
- `$speckit-tasks`
- `$speckit-implement`

## Project Standards
- Stack: React 18, Vite, TypeScript strict mode.
- State: Redux Toolkit only (including auth, cart, reservation, editor/UI state).
- API: Axios-only via `src/api/` with interceptors; no direct `fetch()` in features/components.
- Architecture: Feature-Sliced Design, no cross-feature imports.
- Styling: Monochrome token system, CSS Modules or Styled Components only, no inline styles.
- Quality: ESLint (Airbnb) + Prettier + Husky pre-commit.

## Git Rules
- Base branch: `develop`
- Work branches: `feature/*`, `fix/*`, `chore/*`
- If a matching feature branch already exists, continue there (avoid duplicate branches).
- Conventional Commits required.
- PR target is `develop` with 1+ approval and green CI.

## Commit Scope
- Include when changed:
- `AGENTS.md`
- `.specify/memory/constitution.md`
- `.specify/**`
- `specs/**` for active feature
- implementation code/tests/config updates

## Definition of Done
- Behavior matches `spec.md`.
- `constitution/spec/plan/tasks` are synchronized.
- Lint/format/tests pass.
- PR is review-ready.
