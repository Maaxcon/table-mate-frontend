<<<<<<< HEAD
# Feature Specification: Tablemate Frontend MVP

**Feature Branch**: `001-tablemate-frontend-mvp`  
**Created**: 2026-05-07  
**Status**: Draft  
**Input**: User description: "Tablemate restaurant automation frontend MVP with guest/auth/admin/staff flows, RTK-only state, Axios API layer, monochromatic UI, and strict TypeScript contracts."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Landing, Google OAuth, and Guest Entry (Priority: P1)

As a visitor, I can either sign in via Google OAuth or continue as guest from `/`, so I can immediately enter the product in either authenticated mode or read-only mode.

**Why this priority**: This is the entry gate for every other flow and defines access policy for MVP.

**Independent Test**: Can be fully tested by opening `/`, completing OAuth success/error paths, and entering guest mode that limits capabilities.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user on `/`, **When** they click `SIGN IN / REGISTER`, **Then** Google OAuth popup opens, RTK `isLoading` becomes `true`, and success redirects to `/home`.
2. **Given** an OAuth failure, **When** auth callback returns error, **Then** RTK auth error state is updated and a toast is shown.
3. **Given** an unauthenticated user on `/`, **When** they click `Continue as Guest`, **Then** they are redirected to `/menu` with `isGuest = true`.

---

### User Story 2 - Menu Access and Dashboard Navigation (Priority: P1)

As a user, I can browse menu categories and items from `/menu`, while action permissions depend on auth state, and authenticated users can navigate dashboard entry points from `/home`.

**Why this priority**: Menu discovery is core product value for both guest and signed-in users.

**Independent Test**: Can be fully tested by loading categories/items, checking guest restrictions, and validating `/home` entry links for authenticated users.

**Acceptance Scenarios**:

1. **Given** a guest user on `/menu`, **When** dishes are rendered, **Then** `ADD TO ORDER`, reservation, and cart actions are disabled.
2. **Given** an authenticated user on `/menu`, **When** dishes are rendered, **Then** `ADD TO ORDER` action is enabled.
3. **Given** an authenticated user on `/home`, **When** they click dashboard actions, **Then** navigation routes to `/reserve`, `/menu`, and `/reviews`.

---

### User Story 3 - Reservation with Interactive Hall Map (Priority: P1)

As an authenticated user, I can view table availability on an interactive hall map, choose a table, and submit a reservation request.

**Why this priority**: Reservation is a primary revenue flow and must be reliable under contention.

**Independent Test**: Can be fully tested by selecting available tables, sending reservation request, and handling HTTP 409 race-condition conflict.

**Acceptance Scenarios**:

1. **Given** an authenticated user on `/reserve`, **When** available tables are loaded, **Then** available tables are shown in green and taken tables in grey.
2. **Given** a selected available table, **When** user confirms reservation details, **Then** frontend sends `POST /api/reservations/` and on success redirects to `/reservation/success`.
3. **Given** a late conflict where table was reserved by another user, **When** backend returns `409`, **Then** frontend shows toast `"Table was just taken"` and keeps user in reservation flow.

---

### User Story 4 - Shared Cart with Real-Time Sync (Priority: P2)

As an authenticated user, I can view and manage shared cart items with real-time updates from WebSocket events.

**Why this priority**: Shared cart is a collaborative ordering differentiator for table groups.

**Independent Test**: Can be fully tested by creating a cart session, adding/removing items through API, and verifying RTK updates from socket events.

**Acceptance Scenarios**:

1. **Given** an authenticated user on `/cart`, **When** cart session is loaded, **Then** item list, subtotal, and service fee are displayed.
2. **Given** active socket `ws/cart/:session_id/`, **When** events `ITEM_ADDED`, `ITEM_REMOVED`, `USER_JOINED`, or `USER_LEFT` arrive, **Then** cart state updates in RTK without page reload.
3. **Given** temporary network loss, **When** socket disconnects, **Then** `sessionStatus` moves to `disconnected` and user sees non-blocking status feedback.

---

### User Story 5 - Role-Based Operational Views (Priority: P3)

As staff roles, I can access pages relevant to operations while unauthorized roles are blocked.

**Why this priority**: Required for operational readiness but not blocking guest/authenticated consumer MVP.

**Independent Test**: Can be fully tested by simulating role-based auth state and verifying protected route access/denial.

**Acceptance Scenarios**:

