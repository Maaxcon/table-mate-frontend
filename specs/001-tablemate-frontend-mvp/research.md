# Research: TableMate Frontend MVP (Constitution v3.0.0 Alignment)

## Decision 1: Frontend authority model

- Decision: Frontend is a command-and-render client, not business authority.
- Rationale: Constitution principle 3 requires backend-authoritative operational state.
- Alternatives considered: frontend-derived status reconciliation; rejected due to divergence risk.

## Decision 2: Event compatibility handling

- Decision: Enforce `schema_version` checks and safe-ignore unknown versions.
- Rationale: Constitution principle 10 requires fail-safe version behavior.
- Alternatives considered: strict event rejection and disconnect; rejected due to service disruption risk.

## Decision 3: Reconnect recovery

- Decision: Use full snapshot re-fetch after reconnect for MVP.
- Rationale: Full replay capability is backend-dependent and out of MVP scope.
- Alternatives considered: local buffered replay only; rejected due to potential drift and duplication.

## Decision 4: Irreversible action handling

- Decision: Require explicit confirmation UI before dispatching destructive commands.
- Rationale: Constitution principle 8 requires explicit human intent.
- Alternatives considered: single-click destructive actions; rejected for operational safety.

## Decision 5: Technical standards source

- Decision: Keep business rules in constitution and technical rules in AGENTS.md.
- Rationale: Constitution v3.0.0 explicitly scopes out engineering implementation policy.
- Alternatives considered: duplicate technical standards into constitution; rejected due to governance mixing.
