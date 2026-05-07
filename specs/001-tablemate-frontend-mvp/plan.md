# Implementation Plan: Tablemate Frontend MVP

**Branch**: `001-tablemate-frontend-mvp` | **Date**: 2026-05-07 | **Spec**: [Tablemate Frontend MVP Spec](/Users/kurilchukmaks/Desktop/table-mate/table-mate-frontend/specs/001-tablemate-frontend-mvp/spec.md)
**Input**: Feature specification from `/specs/001-tablemate-frontend-mvp/spec.md`

## Summary

Deliver frontend-only MVP for Tablemate with three access modes (Guest, Authenticated User, Admin/Staff), strict role-based route protection, Google OAuth-only auth, reservation hall map, menu browsing, shared real-time cart, admin editor canvas, and staff operational views.

Execution strategy is module-by-module with controlled parallel streams for a 2-3 developer team:
- Week 1: foundation + auth + routing.
- Week 2: reservation + menu + editor.
- Week 3: shared cart + staff views.

## Technical Context

**Language/Version**: TypeScript (strict mode, no implicit any), React 18, Vite  
**Primary Dependencies**: `react-router-dom`, `@reduxjs/toolkit`, `react-redux`, `redux-persist`, `axios`, `@react-oauth/google`, `react-konva`, `konva`  
**Storage**: Browser `localStorage` (Redux Persist for auth/session-related state)  
**Testing**: Vitest + React Testing Library (unit/integration), ESLint, Prettier  
**Target Platform**: Modern desktop/mobile browsers  
**Project Type**: Frontend web application  
**Performance Goals**: Initial route render < 2s locally; cart socket event-to-UI median < 1s  
**Constraints**: Monochrome design tokens (`#000000`, `#FFFFFF`, `1px` borders), no inline styles, RTK-only state, Axios-only HTTP layer  
**Scale/Scope**: MVP routes and modules from spec; no payments, no offline mode, no AI/recommendations

## Constitution Check

*GATE: Must pass before Phase 1+ implementation. Re-check after Phase 0 completion.*

| Gate | Rule | Status | Action to Pass |
|------|------|--------|----------------|
| C1 | React 18 + TS strict + no any | FAIL | Downgrade project from React 19 to React 18 in Phase 0.1 and enforce strict typing in CI/lint checks |
| C2 | FSD boundaries (`src/features/{domain}`), thin pages, no cross-feature imports | FAIL | Create target folder structure in Phase 0.4 and enforce import boundaries via ESLint rules |
| C3 | RTK as exclusive state management | FAIL | Initialize store/slices in Phase 0.5 and mandate all domain state in slices |
| C4 | API calls through `src/api` Axios instances with interceptors only | FAIL | Implement centralized Axios clients/interceptors in Phase 0.9 and ban direct `fetch()` |
| C5 | Monochromatic design system via tokens; CSS Modules/Styled Components only | FAIL | Define global tokens in Phase 0.8 and replace baseline styles accordingly |
| C6 | Quality gates: Prettier + ESLint (Airbnb) + Husky pre-commit | FAIL | Complete Phase 0.2/0.3 and wire checks in CI + pre-commit |
| C7 | Scope boundaries and non-goals | PASS | Keep non-goals explicitly excluded in all phase deliverables |

## Project Structure

### Documentation (this feature)

```text
specs/001-tablemate-frontend-mvp/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── api/
│   ├── axios.ts
│   ├── interceptors.ts
│   ├── auth.api.ts
│   ├── reservation.api.ts
│   ├── menu.api.ts
│   ├── cart.api.ts
│   └── tables.api.ts
├── assets/
│   └── tokens/
├── components/
│   ├── ui/
│   ├── feedback/
│   └── navigation/
├── features/
│   ├── auth/
│   ├── reservation/
│   ├── menu/
│   ├── orders/
│   └── editor/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── store/
│   ├── index.ts
│   └── slices/
├── styles/
├── types/
└── utils/

specs/
└── 001-tablemate-frontend-mvp/
```

**Structure Decision**: Single frontend application in `table-mate-frontend`, organized by domain-centric Feature-Sliced Design. Business logic is isolated inside `src/features/*`, with pages and layouts restricted to orchestration and rendering.

## Phase Plan

### Phase 0 - Project Foundation (Owner: All, Day 1)

Goal: establish production-ready skeleton before feature development.

1. 0.1 Initialize and align stack to React 18 + Vite + TypeScript strict.
2. 0.2 Configure ESLint (Airbnb) + Prettier.
3. 0.3 Install and configure Husky pre-commit hooks.
4. 0.4 Create FSD directory structure.
5. 0.5 Initialize Redux Toolkit store + Redux Persist.
6. 0.6 Set up React Router placeholder routes.
7. 0.7 Define global interfaces and enums under `src/types/`.
8. 0.8 Define global monochrome design tokens under `src/assets/tokens`.
9. 0.9 Configure Axios instance and interceptors in `src/api/`.

Definition of Done:
- App runs on localhost.
- ESLint + Prettier pass with zero errors.
- Husky blocks unformatted staged commits.
- Store initialized and persisted.
- Placeholder routes render for all planned pages.
- Tokens are globally applied.