1. **Given** user role `ROOT` or `OWNER`, **When** they open `/dashboard`, **Then** access is allowed.
2. **Given** user role `ROOT`, `OWNER`, or `ADMIN`, **When** they open `/editor`, **Then** access is allowed.
3. **Given** user role `WAITER`, **When** they open `/hall`, **Then** access is allowed.
4. **Given** user role `COOK`, **When** they open `/orders`, **Then** access is allowed.
5. **Given** insufficient role, **When** protected route is requested, **Then** user is redirected to an allowed route and receives access feedback.

### Edge Cases
- OAuth popup is closed by user before completion.
- Authenticated session expires while user is on protected route.
- Guest manually opens `/cart`, `/reserve`, `/home`, `/editor`, `/hall`, or `/orders` by URL.
- `/api/editor/tables/available/` response changes between selection and confirmation.
- Duplicate cart events arrive out of order from WebSocket.
- WebSocket reconnects after disconnect and must resync server state.
- Menu categories are empty or endpoint returns partial data.
- Axios interceptor receives `401` while user is in guest mode and should not force sign-out flow.
- Dragging table in editor ends outside valid bounds.
=======
# Feature Specification: TableMate Frontend MVP

**Feature Branch**: `001-tablemate-frontend-mvp`
**Created**: 2026-05-07
**Updated**: 2026-05-11
**Status**: Approved
**Input**: User description: "TableMate restaurant automation frontend MVP with guest/auth/admin/staff flows, real-time updates, and constitution-aligned business behavior."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Landing, Authentication, and Guest Entry (Priority: P1)

As a visitor, I can sign in or continue as guest from `/`, so I can enter the product in authenticated or read-only mode.

**Why this priority**: This is the entry gate for every workflow and enforces access boundaries.

**Independent Test**: Open `/`, complete success/failure auth paths, and verify guest mode restrictions.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on `/`, **When** they choose sign-in, **Then** auth starts and successful backend auth redirects to `/home`.
2. **Given** auth fails, **When** callback returns error, **Then** user sees clear failure feedback and remains unauthorized.
3. **Given** an unauthenticated visitor, **When** they choose guest entry, **Then** they are redirected to `/menu` with read-only restrictions.

---

### User Story 2 - Menu and Role-Aware Navigation (Priority: P1)

As a user, I can browse `/menu`, and UI actions/route visibility follow backend-provided role and permission data.

**Why this priority**: Menu and role navigation are core product value and must be policy-safe.

**Independent Test**: Load menu data and verify route/action visibility for guest and authenticated roles.

**Acceptance Scenarios**:

1. **Given** a guest user on `/menu`, **When** items are rendered, **Then** ordering/reservation/cart mutations are disabled.
2. **Given** an authenticated permitted role, **When** items are rendered, **Then** allowed actions are enabled.
3. **Given** insufficient role, **When** a protected route is requested, **Then** access is denied and user is redirected.

---

### User Story 3 - Reservation with Backend-Authoritative Table State (Priority: P1)

As an authenticated user, I can reserve tables using live availability that is provided by backend state.

**Why this priority**: Reservation is revenue-critical and cannot rely on client-derived table truth.

**Independent Test**: Select available table, submit reservation, and validate conflict handling.

**Acceptance Scenarios**:

1. **Given** user opens `/reserve`, **When** backend provides availability, **Then** frontend renders backend table statuses.
2. **Given** user confirms reservation, **When** backend accepts request, **Then** user is redirected to success screen.
3. **Given** a race conflict, **When** backend returns `409`, **Then** frontend shows conflict feedback and keeps user in reservation flow.

---

### User Story 4 - Shared Cart with Event-Driven Updates (Priority: P2)

As an authenticated user, I can see shared cart changes through event streams and backend-confirmed state.

**Why this priority**: Collaboration accuracy depends on event contract correctness and safe reconciliation.

**Independent Test**: Load cart session, process events, disconnect/reconnect, and confirm resync behavior.

**Acceptance Scenarios**:

1. **Given** an active cart session, **When** cart events arrive, **Then** UI updates without page reload.
2. **Given** unknown event schema version, **When** event is received, **Then** client ignores that event safely and continues.
3. **Given** disconnect and reconnect, **When** connection restores, **Then** frontend re-fetches authoritative session snapshot before enabling mutations.

---

### User Story 5 - Staff Operational Views by Role (Priority: P3)

As staff, I can access only role-appropriate operational surfaces while unauthorized surfaces remain inaccessible.

**Why this priority**: Role leakage causes direct operational risk.

**Independent Test**: Simulate each role and verify allow/deny behavior for all protected views.

**Acceptance Scenarios**:

