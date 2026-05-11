<!--
Sync Impact Report
- Version change: 1.0.0 -> 2.0.0
- Modified principles:
  - I. Stack And Type Safety -> Principle One: Role Determines Everything
  - II. Architecture Boundaries -> Principle Two: The Floor Plan Is A Live Document, Not A Cached Image
  - III. State Management Contract -> Principle Three: Notifications Are A Stream, Not A Badge Count
  - IV. API And Async Discipline -> Principle Four: Status Colors Are A Design System Primitive, Not A Component Decision
  - V. Routing And Access Control -> Principle Five: The Modifier Modal Is The Most Critical Input Surface
  - VI. Real-Time Discipline -> Principle Six: Offline Is An Error State, Not A Degraded Mode
  - VII. Visual System And Styling Rules -> Principle Seven: The Spatial Editor Is A Separate Environment, Not A Modal
- Added sections:
  - Foundation (Shared by Frontend & Backend)
  - Shared Data Contracts
  - Role Access Matrix
  - Real-Time Architecture
  - Payment Contract
  - Void Contract
  - Cycle Time Metric
  - Principle Eight: Every Destructive Action Has A Confirmation Layer
  - Principle Nine: Performance Budget Is Tied To The Floor Plan Render
  - Principle Ten: Theme Support Is A First-Class Requirement
  - Engineering Standards And Delivery
