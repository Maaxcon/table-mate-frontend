# Data Model: TableMate Frontend MVP

## Modeling Rule

Frontend models are projections of backend domain entities and MUST NOT redefine business semantics.

## Entities Consumed by Frontend

### UserDTO

- Fields: `id`, `name`, `email`, `role`, `permissions[]`
- Role: drives route/action visibility only
- Authority: backend-authored

### TableDTO

- Fields: `id`, `sector`, `capacity`, `status`
- Role: render floor/hall state
- Authority: backend-authored `status`

### ReservationDTO

- Fields: `id`, `table_id`, `time`, `guest_count`, `status`
- Role: display reservation outcomes and conflict states
- Authority: backend-authored lifecycle

### OrderDTO / OrderItemDTO

- Fields: order refs + item refs + lifecycle statuses
- Role: display order progression and kitchen outcomes
- Authority: backend-authored statuses and transitions

### CartSessionDTO / CartItemDTO

- Fields: session id, participants, items, totals, connection state
- Role: collaborative cart rendering and user actions
- Authority: backend snapshot + event feed

## Lifecycle and Transition Ownership

Backend-owned transitions:

- payment lifecycle (`unpaid -> paid -> settled`)
- order item lifecycle (`pending -> in_progress -> ready -> voided/completed`)
- table occupancy lifecycle (`free/reserved/occupied`)
- session open/close boundaries
- ticket injection/completion lifecycle

Frontend responsibilities:

- submit command intent
- render backend-confirmed transitions
- rollback transient optimistic UI when backend rejects/conflicts

## Immutable Boundaries in Frontend

Read-only once finalized:

- settled payments
- completed/voided order items (unless backend allows specific operational action)
- closed sessions
- historical reporting snapshots