### Phase 1 - Auth Module (Owner: Developer 1, Blocking)

1. Integrate `@react-oauth/google` provider.
2. Implement `authSlice` (`user`, `isAuthenticated`, `isGuest`, `isLoading`, `error`).
3. Implement Google login button and flow dispatching pending/fulfilled/rejected.
4. Persist auth state in localStorage.
5. Build landing page `/` with OAuth and guest actions.
6. Implement `ProtectedRoute` and `GuestRoute`.
7. Implement loading and error toast UX.

Definition of Done:
- Google popup lifecycle works.
- Auth survives refresh.
- Auth user redirects to `/home`.
- Guest redirects to `/menu` in read-only mode.
- Unauthenticated private access redirects to `/`.

### Phase 2 - Routing and Layouts (Owner: Developer 2, Parallel with Phase 1)

1. Implement full router tree in `src/routes/`.
2. Build `AdminLayout` and `GuestLayout`.
3. Apply route guards by role for auth/admin/waiter/hostess paths.
4. Create placeholder pages for all routes.

Definition of Done:
- Correct layout per route group.
- Role mismatch redirects reliably.
- Guest can access only `/` and `/menu`.

### Phase 3 - Auth + Routing Merge Gate

Prerequisites:
- Phase 1 and Phase 2 both green in CI and reviewed.

Merge gate:
- `feature/auth` + `feature/routing` into `develop`.

### Phase 4 - Reservation Module (Owner: Developer 1, Parallel with Phase 5)

1. Implement `reservationSlice` with required fields.
2. Add API calls: `GET /api/tables/available/`, `POST /api/reservations/`.
3. Build interactive hall map with availability colors.
4. Wire selection and confirmation flow.
5. Handle success redirect to `/reservation/success`.
6. Handle `409` with toast message.
7. Build success page.

Definition of Done:
- Hall map renders correctly.
- Availability/taken statuses are accurate.
- Booking POST succeeds end-to-end.
- Conflict handling is user-visible.
- Success page appears after successful booking.

### Phase 5 - Menu Module (Owner: Developer 2, Parallel with Phase 4)

1. Implement `menuSlice` with categories/items/search.
2. Add API calls: `GET /api/menu/categories/`, `GET /api/menu/items/`.
3. Build category tabs and dish cards.
4. Implement real-time search.
5. Enforce guest/auth behavior for `ADD TO ORDER`.

Definition of Done:
- Category filtering works.
- Search filters in real time.
- Guest can browse but cannot add items.
- Authenticated users can add items.

### Phase 6 - Shared Cart Module (Owners: Developer 1 + Developer 2, Depends on Phase 4 + 5)

1. Implement `cartSlice` (`items`, `participants`, `sessionStatus`).
2. Add REST cart session APIs.
3. Build socket hook for `ws/cart/:session_id/` events.
4. Implement optimistic UI with rollback on failure.
5. Build `/cart` UI with totals and place-order CTA.
6. Render real-time participant list.

Definition of Done:
- Socket connects on cart load.
- Items sync in real time for participants.
- Optimistic updates revert correctly on server error.
- Totals are correct.
- Session survives refresh.

### Phase 7 - Admin Canvas Editor (Owner: Developer 3, or Developer 1 after Phase 4)

1. Implement `editorSlice` (`tables`, `selectedTableId`, `canvasMode`).
2. Add API calls: `GET /api/tables/`, `PATCH /api/tables/:id/position/`.
3. Build `react-konva` canvas for table editing.
4. Implement drag-and-drop with snapping.
5. Persist coordinates on drag end.
6. Implement mode toggle and table property panel.

Definition of Done:
- Canvas renders all tables.
- Drag/drop and snapping are stable.
- Position persists to backend.
- View/edit mode toggles correctly.

### Phase 8 - Staff Views (Owner: Developer 3, or Developer 2 after Phase 5)

1. Build `/hall` live map with `ws/hall/` updates.
2. Build `/orders` kitchen kanban with `New`, `In Progress`, `Ready` columns.
3. Map socket events to RTK updates.

Definition of Done:
- Hall map updates without reload.
- Kanban renders and updates correctly.
- Status changes are reflected in real time.

## Parallelization Strategy

### Week 1

1. Developer 1: Phase 1 (Auth).
2. Developer 2: Phase 2 (Routing).
3. Developer 3: Phase 0 support tasks (types, tokens, lint/husky hardening).

### Week 2

1. Developer 1: Phase 4 (Reservation).
2. Developer 2: Phase 5 (Menu).
3. Developer 3: Phase 7 (Editor).

### Week 3

1. Developer 1 + Developer 2: Phase 6 (Cart).
2. Developer 3: Phase 8 (Staff Views).

## Branching and Review Policy

1. Each phase uses dedicated branch stream: `feature/auth`, `feature/routing`, `feature/reservation`, `feature/menu`, `feature/cart`, `feature/editor`, `feature/staff-views`.
2. All pull requests target `develop`.
3. Merge requires at least 1 approval and passing CI.
4. Commit format is Conventional Commits only.

## Non-Goals Enforcement

This implementation plan explicitly excludes:
- AI features.
- Predictive models.
- Payment integration.
- Recommendation systems.
- Offline mode.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None at planning stage | N/A | N/A |