- Removed sections:
  - Product Scope And Non-Goals (replaced by explicit platform contracts and role-governed scope)
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
  - ⚠ pending: .specify/templates/commands/*.md (directory not present in this repository)
  - ✅ README.md
- Follow-up TODOs:
  - None
-->

# TableMate Platform Constitution

## Foundation (Shared by Frontend & Backend)

### Core Philosophy
TableMate is a real-time, multi-role restaurant operations platform.
Every architecture and design decision MUST enforce one operating rule:
the right information reaches the right role at the right moment,
with zero ambiguity and zero delay.

Cook, Waiter, Admin, and Customer surfaces carry different stakes.
Latency and inconsistency are functional defects, not visual defects.

### Shared Data Contracts
The canonical entities below are the single source of truth for all clients.
No role-specific frontend or backend implementation MAY invent local variants.

- `Restaurant` MUST include `id`, `name`, `working_hours`, `active_floor_plan_ref`, and `qr_codes` mapped to `table_id`.
- `Table` MUST include `id`, `sector`, `capacity`, and backend-computed `status` in `{free, reserved, occupied}`.
- `Order` MUST include `id`, `table_ref`, `session_ref`, `origin` in `{waiter_manual, customer_prepaid}`, `payment_status` in `{unpaid, paid, settled}`, and `order_items[]`.
- `OrderItem` MUST include `id`, `menu_item_ref`, `quantity`, `modifier_text`, `guest_slot_index`, and `status` in `{pending, in_progress, ready, voided, completed}`.
- `Ticket` MUST be a kitchen-scoped projection of `Order` and MUST be created only by backend queue injection.
- `Session` MUST represent one table occupancy window and MUST be the boundary for cycle time, void count, and revenue computation.
- `Staff` MUST include `id`, `name`, `email`, `role` in `{cook, waiter, manager, owner}`, and `shift_status` in `{online, offline}`.

`Table.status` MUST be backend-computed and pushed to clients.
Clients MUST render the pushed status and MUST NOT derive it from stale local order state.

### Role Access Matrix
Role access MUST be enforced server-side on every request and mirrored structurally in frontend routing and mounts.
Inaccessible routes/components MUST NOT mount in the render tree.

- `Cook` MAY access only Kitchen Kanban.
- `Waiter` MAY access floor plan, order creation, notification stream, and table detail overlays.
- `Manager` inherits Waiter access and MAY additionally approve voids and apply discounts.
- `Owner` has full access including financial reports, spatial editor, staff management, and menu control.

Cook MUST NOT access floor plan, order creation, or financial screens.
Waiter and Manager MUST NOT access unauthorized financial/editor/staff surfaces.

### Real-Time Architecture
All live state MUST be delivered via WebSocket.
REST endpoints MUST be used for creation and mutation only.
Polling for live updates is prohibited.

Each authenticated session MUST maintain exactly one WebSocket connection.
Event fan-out MUST be role-targeted.

Events MUST be typed and versioned with explicit `schema_version`.
Clients MUST ignore unknown versions safely.
Backends MUST preserve existing fields for published event types and MAY add only optional fields.

### Payment Contract
Customer-originated order confirmation MUST occur only after successful online payment webhook processing.
Client-side payment state transitions are prohibited.

Supported payment methods are Apple Pay, Google Pay, and card.
Frontend MAY render payment sheets, but backend MUST validate webhook signatures and perform all authoritative state transitions (`unpaid -> paid`) and kitchen ticket injection.

### Void Contract
Void execution MUST be an atomic backend transaction.
The following operations MUST succeed together or all rollback:

1. `OrderItem.status` transitions to `voided`.
2. Kitchen KDS VOID event emits.
3. Session running total decrements.
4. Corrected receipt queues.

Void initiation MUST include:
- `reason_code` in `{mispick, guest_changed_mind, quality_issue, out_of_stock}`.
- `is_wasted` boolean indicating inventory return behavior.

### Cycle Time Metric
Each ticket MUST record:
- `injection_timestamp` (entry to kitchen queue)
- `bump_timestamp` (cook taps BUMP)

Cycle time MUST be computed as `bump_timestamp - injection_timestamp`.
Average Prep Time MUST be backend-aggregated per shift and per day and surfaced on Admin dashboards.

## Core Principles

### Principle One: Role Determines Everything
The frontend MUST operate as four distinct role experiences in one codebase.
Role assignment MUST determine mounted navigation, routes, screens, and event handlers.
Components unauthorized for the active role MUST NOT exist in the render tree.

Rationale: structural isolation prevents accidental access and reduces cognitive load per role.

### Principle Two: The Floor Plan Is A Live Document, Not A Cached Image
Waiter and Admin floor plan surfaces MUST reflect backend state within a single WebSocket frame.
Floor plan state MUST subscribe directly to websocket patches.
Client-side inference of table status from local order data is prohibited.

Rationale: stale occupancy is an operational incident, not a cosmetic lag.

### Principle Three: Notifications Are A Stream, Not A Badge Count
Waiter/Admin notification UI MUST remain mounted persistently and render two channels:
Client Stream and Kitchen Stream.
Each inbound event MUST render as an individual, ordered stream item immediately.
Notification tap MUST navigate directly to the relevant table context.

Rationale: immediate event visibility is required for service timing.

### Principle Four: Status Colors Are A Design System Primitive, Not A Component Decision
Order item lifecycle statuses and table statuses MUST map to semantic design tokens.
Components MUST reference semantic tokens and MUST NOT hardcode status color values.

Required lifecycle token mapping:
- Pending -> gray token
- In Progress -> amber/yellow token
- Ready -> green token

Rationale: centralized semantics prevent visual drift and reduce regression risk.

### Principle Five: The Modifier Modal Is The Most Critical Input Surface
When a Waiter adds an item, modifier entry MUST be one tap from any menu item.
Modal focus MUST default to comment input on open.
Guest slot controls MUST be large-touch targets suitable for tablet operation.
Confirm action MUST remain disabled until a guest slot is selected.

Rationale: modifier errors propagate directly into kitchen execution failures.

### Principle Six: Offline Is An Error State, Not A Degraded Mode
The platform MUST NOT provide offline write mode.
WebSocket disconnect MUST surface as a full-screen or persistent blocking error state.
Write interactions (add item, send to kitchen, close table) MUST be disabled while disconnected.
Read-only data MAY remain visible but MUST be marked stale.

On reconnect, client MUST re-fetch current state for all open sessions before re-enabling writes.

Rationale: stale writes create irreversible operational divergence.

### Principle Seven: The Spatial Editor Is A Separate Environment, Not A Modal
Spatial editor and live floor monitoring MUST be separate route contexts.
Editor route MUST not mount live session data.
Live route MUST not mount edit tooling.
Publishing a layout MUST exit edit context and navigate back to live monitoring.

Rationale: editing and operations require different mental models and safety boundaries.

### Principle Eight: Every Destructive Action Has A Confirmation Layer
Void, cancel reservation, and close table MUST require explicit confirmation flows.

Void confirmation MUST include:
- item name
- reason code selector
- `is_wasted` toggle

Close table confirmation MUST include:
- total bill amount
- number of served items

Destructive confirmation MUST name consequence explicitly.
Backdrop tap MUST dismiss without side effects.

Rationale: irreversible actions require deliberate operator intent.

### Principle Nine: Performance Budget Is Tied To The Floor Plan Render
Floor plan updates for full layouts MUST paint within 100ms from WebSocket delivery on a mid-range tablet.
Any change that breaches this budget MUST be optimized before release.
Floor plan table icons MUST render in a single pass and MUST NOT trigger per-icon network fetches.

Rationale: floor plan responsiveness is a hard operational SLA.

### Principle Ten: Theme Support Is A First-Class Requirement
Customer and staff interfaces MUST support system dark theme.
Staff dark mode MUST be validated under high ambient light for kitchen-grade contrast.
Design system MUST define semantic tokens for both light and dark modes.
Theme switching MUST be instantaneous without flash.

Rationale: readability and operational reliability depend on environmental ergonomics.

## Engineering Standards And Delivery

### Frontend Stack And Architecture
- Frontend runtime MUST use React 18 + Vite + TypeScript strict mode.
- State management MUST use Redux Toolkit only.
- API integration MUST use Axios clients under `src/api/` with interceptors.
- Direct `fetch()` use inside pages/components/features is prohibited.
- Architecture MUST follow Feature-Sliced Design boundaries with no cross-feature imports.
- Styling MUST use tokenized semantic values via CSS Modules or Styled Components.

### Delivery Requirements
- Base branch is `develop`.
- Working branches MUST use `feature/*`, `fix/*`, or `chore/*`.
- Pull requests MUST target `develop`, include at least one approval, and pass CI.
- Conventional Commits are mandatory.
- Definition of done requires behavior parity with `spec.md` and synchronized `constitution/spec/plan/tasks` artifacts.

## Governance

This constitution is authoritative for TableMate platform delivery and supersedes conflicting local practices.
Every plan, spec, task set, and pull request MUST include explicit constitution compliance checks.

Amendment policy:
1. Amendments MUST be proposed via pull request.
2. Amendment PRs MUST include migration impact for active features.
3. Approval MUST include engineering owner sign-off.
4. Dependent templates/docs MUST be updated in the same change set.

Versioning policy:
- MAJOR: backward-incompatible governance or principle redefinition/removal.
- MINOR: new principle/section or materially expanded mandatory guidance.
- PATCH: clarification-only or non-semantic wording updates.

Compliance review policy:
- Planning phase MUST fail if constitution gates are unresolved.
- Implementation phase MUST map tasks to constitutional constraints where applicable.
- Review phase MUST reject merges with unresolved constitution violations.

**Version**: 2.0.0 | **Ratified**: 2026-05-07 | **Last Amended**: 2026-05-11