1. **Given** role `ROOT` or `OWNER`, **When** opening `/dashboard`, **Then** access is allowed.
2. **Given** role `ROOT`, `OWNER`, or `ADMIN`, **When** opening `/editor`, **Then** access is allowed.
3. **Given** role `WAITER`, **When** opening `/hall`, **Then** access is allowed.
4. **Given** role `COOK`, **When** opening `/orders`, **Then** access is allowed.
5. **Given** role without permission, **When** protected surface is requested, **Then** frontend blocks access and redirects.

### Edge Cases

- Auth session expires while user is on protected route.
- Guest directly opens staff/admin URLs.
- Reservation availability changes between selection and confirmation.
- Duplicate or out-of-order events are received.
- Unknown `schema_version` is received on a subscribed stream.
- Reconnect occurs after missed events and requires state replay/recovery.
- A record moves into immutable business state (e.g., settled/completed) while user keeps stale screen open.
>>>>>>> 55d78c2 (chore: add initial specification documents for TableMate Frontend MVP)

## Requirements *(mandatory)*

### Functional Requirements

<<<<<<< HEAD
- **FR-001**: System MUST provide landing page `/` with actions `SIGN IN / REGISTER` and `Continue as Guest`.
- **FR-002**: System MUST authenticate only through Google OAuth (`@react-oauth/google`) and store auth state in RTK `authSlice`.
- **FR-003**: System MUST set `isLoading` during auth request and surface auth failures through RTK error state and toast.
- **FR-004**: System MUST support anonymous guest browsing mode with `isGuest = true` and enforce read-only restrictions on ordering, reservation, and cart actions.
- **FR-005**: System MUST expose protected route wrappers for role-scoped access using backend role matrix: `ROOT`, `OWNER`, `ADMIN`, `WAITER`, `COOK`, `GUEST`.
- **FR-006**: System MUST provide routes: `/`, `/menu`, `/home`, `/reserve`, `/reservation/success`, `/cart`, `/reviews`, `/editor`, `/dashboard`, `/hall`, `/orders`.
- **FR-007**: System MUST use Redux Toolkit exclusively for app state: `authSlice`, `editorSlice`, `reservationSlice`, `menuSlice`, `cartSlice`.
- **FR-008**: System MUST persist auth state in localStorage through Redux Persist.
- **FR-009**: System MUST implement reservation flow with interactive table map and submit reservation via `POST /api/reservations/`.
- **FR-010**: System MUST handle reservation conflict `409` with user-facing toast `"Table was just taken"`.
- **FR-011**: System MUST load menu categories and items from API and support category filtering (`ALL`, `SALADS`, `SIDES`, `DESSERTS`, `DRINKS`).
- **FR-012**: System MUST implement shared cart with REST session APIs and WebSocket sync for `ITEM_ADDED`, `ITEM_REMOVED`, `USER_JOINED`, `USER_LEFT`.
- **FR-013**: Staff hall realtime flow MUST process `TABLE_STATUS_CHANGED` and `NEW_RESERVATION` events from `ws/hall/`.
- **FR-014**: System MUST route all HTTP requests through `src/api/` Axios instances with interceptors.
- **FR-015**: System MUST NOT call `fetch()` directly in pages/components/features.
- **FR-016**: System MUST use monochromatic styling: black background, white text, 1px borders, and tokenized values from `src/assets/tokens`.
- **FR-017**: System MUST use CSS Modules or Styled Components only and MUST NOT use inline styles.
- **FR-018**: System MUST compile under TypeScript strict mode with explicit interfaces in `src/types/` and no `any`.
- **FR-019**: System MUST use domain-level types/enums for IDs and statuses (`Role`, `TableStatus`, `ReservationStatus`, `CanvasMode`, `CartSessionStatus`, etc.).
- **FR-020**: System MUST implement async RTK actions with `pending`/`fulfilled`/`rejected` lifecycle and must never silently swallow errors.
- **FR-021**: System MUST enforce code quality gates: Prettier + ESLint (Airbnb), Husky pre-commit formatting on staged files.
- **FR-022**: System MUST exclude non-goals from MVP: non-Google auth providers, AI features, predictive models, recommendations, payments, offline mode.

### Role Permission Matrix

- **ROOT (Level 1)**: global access including restaurant ownership management and all protected frontend routes.
- **OWNER (Level 2)**: restaurant settings/staff management and management dashboards.
- **ADMIN (Level 3)**: floor-plan editor and table/menu administration.
- **WAITER (Level 4)**: hall map operations, table status workflows, shared cart operations.
- **COOK (Level 5)**: kitchen order board and order state updates.
- **GUEST (Level 6)**: authenticated guest experience (menu, reservation, assigned-table ordering).

