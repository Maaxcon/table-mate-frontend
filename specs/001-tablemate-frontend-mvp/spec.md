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
2. **Given** active socket `ws/cart/:session_id/`, **When** events `ITEM_ADDED`, `ITEM_REMOVED`, or `USER_JOINED` arrive, **Then** cart state updates in RTK without page reload.
3. **Given** temporary network loss, **When** socket disconnects, **Then** `sessionStatus` moves to `disconnected` and user sees non-blocking status feedback.

---

### User Story 5 - Role-Based Operational Views (Priority: P3)

As staff roles, I can access pages relevant to operations while unauthorized roles are blocked.

**Why this priority**: Required for operational readiness but not blocking guest/authenticated consumer MVP.

**Independent Test**: Can be fully tested by simulating role-based auth state and verifying protected route access/denial.

**Acceptance Scenarios**:

1. **Given** user role `Admin`, **When** they open `/editor` or `/dashboard`, **Then** access is allowed.
2. **Given** user role `Waiter` or `Hostess`, **When** they open `/hall` or `/orders`, **Then** access is allowed.
3. **Given** insufficient role, **When** protected route is requested, **Then** user is redirected to an allowed route and receives access feedback.

### Edge Cases
- OAuth popup is closed by user before completion.
- Authenticated session expires while user is on protected route.
- Guest manually opens `/cart`, `/reserve`, `/home`, `/editor`, `/hall`, or `/orders` by URL.
- `/api/tables/available/` response changes between selection and confirmation.
- Duplicate cart events arrive out of order from WebSocket.
- WebSocket reconnects after disconnect and must resync server state.
- Menu categories are empty or endpoint returns partial data.
- Axios interceptor receives `401` while user is in guest mode and should not force sign-out flow.
- Dragging table in editor ends outside valid bounds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide landing page `/` with actions `SIGN IN / REGISTER` and `Continue as Guest`.
- **FR-002**: System MUST authenticate only through Google OAuth (`@react-oauth/google`) and store auth state in RTK `authSlice`.
- **FR-003**: System MUST set `isLoading` during auth request and surface auth failures through RTK error state and toast.
- **FR-004**: System MUST support guest browsing mode with `isGuest = true` and enforce read-only restrictions on ordering, reservation, and cart actions.
- **FR-005**: System MUST expose protected route wrappers for authenticated and role-scoped access (`Admin`, `Waiter`, `Hostess`).
- **FR-006**: System MUST provide routes: `/`, `/menu`, `/home`, `/reserve`, `/reservation/success`, `/cart`, `/reviews`, `/editor`, `/dashboard`, `/hall`, `/orders`.
- **FR-007**: System MUST use Redux Toolkit exclusively for app state: `authSlice`, `editorSlice`, `reservationSlice`, `menuSlice`, `cartSlice`.
- **FR-008**: System MUST persist auth state in localStorage through Redux Persist.
- **FR-009**: System MUST implement reservation flow with interactive table map and submit reservation via `POST /api/reservations/`.
- **FR-010**: System MUST handle reservation conflict `409` with user-facing toast `"Table was just taken"`.
- **FR-011**: System MUST load menu categories and items from API and support category filtering (`ALL`, `SALADS`, `SIDES`, `DESSERTS`, `DRINKS`).
- **FR-012**: System MUST implement shared cart with REST session APIs and WebSocket sync for `ITEM_ADDED`, `ITEM_REMOVED`, `USER_JOINED`.
- **FR-013**: System MUST route all HTTP requests through `src/api/` Axios instances with interceptors.
- **FR-014**: System MUST NOT call `fetch()` directly in pages/components/features.
- **FR-015**: System MUST use monochromatic styling: black background, white text, 1px borders, and tokenized values from `src/assets/tokens`.
- **FR-016**: System MUST use CSS Modules or Styled Components only and MUST NOT use inline styles.
- **FR-017**: System MUST compile under TypeScript strict mode with explicit interfaces in `src/types/` and no `any`.
- **FR-018**: System MUST use domain-level types/enums for IDs and statuses (`Role`, `TableStatus`, `ReservationStatus`, `CanvasMode`, `CartSessionStatus`, etc.).
- **FR-019**: System MUST implement async RTK actions with `pending`/`fulfilled`/`rejected` lifecycle and must never silently swallow errors.
- **FR-020**: System MUST enforce code quality gates: Prettier + ESLint (Airbnb), Husky pre-commit formatting on staged files.
- **FR-021**: System MUST exclude non-goals from MVP: non-Google auth providers, AI features, predictive models, recommendations, payments, offline mode.

### Key Entities *(include if feature involves data)*

- **UserDTO**: Authenticated user profile, includes role and identity data used by route guards and cart participants.
- **Role**: Enum controlling permission boundaries (`Guest`, `AuthUser`, `Admin`, `Waiter`, `Hostess`).
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

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of users can complete either Google sign-in or guest entry from `/` within 10 seconds in test environment.
- **SC-002**: 100% of protected routes reject unauthorized access and redirect to an allowed route in automated route-guard tests.
- **SC-003**: Reservation flow returns visible success or actionable error feedback for 100% of attempts, including explicit handling for HTTP 409 conflicts.
- **SC-004**: Menu data load and category filtering complete without runtime type errors across strict TypeScript build and lint checks.
- **SC-005**: Shared cart reflects WebSocket events in UI state within 1 second median after event receipt in local integration tests.
- **SC-006**: CI gate passes with zero ESLint errors and zero Prettier formatting diffs on feature branch pull request.

## Assumptions
- Backend endpoints listed in this spec are available and return contract-compatible payloads for frontend DTO mapping.
- MVP targets modern desktop and mobile browsers with stable internet connectivity.
- Guest mode is intentionally session-local and does not require server-side identity.
- Role assignment is provided by backend identity payload and is trusted for frontend route gating.
- Payment processing is intentionally out of MVP scope and `Place Order` is checkout intent only.
- Design token files under `src/assets/tokens` will be created or expanded as part of implementation.
- WebSocket infrastructure for cart and hall feeds is available at declared paths and supports reconnect semantics.
