# Tablemate Frontend Constitution

## Core Principles

### I. Stack And Type Safety
The frontend MUST use React 18 with Vite and TypeScript in strict mode with no implicit any.
No code may use `any`.
All API responses, Redux state, and component props MUST have explicit interfaces in `src/types/`.
Primitive obsession is prohibited; domain types such as `TableId` and `ReservationStatus` MUST be used instead of bare primitives when representing domain concepts.

### II. Architecture Boundaries
The project MUST follow Feature-Sliced Design with domain-driven boundaries.
All business logic lives inside `src/features/{domain}/`.
Pages are route-level thin views only.
Shared atomic UI components live in `src/components/`.
Cross-feature imports are forbidden; features communicate only through the Redux Toolkit store or shared hooks.

### III. State Management Contract
Redux Toolkit is the exclusive state management solution.
All app state must be modeled via RTK slices, including auth, cart, reservations, canvas coordinates, and UI state.
No additional state management libraries are allowed.
Async logic MUST use RTK async actions with explicit `pending`/`fulfilled`/`rejected` handling.

### IV. API And Async Discipline
All server communication MUST be implemented under `src/api/` through Axios instances with interceptors.
Calling `fetch()` directly from components, pages, or features is prohibited.
Errors from async actions must never be swallowed; user-facing failures MUST be surfaced via toast notifications.

### V. Routing And Access Control
Routing MUST be configured in `src/routes/` via React Router.
Protected routes MUST use a `ProtectedRoute` wrapper that reads auth state 
from the RTK store.
Unauthenticated users accessing private routes MUST be redirected to the 
login page.
No route-level auth logic may live in pages or features directly.

### VI. Real-Time Discipline  
WebSocket connection logic MUST live in `src/hooks/` (e.g., `useSocket`).
Features consume socket events only through these shared hooks.
No raw WebSocket or socket.io calls inside components.

### VII. Visual System And Styling Rules
The UI aesthetic is monochromatic and mandatory: `#000000` background, `#FFFFFF` text, and 1px borders.
Styling must use CSS Modules or Styled Components only.
Inline styles are prohibited.
Design tokens are defined in `src/assets/tokens` and must be the source of truth for colors, spacing, and typography.

## Product Scope And Non-Goals

Allowed core workflows are limited to:
- Google OAuth via `@react-oauth/google` integrated with an RTK auth slice.
- Interactive Canvas via `react-konva` integrated with RTK.
- Shared Cart via WebSocket consumers integrated with RTK.

Explicit non-goals:
- No AI features.
- No predictive models.
- No recommendation systems.

## Delivery And Quality Gates

Code quality tooling is mandatory:
- Prettier and ESLint using Airbnb configuration.
- Husky pre-commit hook must format and validate staged files.
- Unformatted code must never reach remote branches.

Git workflow policy:
- `main` is production and locked.
- `develop` is integration.
- Work must happen in `feature/*` and `fix/*` branches.
- All PRs target `develop`, require at least 1 approval, and must pass CI.
- Conventional Commits are required (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`).

## Governance

This constitution is authoritative for Tablemate frontend engineering decisions and supersedes conflicting local conventions.
Every PR review MUST verify compliance with these principles.
Any amendment requires a documented proposal and team approval in a PR to `develop`.
If a rule and implementation conflict, the implementation must be changed or the constitution formally amended before merge.

**Version**: 1.0.0 | **Ratified**: 2026-05-07 | **Last Amended**: 2026-05-07
