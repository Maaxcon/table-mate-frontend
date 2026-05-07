# AGENTS.md

## Project
Tablemate — Restaurant Automation System
Frontend: React 18, Vite, TypeScript strict

## Speckit Documents
- Constitution: .speckit/constitution.md
- Specification: .speckit/specify.md
- Plan:          .speckit/plan.md
- Tasks:         .speckit/tasks.md

## Key Rules
- RTK only for state management (no Zustand, no Context)
- Feature-Sliced Design — no cross-feature imports
- Prettier + ESLint (Airbnb) enforced
- Husky blocks unformatted commits
- Conventional Commits required
- No AI features, no predictive models

## Stack
- React 18 + Vite
- TypeScript (strict mode, no any)
- Redux Toolkit + Redux Persist
- @react-oauth/google
- react-konva
- Axios
- React Router v6

## Git Flow
- main   → production, locked
- develop → integration
- feature/* and fix/* → work branches
- All PRs → develop, require 1 approval + CI

## Auth
- Google OAuth only
- Guest mode → /menu read-only only
- ProtectedRoute by role