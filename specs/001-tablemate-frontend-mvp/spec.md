# Feature Specification: TableMate Frontend MVP

**Feature Branch**: `001-tablemate-frontend-mvp`
**Created**: 2026-05-07
**Updated**: 2026-05-11
**Status**: Approved
**Input**: User description: "TableMate restaurant automation frontend MVP with guest/auth/staff flows, real-time updates, and constitution-aligned business behavior."

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

**Independent Test**: Load menu data and verify route/action visibility for guest and authenticated staff roles.

**Acceptance Scenarios**:

1. **Given** an anonymous guest user on `/menu`, **When** items are rendered, **Then** ordering/reservation/cart mutations are disabled.
2. **Given** an authenticated permitted staff role, **When** items are rendered, **Then** allowed actions are enabled.
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

**Independent Test**: Simulate each staff role and verify allow/deny behavior for all protected views.

**Acceptance Scenarios**:

1. **Given** role `admin`, **When** opening admin-level staff/admin surfaces, **Then** access is allowed.
2. **Given** role `manager`, **When** opening manager-allowed operational surfaces, **Then** access is allowed and admin-only surfaces are blocked.
3. **Given** role `waiter`, **When** opening `/hall`, **Then** access is allowed.
4. **Given** role `cook`, **When** opening `/orders`, **Then** access is allowed.
5. **Given** role without permission, **When** protected surface is requested, **Then** frontend blocks access and redirects.

### Edge Cases

- Auth session expires while user is on protected route.
- Anonymous guest directly opens staff URLs.
- Reservation availability changes between selection and confirmation.
- Duplicate or out-of-order events are received.
- Unknown `schema_version` is received on a subscribed stream.
- Reconnect occurs after missed events and requires state replay/recovery.
- A record moves into immutable business state (e.g., settled/completed) while user keeps stale screen open.

## Requirements *(mandatory)*

### Functional Requirements

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

- Backend canonical staff roles are: `admin`, `manager`, `waiter`, `cook`.
- Access decisions are deny-by-default for protected routes/actions not explicitly granted.
- Anonymous guest mode is a frontend read-only access mode and is not a backend staff role.
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
- `ws/cart/:session_id/`: `CART_ITEM_ADDED`, `CART_ITEM_REMOVED`, `CART_PARTICIPANT_JOINED`, `CART_PARTICIPANT_LEFT`
- `ws/hall/`: `HALL_TABLE_STATUS_CHANGED`, `HALL_NEW_RESERVATION`

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
- **Role**: Staff role enum (`admin`, `manager`, `waiter`, `cook`).
- **TableDTO**: Backend-provided table state projection used for floor/hall rendering.
- **ReservationDTO**: Reservation intent/result object returned by backend.
- **MenuItemDTO / CategoryDTO**: Menu browsing entities for customer/staff surfaces.
- **CartSessionDTO / CartItemDTO**: Shared cart entities synchronized from backend state and events.

## Success Criteria *(mandatory)*

### Measurable Outcomes

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