### Key Entities *(include if feature involves data)*

- **UserDTO**: Authenticated user profile, includes role and identity data used by route guards and cart participants.
- **Role**: Enum controlling permission boundaries (`ROOT`, `OWNER`, `ADMIN`, `WAITER`, `COOK`, `GUEST`).
- **TableDTO**: Hall table representation with ID, shape, coordinates, and availability status.
- **TableStatus**: Enum for table lifecycle (`Free`, `Occupied`, `Dirty`, `Reserved`).
- **ReservationDTO**: Reservation record linked to user and table with status and time metadata.
- **ReservationStatus**: Enum for reservation lifecycle (`Pending`, `Confirmed`, `Cancelled`, `Completed`).
- **MenuItemDTO**: Menu dish with category linkage, price, and display metadata.
- **CategoryDTO**: Menu category used for filtering and grouping.
- **CartSessionDTO**: Shared cart session metadata with participants and connection state.
- **CartItemDTO**: Item in shared order with quantity and origin metadata.
- **CanvasMode**: Editor mode enum (`view`, `edit`) driving interaction policy.
- **CartSessionStatus**: Enum of socket lifecycle (`idle`, `connected`, `disconnected`).
=======
- **FR-001**: System MUST provide landing entry at `/` with authenticated and guest paths.
- **FR-002**: Frontend MUST treat backend-provided role/permission data as authoritative for route/action visibility.
- **FR-003**: Frontend MUST NOT perform authoritative transitions for `Order`, `OrderItem`, `Session`, `Payment`, `Ticket`, or `Table.status`.
- **FR-004**: Frontend MUST render backend-provided business statuses and permissions; client-side derivation may be used only for transient UI hints.
- **FR-005**: Customer-originated order intake MUST NOT be marked paid/sent-to-kitchen by frontend logic.
- **FR-006**: Reservation flow MUST submit intent to backend and render only backend-confirmed outcomes.
- **FR-007**: Reservation conflict `409` MUST present actionable user feedback and keep user in flow.
- **FR-008**: Frontend MUST support cart/hall real-time consumption via declared event channels.
- **FR-009**: Consumed events MUST include `schema_version`; unknown versions MUST be ignored safely.
- **FR-010**: On reconnect, frontend MUST recover authoritative state before re-enabling business mutations.
- **FR-011**: Role-based UI visibility MUST follow backend-issued role claims and permission results.
- **FR-012**: Unauthorized routes/components MUST NOT be presented as available actions for the current session role.
- **FR-013**: Irreversible frontend-triggered actions (`void`, `cancel reservation`, `close table`) MUST require explicit confirmation that states consequence.
- **FR-014**: Frontend MUST preserve immutable boundaries for settled/completed business records by treating them as read-only in operational views.
- **FR-015**: Any frontend-only mock behavior MUST be explicitly labeled `MVP/demo-only` and MUST NOT simulate authoritative state transitions.

### Role Access Impact *(mandatory)*

- `ROOT`, `OWNER`, `ADMIN`, `WAITER`, `COOK`, `GUEST` permissions are sourced from backend identity and authorization responses.
- Access decisions are deny-by-default for protected routes/actions not explicitly granted.
- Frontend visibility, navigation, and action availability MUST align with backend role outcomes.

### Business State And Lifecycle Impact *(mandatory)*

- Frontend is a consumer of business state, not a business authority.
- Backend remains the single source of truth for order lifecycle, table occupancy, payment state, session boundaries, and ticket lifecycle.
- Frontend sends user intents (mutations) and reflects backend-confirmed transitions.

### Authoritative State Transitions *(mandatory)*

The following transitions are backend-owned only:

- `Order.payment_status`: `unpaid -> paid -> settled`
- `OrderItem.status`: `pending -> in_progress -> ready -> voided/completed`
- `Table.status`: `free/reserved/occupied`
- `Session`: open/close boundaries
- `Ticket`: creation/injection and completion lifecycle

Frontend responsibilities:
- submit user intent;
- display backend-confirmed transition;
- reject/stall local optimistic transition if backend rejects or conflicts.

### Event And Compatibility Contract *(mandatory if live state involved)*

Event channels in MVP scope:
- `ws/cart/:session_id/`: `ITEM_ADDED`, `ITEM_REMOVED`, `USER_JOINED`, `USER_LEFT`
- `ws/hall/`: `TABLE_STATUS_CHANGED`, `NEW_RESERVATION`

Compatibility rules:
- Event payload consumption MUST check `schema_version`.
- Unknown `schema_version` events MUST be ignored safely.
- Existing event contracts are treated as additive; missing optional fields must not crash UI.

