<!--
Sync Impact Report
- Version change: 2.0.0 -> 3.0.0
- Modified principles:
  - Principle One: Role Determines Everything -> Principle One: Role Scope Is A Business Control
  - Principle Two: The Floor Plan Is A Live Document, Not A Cached Image -> Principle Two: Canonical Business Entities Are Non-Negotiable
  - Principle Three: Notifications Are A Stream, Not A Badge Count -> Principle Three: Operational State Is Backend-Authoritative
  - Principle Four: Status Colors Are A Design System Primitive, Not A Component Decision -> Principle Four: Order Intake Is Authorized Only By Business Events
  - Principle Five: The Modifier Modal Is The Most Critical Input Surface -> Principle Five: Void Is Atomic And Auditable
  - Principle Six: Offline Is An Error State, Not A Degraded Mode -> Principle Six: Session Lifecycle Defines Revenue Truth
  - Principle Seven: The Spatial Editor Is A Separate Environment, Not A Modal -> Principle Seven: Time-Critical Signals Must Reach The Responsible Role Immediately
  - Principle Eight: Every Destructive Action Has A Confirmation Layer -> Principle Eight: Irreversible Actions Require Explicit Human Intent
  - Principle Nine: Performance Budget Is Tied To The Floor Plan Render -> Principle Nine: Cycle Time Is A Contract Metric
  - Principle Ten: Theme Support Is A First-Class Requirement -> Principle Ten: Unknown Event Versions Must Fail Safe
- Added sections:
  - Business Scope And Non-Goals
  - Governance Model
- Removed sections:
  - Engineering Standards And Delivery
  - Frontend Stack And Architecture
  - Delivery Requirements
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
Every product decision MUST ensure that the right information reaches
Customer, Waiter, Cook, and Admin/Manager at the right moment, without ambiguity.

Operational delay, stale state, and role confusion are business defects.

### Shared Data Contracts
The following entities are canonical and MUST remain role-consistent:

- `Restaurant`: `id`, `name`, `working_hours`, `active_floor_plan_ref`, `qr_codes` to `table_id` mapping.
- `Table`: `id`, `sector`, `capacity`, `status` in `{free, reserved, occupied}`.
- `Order`: `id`, `table_ref`, `session_ref`, `origin` in `{waiter_manual, customer_prepaid}`,
  `payment_status` in `{unpaid, paid, settled}`, `order_items[]`.
- `OrderItem`: `id`, `menu_item_ref`, `quantity`, `modifier_text`, `guest_slot_index`,
  `status` in `{pending, in_progress, ready, voided, completed}`.
- `Ticket`: kitchen-scoped projection of an order.
- `Session`: one table occupancy window and the only boundary for cycle, void, and revenue rollups.
- `Staff`: `id`, `name`, `email`, `role` in `{cook, waiter, manager, admin}`,
  `shift_status` in `{online, offline}`.

No consumer MAY invent local entity variants that redefine business meaning.

## Core Principles

### Principle One: Role Scope Is A Business Control
Role permissions are product behavior, not UI preference.
Access boundaries for Cook, Waiter, Manager, and Admin MUST be enforced
consistently across all interfaces and all backend operations.

Rationale: wrong-surface access causes direct service failures.

### Principle Two: Canonical Business Entities Are Non-Negotiable
`Restaurant`, `Table`, `Order`, `OrderItem`, `Ticket`, `Session`, and `Staff`
MUST preserve the same business meaning in every workflow.

Rationale: entity drift creates contradictory operational decisions.

### Principle Three: Operational State Is Backend-Authoritative
Business-critical status fields (table occupancy, order lifecycle, payment state)
MUST be authoritative from backend state transitions.

Rationale: one source of truth is required for service coordination.

### Principle Four: Order Intake Is Authorized Only By Business Events
Customer-originated kitchen intake MUST occur only after verified payment success.
Waiter-originated intake MUST follow explicit service actions.

Rationale: kitchen work cannot begin on unconfirmed demand.

### Principle Five: Void Is Atomic And Auditable
Void execution MUST be all-or-nothing and leave an auditable trail.
Void reason code MUST be one of
`{mispick, guest_changed_mind, quality_issue, out_of_stock}` and MUST include `is_wasted`.

Rationale: partial reversals corrupt inventory, receipts, and shift accounting.

### Principle Six: Session Lifecycle Defines Revenue Truth
A table `Session` opens at service start and closes only on explicit table close.
Revenue, void totals, and cycle analytics MUST be computed against session boundaries.

Rationale: session boundaries prevent financial misattribution.

### Principle Seven: Time-Critical Signals Must Reach The Responsible Role Immediately
Kitchen-ready, table-status, and reservation events MUST route to responsible roles without batching.
Role-targeted event delivery is mandatory for operational timeliness.

Rationale: delayed signals increase wait time and waste.

### Principle Eight: Irreversible Actions Require Explicit Human Intent
Void, cancel reservation, and close table are destructive actions and MUST require
an explicit confirmation step that states business consequence.

Rationale: irreversible operations need deliberate accountability.

### Principle Nine: Cycle Time Is A Contract Metric
Ticket cycle time is defined only as `bump_timestamp - injection_timestamp`.
Average Prep Time MUST be computed from that definition and reported consistently.

Rationale: operations and staffing decisions depend on stable metric definitions.

### Principle Ten: Unknown Event Versions Must Fail Safe
When an event schema version is unknown, consumers MUST ignore it safely and continue operating.
Published event contracts MUST evolve compatibly by additive optional fields.

Rationale: version mismatch must never disrupt active service.

## Business Scope And Non-Goals

In scope:
- Real-time restaurant operations across Customer, Waiter, Cook, Manager, and Admin workflows.
- Reservation, order intake, kitchen execution, void handling, and session close lifecycle.
- Shift/day operational metrics and financial correctness based on canonical session boundaries.

Out of scope in this constitution:
- Framework, library, and coding-style choices.
- Branching strategy, lint/format tooling, and CI implementation detail.
- UI implementation patterns that do not alter business behavior.

## Governance Model

This constitution governs business logic and operational invariants.
Technical implementation standards MAY exist in separate engineering guidance,
but MUST NOT contradict business rules defined here.

Amendment policy:
1. Amendments MUST be proposed in pull requests.
2. Any business rule change MUST include migration impact on active features.
3. Approval MUST include product/operations admin sign-off.
4. `spec.md`, `plan.md`, and `tasks.md` templates MUST be updated when governance meaning changes.

Versioning policy:
- MAJOR: incompatible business rule redefinition/removal.
- MINOR: new business principle/section or materially expanded scope.
- PATCH: wording clarifications without rule meaning changes.

Compliance review policy:
- Planning MUST map feature behavior to applicable business principles.
- Specification MUST define role, state, and lifecycle impacts.
- Tasks MUST include verification of business invariants before delivery.

**Version**: 3.0.0 | **Ratified**: 2026-05-07 | **Last Amended**: 2026-05-11
