# Implementation Plan: TableMate Frontend MVP

**Branch**: `001-tablemate-frontend-mvp` | **Date**: 2026-05-11 | **Spec**: [TableMate Frontend MVP Spec](/Users/kurilchukmaks/Desktop/table-mate/table-mate-frontend/specs/001-tablemate-frontend-mvp/spec.md)
**Input**: Feature specification from `/specs/001-tablemate-frontend-mvp/spec.md`

## Summary

This plan delivers the frontend MVP as a policy-compliant consumer of backend business state.
The frontend renders role-aware UI, collects user commands, sends those commands to backend APIs,
and displays backend-confirmed statuses and events without taking business authority.

## Governance Sources

- Business rules source of truth: `.specify/memory/constitution.md` (Constitution v3.0.0).
- Frontend technical standards source of truth: `AGENTS.md` (stack, architecture, linting, git flow).

Plan rule: constitution constraints are treated as business invariants only; implementation standards are not duplicated as constitution principles.

## Technical Context

**Language/Version**: TypeScript strict mode, React 18, Vite
**Primary Dependencies**: `react-router-dom`, `@reduxjs/toolkit`, `react-redux`, `redux-persist`, `axios`, `@react-oauth/google`, `react-konva`, `konva`
**Storage**: Browser `localStorage` (persisted auth/session UI state)
**Testing**: Vitest + React Testing Library + route guard and integration tests
**Target Platform**: Modern tablet/desktop/mobile browsers
**Project Type**: Frontend web application
**Scale/Scope**: Frontend-only MVP for guest/auth/staff surfaces; backend integrations for auth, reservations, cart, hall events

## Frontend Architecture Boundaries

- Frontend consumes backend APIs and event streams.
- Backend is authoritative for roles, permissions, statuses, validations, lifecycle transitions, and immutable records.
- Frontend responsibilities: render views, collect user input, send commands, display backend responses/events.
- Frontend MUST NOT compute or finalize authoritative `Order`, `OrderItem`, `Session`, `Payment`, `Ticket`, or `Table.status` states.
- Optimistic UI is allowed only as transient UX and must reconcile to backend truth.

## Constitution Check

*GATE: Must pass before implementation and be re-checked after design artifacts are finalized.*

| Gate | Constitution Principle | Plan Alignment | Status |
|------|------------------------|----------------|--------|
| C1 | Role Scope Is A Business Control | All protected route/action visibility is backend-role driven; deny by default. | PASS |
| C2 | Canonical Business Entities Are Non-Negotiable | Frontend DTOs mirror canonical entities; no local semantic variants. | PASS |
| C3 | Operational State Is Backend-Authoritative | UI shows backend-provided status; no client authority over business state. | PASS |
| C4 | Order Intake Is Authorized Only By Business Events | Frontend never marks customer order paid/sent-to-kitchen; backend-confirmed only. | PASS |
| C5 | Void Is Atomic And Auditable | Frontend sends void intent and renders backend result; no partial local void transitions. | PASS |
| C6 | Session Lifecycle Defines Revenue Truth | Session open/close and revenue implications are backend-owned and rendered read-only when finalized. | PASS |
| C7 | Time-Critical Signals Reach Responsible Role | Cart/hall event handling is role-scoped and immediate; reconnect resync is mandatory. | PASS |
| C8 | Irreversible Actions Require Explicit Human Intent | UI confirms void/cancel/close actions before command dispatch. | PASS |
| C9 | Cycle Time Is A Contract Metric | Frontend displays backend-computed cycle metrics only; no local recalculation authority. | PASS |
| C10 | Unknown Event Versions Must Fail Safe | Event consumers check `schema_version`; unknown versions are ignored safely. | PASS |
| C11 | Explicit Frontend Scope Exceptions | Payment/webhook/replay/reporting authority exceptions are documented with integration boundaries. | PASS |

## Frontend MVP Scope Exceptions

These are explicit frontend-scope exceptions (not silent omissions):

1. Payment settlement and webhook verification.
Reason: backend is the authoritative payment processor.
Integration boundary: frontend sends checkout intent and displays backend payment state only.

2. Authoritative ticket injection and kitchen queue sequencing.
Reason: queue integrity and sequencing belong to backend domain logic.
Integration boundary: frontend submits order intent and renders ticket/status updates from backend.

3. Full historical event replay service.
Reason: replay infrastructure is backend capability beyond MVP.
Integration boundary: frontend fallback in MVP is reconnect + full snapshot re-fetch.

4. Immutable reporting generation (financial audit views).
Reason: immutable reporting requires backend persistence and settlement guarantees.
Integration boundary: frontend consumes reporting endpoints when backend exposes immutable snapshots.

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
│   └── frontend-backend-boundary.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── api/
├── assets/
├── components/
├── features/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── store/
├── styles/
├── types/
└── utils/
```

**Structure Decision**: single frontend app with clear integration boundaries to backend services. Backend behavior is consumed, not reimplemented in this feature.

## Phase Plan

### Phase 0 - Policy Alignment and Contracts

1. Lock frontend assumptions to spec + constitution v3.0.0.
2. Establish event/version handling and reconnect recovery rules.
3. Finalize frontend-backend boundary contract docs.

Definition of Done:
- Constitution gates C1-C11 remain PASS.
- Required feature artifacts exist and are synchronized.

### Phase 1 - Access and Entry Flows

1. Implement guest/auth entry surfaces.
2. Enforce role-based route/action visibility from backend role/permission data.
3. Add deny-path UX for unauthorized routes/actions.

Definition of Done:
- Entry and role gating reflect backend authorization outcomes only.

### Phase 2 - Reservation and Menu Flows

1. Implement menu browsing with role-aware action availability.
2. Implement reservation flow using backend table availability and backend-confirmed outcomes.
3. Handle conflict and validation failures from backend as first-class UX paths.

Definition of Done:
- No frontend-authoritative reservation or table status transitions.

### Phase 3 - Real-Time Cart and Hall Consumption

1. Consume cart and hall event channels with `schema_version` safety.
2. Ensure unknown version events fail safe (ignore + continue).
3. Implement reconnect behavior with authoritative snapshot re-fetch.

Definition of Done:
- Event-driven UI remains consistent with backend state after reconnect.

### Phase 4 - Irreversible and Immutable UX Boundaries

1. Enforce explicit confirmations for irreversible actions.
2. Render settled/completed/closed records as read-only in operational views.
3. Validate frontend exceptions remain explicit and non-authoritative.

Definition of Done:
- Irreversible flows and immutable boundaries align with constitution rules.

## Out of Scope (This Plan)

- Backend implementation details for payments, webhooks, queue internals, or reporting persistence.
- Redesign of backend event sourcing architecture.
- Business-rule mutation authority in frontend.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
