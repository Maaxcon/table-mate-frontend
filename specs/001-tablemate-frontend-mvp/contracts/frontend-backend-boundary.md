# Frontend-Backend Boundary Contract (MVP)

## Purpose

Define frontend integration boundaries for `001-tablemate-frontend-mvp` under Constitution v3.0.0.

## Authority Split

Backend authoritative domains:

- role and permission decisions
- business status transitions
- payment settlement and webhook processing
- session lifecycle truth
- ticket lifecycle sequencing
- immutable reporting records

Frontend responsibilities:

- render backend state
- collect user input
- submit command intents
- present success/failure outcomes

## Canonical Staff Roles

Backend staff roles consumed by frontend:

- `admin`
- `manager`
- `waiter`
- `cook`

Anonymous guest mode in frontend is a read-only UX mode and is not a backend staff role.

## Event Consumption Contract

Consumed channels:

- `ws/cart/:session_id/`: `CART_ITEM_ADDED`, `CART_ITEM_REMOVED`, `CART_PARTICIPANT_JOINED`, `CART_PARTICIPANT_LEFT`
- `ws/hall/`: `HALL_TABLE_STATUS_CHANGED`, `HALL_NEW_RESERVATION`

Rules:

- payload MUST include `schema_version`
- unknown versions MUST be safely ignored
- reconnect MUST trigger authoritative snapshot refresh

## Exception Boundaries

MVP exclusions:

- webhook verification
- historical replay infrastructure
- immutable reporting generation

Future integration path:

- when backend endpoints/services are available, frontend consumes them without changing authority split.
