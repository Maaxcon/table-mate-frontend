# Tasks: TableMate Frontend MVP

**Input**: Design documents from `/specs/001-tablemate-frontend-mvp/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/frontend-backend-boundary.md`, `quickstart.md`
**Tests**: Add focused validation tasks for constitution-critical behavior and user-story independent checks.
**Organization**: Tasks are grouped by user story so each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- `[P]` means the task can run in parallel (different files, no unresolved dependency).
- `[Story]` label appears only in user story phases (`[US1]` ... `[US5]`).
- Every task includes explicit file path(s).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare frontend structure and shared policy-aware scaffolding.

- [ ] T001 Create/update base app structure and route shells in `src/pages/`, `src/routes/`, and `src/layouts/`.
- [ ] T002 [P] Define canonical frontend projection types in `src/types/domain.ts` using `specs/001-tablemate-frontend-mvp/data-model.md`.
- [ ] T003 [P] Define event envelope and versioned payload types in `src/types/events.ts`.
- [ ] T004 Create central API clients and auth interceptors in `src/api/client.ts` and `src/api/interceptors.ts`.
- [ ] T005 [P] Add MVP/demo marker config in `src/config/mvp.ts` and UI helper in `src/components/feedback/MvpOnlyBadge.tsx`.
- [ ] T006 Create policy docs index for developers in `docs/frontend-boundaries.md` referencing `AGENTS.md` and `specs/001-tablemate-frontend-mvp/contracts/frontend-backend-boundary.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement constitution-critical guardrails before story work.

- [ ] T007 Implement backend-authoritative role/permission selectors in `src/features/auth/selectors/permissions.ts` using only staff roles `admin/manager/waiter/cook`.
- [ ] T008 Implement protected route guards using backend claims in `src/routes/ProtectedRoute.tsx` and `src/routes/RoleGate.tsx`.
- [ ] T009 Implement immutable-record guard utilities in `src/features/shared/model/immutability.ts`.
- [ ] T010 Implement authoritative-status rendering adapters in `src/features/shared/model/statusAdapters.ts`.
- [ ] T011 Implement event `schema_version` validation and safe-ignore handling in `src/hooks/useSocket.ts`.
- [ ] T012 Implement duplicate-event protection (idempotent apply by event id/version) in `src/features/orders/cartEventsReducer.ts` and `src/features/restaurants/hallEventsReducer.ts`.
- [ ] T013 Implement reconnect recovery with snapshot re-fetch in `src/hooks/useSocket.ts` and `src/features/orders/cartSlice.ts`.
- [ ] T014 Add foundational validation tests for role authority and non-authoritative transitions in `src/routes/__tests__/RoleGate.test.tsx` and `src/features/shared/__tests__/authority-boundary.test.ts`.

**Checkpoint**: No user story starts until backend-authority, role-gating, event safety, and immutable guards are in place.

---

## Phase 3: User Story 1 - Landing, Authentication, and Guest Entry (Priority: P1) 🎯 MVP

**Goal**: Deliver secure entry flows with backend-authoritative auth outcomes and guest restrictions.

**Independent Test**: User can authenticate or continue as guest; unauthorized access is denied by backend-role-aware guards.

- [ ] T015 [P] [US1] Implement landing screen and entry actions in `src/pages/LandingPage.tsx`.
- [ ] T016 [US1] Implement auth slice and backend-auth result handling in `src/features/auth/authSlice.ts`.
- [ ] T017 [US1] Implement OAuth command flow and failure UI in `src/features/auth/GoogleLoginButton.tsx`.
- [ ] T018 [US1] Implement guest mode read-only capability flags in `src/features/auth/model/guestMode.ts`.
- [ ] T019 [US1] Enforce route redirects for unauthenticated/unauthorized users in `src/routes/index.tsx`.
- [ ] T020 [US1] Mark any seeded auth/demo behavior as MVP-only in `src/pages/LandingPage.tsx` and `src/components/feedback/MvpOnlyBadge.tsx`.
- [ ] T021 [US1] Add independent tests for auth success/failure/guest entry in `src/features/auth/__tests__/entry-flow.test.tsx`.

**Checkpoint**: US1 works independently and respects backend authority boundaries.

---

## Phase 4: User Story 2 - Menu and Role-Aware Navigation (Priority: P1)

**Goal**: Render menu/navigation by backend-provided permissions and keep restricted actions non-authoritative.

**Independent Test**: Guest and role-based users see allowed UI only; restricted actions remain disabled/hidden.

- [ ] T022 [P] [US2] Implement menu data fetch and projection in `src/features/menu/menuSlice.ts` and `src/api/menu.ts`.
- [ ] T023 [US2] Implement role-aware action visibility in `src/features/menu/DishCard.tsx` and `src/features/menu/CategoryTabs.tsx`.
- [ ] T024 [US2] Implement navigation visibility by backend permissions in `src/components/navigation/AppNav.tsx`.
- [ ] T025 [US2] Ensure no local authoritative order/session/payment transition logic in `src/features/menu/menuCommands.ts`.
- [ ] T026 [US2] Label any mock menu items/flags as MVP-only in `src/features/menu/MenuPage.tsx`.
- [ ] T027 [US2] Add independent permission-visibility tests in `src/features/menu/__tests__/menu-permissions.test.tsx`.

**Checkpoint**: US2 works independently with policy-safe visibility and actions.

---

## Phase 5: User Story 3 - Reservation with Backend-Authoritative Table State (Priority: P1)

**Goal**: Reservation flow uses backend statuses and backend-confirmed outcomes only.

**Independent Test**: User can reserve from backend availability; conflict handling is correct; no client-side table truth.

- [ ] T028 [P] [US3] Implement reservation API commands and typed responses in `src/api/reservation.ts`.
- [ ] T029 [US3] Implement reservation state slice with backend-confirmed transitions in `src/features/reservation/reservationSlice.ts`.
- [ ] T030 [US3] Render table states only from backend payload in `src/features/reservation/HallMap.tsx`.
- [ ] T031 [US3] Implement conflict and validation UX (`409`, validation errors) in `src/features/reservation/ReservationConfirm.tsx`.
- [ ] T032 [US3] Enforce non-authoritative transitions for table/session states in `src/features/reservation/model/authorityGuard.ts`.
- [ ] T033 [US3] Add independent reservation flow tests in `src/features/reservation/__tests__/reservation-flow.test.tsx`.

**Checkpoint**: US3 works independently with backend-authoritative table and reservation states.

---

## Phase 6: User Story 4 - Shared Cart with Event-Driven Updates (Priority: P2)

**Goal**: Event-consistent cart/hall updates with version safety, deduplication, and reconnect recovery.

**Independent Test**: Event stream updates UI safely; unknown versions are ignored; reconnect restores authoritative state.

- [ ] T034 [P] [US4] Implement cart session APIs and snapshot fetch in `src/api/cart.ts`.
- [ ] T035 [US4] Implement cart event consumer with `schema_version` handling in `src/hooks/useSocket.ts`.
- [ ] T036 [US4] Implement safe-ignore path for unsupported event versions in `src/hooks/useSocket.ts` and `src/features/orders/cartSlice.ts`.
- [ ] T037 [US4] Implement duplicate event suppression in `src/features/orders/cartEventsReducer.ts`.
- [ ] T038 [US4] Implement replay/refresh rebuild via snapshot reconciliation in `src/features/orders/cartSlice.ts`.
- [ ] T039 [US4] Implement reconnect re-sync gate before mutating actions in `src/pages/CartPage.tsx`.
- [ ] T040 [US4] Ensure payment state shown in cart is backend-verified display-only in `src/features/orders/PaymentStatusBadge.tsx`.
- [ ] T041 [US4] Add independent event compatibility tests in `src/features/orders/__tests__/cart-events.test.ts`.

**Checkpoint**: US4 works independently with robust event compatibility and recovery behavior.

---

## Phase 7: User Story 5 - Staff Operational Views by Role (Priority: P3)

**Goal**: Staff surfaces enforce backend role permissions and immutable/read-only boundaries.

**Independent Test**: Each staff role sees only allowed surfaces; immutable finalized records are read-only.

- [ ] T042 [P] [US5] Implement staff route gating matrix in `src/routes/index.tsx` and `src/routes/RoleGate.tsx` for `admin/manager/waiter/cook`.
- [ ] T043 [US5] Implement hall and orders views with backend-provided statuses in `src/features/restaurants/HallStatus.tsx` and `src/features/orders/KanbanBoard.tsx`.
- [ ] T044 [US5] Implement read-only rendering for settled/completed/closed records in `src/features/orders/OrderDetailsPanel.tsx` and `src/features/restaurants/SessionSummary.tsx`.
- [ ] T045 [US5] Implement irreversible-action confirmation flows in `src/components/feedback/ConfirmDestructiveActionModal.tsx`.
- [ ] T046 [US5] Ensure ticket/session/payment status components are backend-data display only in `src/features/orders/TicketStatusColumn.tsx` and `src/features/orders/PaymentStatusBadge.tsx`.
- [ ] T047 [US5] Mark any demo-only staff widgets as MVP-only in `src/features/orders/KanbanBoard.tsx`.
- [ ] T048 [US5] Add independent staff-role access tests in `src/routes/__tests__/staff-access-matrix.test.tsx`.

**Checkpoint**: US5 works independently with role safety and immutable UI boundaries.

---

## Phase 8: Polish & Cross-Cutting Consistency

**Purpose**: Final synchronization of constitution/spec/plan/tasks and enforcement checks.

- [ ] T049 Document explicit frontend payment/webhook/replay/reporting scope exceptions in `specs/001-tablemate-frontend-mvp/contracts/frontend-backend-boundary.md`.
- [ ] T050 Verify no task introduces frontend authoritative business transitions in `specs/001-tablemate-frontend-mvp/tasks.md`.
- [ ] T051 Run Speckit Analyze and capture results in `specs/001-tablemate-frontend-mvp/checklists/analyze.md`.
- [ ] T052 Verify no mismatch across `.specify/memory/constitution.md`, `specs/001-tablemate-frontend-mvp/spec.md`, `specs/001-tablemate-frontend-mvp/plan.md`, and `specs/001-tablemate-frontend-mvp/tasks.md`.
- [ ] T053 Verify technical standards are referenced from `AGENTS.md` or engineering docs, not duplicated as constitution business rules, in `specs/001-tablemate-frontend-mvp/plan.md` and `docs/frontend-boundaries.md`.
- [ ] T054 [P] Run lint/build and fix blockers in `package.json` scripts and impacted `src/**` files.
- [ ] T055 [P] Update quick validation steps in `specs/001-tablemate-frontend-mvp/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): can start immediately.
- Phase 2 (Foundational): depends on Phase 1 and blocks all user-story phases.
- Phase 3-5 (US1, US2, US3): start after Phase 2; US2 and US3 can run in parallel after US1 route/auth primitives are stable.
- Phase 6 (US4): depends on foundational event stack and APIs from prior phases.
- Phase 7 (US5): depends on role gating and status adapters from prior phases.
- Phase 8 (Polish): runs after target user stories complete.

### User Story Dependencies

- US1: independent after foundational phase.
- US2: depends on US1 auth/role primitives.
- US3: depends on US1 auth/role primitives.
- US4: depends on event infrastructure and cart APIs (Phases 2 + 3/4 where needed).
- US5: depends on role gates + status rendering adapters from foundational phase.

### Within Each User Story

- Implement model/state boundary first.
- Implement UI and command handling next.
- Add independent verification tests last in the story phase.

---

## Notes

- All tasks follow strict checklist format with IDs and explicit file paths.
- Constitution/business alignment is enforced as implementation work, not as post-hoc documentation.
