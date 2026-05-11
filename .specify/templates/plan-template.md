# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., TypeScript strict, Rust 1.75 or NEEDS CLARIFICATION]
**Primary Dependencies**: [e.g., React 18, RTK, Axios, ws client or NEEDS CLARIFICATION]
**Storage**: [if applicable, e.g., PostgreSQL, localStorage, files or N/A]
**Testing**: [e.g., Vitest, RTL, Playwright or NEEDS CLARIFICATION]
**Target Platform**: [e.g., web tablet, mobile browser, desktop browser]
**Project Type**: [e.g., frontend web app, backend service]
**Realtime Transport**: [WebSocket event channels + schema version policy]
**Performance Goals**: [domain-specific, e.g., floor plan update paint <100ms]
**Constraints**: [e.g., role-scoped mounts, no polling, no offline writes]
**Scale/Scope**: [domain-specific, e.g., 50-table floor plan, shift-level concurrency]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] `Role-scoped render tree`: unauthorized role routes/components are not mounted.
- [ ] `Backend authority`: table and order-item statuses are rendered from backend-pushed state, not local inference.
- [ ] `Realtime contract`: all live state is websocket-delivered; no polling loops.
- [ ] `Event version safety`: client behavior for unknown `schema_version` is explicitly defined as ignore-safe.
- [ ] `Destructive-action safeguards`: void/cancel reservation/close table include explicit consequence confirmations.
- [ ] `Offline behavior`: write actions are blocked on disconnect; reconnect includes full state refetch before writes resume.
- [ ] `Design tokens`: status colors and theme values are semantic tokens, no hardcoded status hex values.
- [ ] `Floor plan SLA`: planned implementation includes evidence/strategy for <100ms floor-plan render update budget.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., temporary polling fallback] | [current constraint] | [why websocket-only path not yet possible] |
| [e.g., extra mounted role surface] | [specific operational need] | [why strict role isolation cannot yet apply] |