#### Replay Semantics (Frontend Perspective)

- If stream recovery supports cursor/offset replay, frontend SHOULD request replay from last acknowledged position.
- If replay endpoint is unavailable in MVP, frontend MUST perform full snapshot re-fetch after reconnect.
- Re-applied events MUST be idempotent from frontend state perspective (no duplicate visible side effects).

### Irreversible Action Safeguards *(mandatory if applicable)*

- `void`, `cancel reservation`, and `close table` require explicit confirmation UI.
- Confirmation UI MUST present consequence context before submit.
- Dismiss/cancel MUST produce zero business side effects.

### Immutable Boundaries *(mandatory)*

Frontend MUST treat the following as read-only once finalized:
- Settled payment records
- Completed/voided order items (except views explicitly allowed by backend policy)
- Closed sessions and their final totals
- Historical operational metrics and reporting snapshots

### Frontend Scope Exceptions *(MVP)*

The following backend-dependent flows are explicitly out of frontend MVP authority:

- Payment webhook verification and payment settlement authority (backend-owned)
- Ticket injection rules and kitchen queue authoritative sequencing (backend-owned)
- Immutable financial/reporting record creation (backend-owned)
- Full historical event replay service (frontend fallback is reconnect + snapshot re-fetch in MVP)

### Key Entities *(include if feature involves data)*

- **UserDTO**: User identity and role claims used for route/action authorization decisions.
- **Role**: Permission boundary enum (`ROOT`, `OWNER`, `ADMIN`, `WAITER`, `COOK`, `GUEST`).
- **TableDTO**: Backend-provided table state projection used for floor/hall rendering.
- **ReservationDTO**: Reservation intent/result object returned by backend.
- **MenuItemDTO / CategoryDTO**: Menu browsing entities for customer/staff surfaces.
- **CartSessionDTO / CartItemDTO**: Shared cart entities synchronized from backend state and events.
>>>>>>> 55d78c2 (chore: add initial specification documents for TableMate Frontend MVP)

## Success Criteria *(mandatory)*

### Measurable Outcomes

<<<<<<< HEAD
- **SC-001**: 95% of users can complete either Google sign-in or guest entry from `/` within 10 seconds in test environment.
- **SC-002**: 100% of protected routes reject unauthorized access and redirect to an allowed route in automated route-guard tests.
- **SC-003**: Reservation flow returns visible success or actionable error feedback for 100% of attempts, including explicit handling for HTTP 409 conflicts.
- **SC-004**: Menu data load and category filtering complete without runtime type errors across strict TypeScript build and lint checks.
- **SC-005**: Shared cart reflects WebSocket events in UI state within 1 second median after event receipt in local integration tests.
- **SC-006**: CI gate passes with zero ESLint errors and zero Prettier formatting diffs on feature branch pull request.

## Assumptions
- Backend endpoints listed in this spec are available and return contract-compatible payloads for frontend DTO mapping.
- `/reviews` is an MVP frontend route and does not require dedicated backend API in this phase.
- MVP targets modern desktop and mobile browsers with stable internet connectivity.
- Anonymous guest mode is session-local and does not require server-side identity.
- Role `GUEST` is a backend-issued role in authenticated JWT context and may have broader capabilities than anonymous guest mode.
- Role assignment is provided by backend identity payload and is trusted for frontend route gating.
- Payment processing is intentionally out of MVP scope and `Place Order` is checkout intent only.
- Design token files under `src/assets/tokens` will be created or expanded as part of implementation.
- WebSocket infrastructure for cart and hall feeds is available at declared paths and supports reconnect semantics.
=======
- **SC-001**: 100% of protected routes enforce backend-aligned role allow/deny behavior in route-guard tests.
- **SC-002**: 100% of authoritative business transitions in UI are traceable to backend responses/events, not local-only commits.
- **SC-003**: Reservation flow provides success or actionable conflict feedback for 100% of attempts.
- **SC-004**: Unknown event versions do not crash active sessions in integration tests.
- **SC-005**: Reconnect flow restores authoritative cart/hall state before enabling write actions.

## Assumptions

- Backend identity, authorization, and domain endpoints are available and contract-compatible.
- Backend emits event payloads with `schema_version` for streams consumed by this frontend.
- Some local demo screens may use seeded mock data before full backend readiness; such behavior is strictly `MVP/demo-only` and non-authoritative.
- Payment/webhook settlement and immutable reporting are backend-owned and intentionally excluded from frontend authority in this MVP.
>>>>>>> 55d78c2 (chore: add initial specification documents for TableMate Frontend MVP)
