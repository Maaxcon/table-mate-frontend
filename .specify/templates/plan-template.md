# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: business objective + operational impact]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with technical details
  needed to implement the feature. Keep this section implementation-oriented.
-->

**Language/Version**: [e.g., TypeScript strict, Python 3.12 or NEEDS CLARIFICATION]
**Primary Dependencies**: [e.g., React, RTK, Axios, ws client or NEEDS CLARIFICATION]
**Storage**: [if applicable, e.g., PostgreSQL, localStorage, files or N/A]
**Testing**: [e.g., Vitest, RTL, Playwright or NEEDS CLARIFICATION]
**Target Platform**: [e.g., web tablet, mobile browser, desktop browser]
**Project Type**: [e.g., frontend web app, backend service]
**Scale/Scope**: [domain-specific, e.g., 50-table floor plan, shift-level concurrency]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] `Role control`: impacted routes/actions preserve role permission boundaries.
- [ ] `Canonical entities`: changes preserve shared entity semantics.
- [ ] `Backend authority`: business-critical statuses remain backend-authoritative.
- [ ] `Payment gating`: customer-originated order intake requires verified payment success.
- [ ] `Void integrity`: void flow remains atomic and auditable with required reason + waste flag.
- [ ] `Session accounting`: feature preserves session-bound revenue/void/cycle calculations.
- [ ] `Signal timeliness`: role-targeted events remain immediate and non-batched for critical flows.
- [ ] `Compatibility`: unknown event versions are ignored safely and existing contracts remain additive.

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
| [e.g., temporary contract exception] | [current constraint] | [why compliant flow is not currently possible] |
| [e.g., partial rollout by role] | [business rollout need] | [why full role matrix cannot ship immediately] |
