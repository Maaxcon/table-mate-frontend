---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include tests whenever called for by the feature spec. Constitution-critical validations
(role access boundaries, websocket event handling, disconnect behavior, destructive confirmations,
and performance budgets) MUST be tasked explicitly even when test automation scope is minimal.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Constitution-Driven Task Types *(mandatory review while generating tasks)*

- Role-scoped route/component mounting and access-guard verification tasks.
- Realtime event ingestion tasks with typed payload + `schema_version` ignore-safe handling.
- Disconnect/reconnect tasks that block writes and force state re-fetch before resume.
- Destructive-action confirmation flow tasks for irreversible actions.
- Semantic token mapping tasks for status colors and theme mode parity.
- Floor-plan render performance validation tasks against the defined latency budget.

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools
- [ ] T004 Establish semantic design tokens for status + theme modes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T005 Setup authentication/authorization framework with role boundaries
- [ ] T006 [P] Setup websocket infrastructure and typed event parser
- [ ] T007 [P] Implement API routing/client layer and mutation handlers
- [ ] T008 Implement connection-state UX and write-lock behavior on disconnect
- [ ] T009 Setup error handling and logging infrastructure
- [ ] T010 Define baseline performance instrumentation for floor-plan/live surfaces

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (include when required by spec) ⚠️

- [ ] T011 [P] [US1] Contract or integration test for primary journey in [path]
- [ ] T012 [P] [US1] Role access boundary test for affected routes/components in [path]

### Implementation for User Story 1

- [ ] T013 [P] [US1] Create/update domain model types in [path]
- [ ] T014 [US1] Implement service/state logic in [path]
- [ ] T015 [US1] Implement UI route/components in [path]
- [ ] T016 [US1] Add destructive-action confirmation safeguards (if applicable)
- [ ] T017 [US1] Validate websocket and reconnect behavior (if applicable)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (include when required by spec) ⚠️

- [ ] T018 [P] [US2] Contract or integration test for primary journey in [path]
- [ ] T019 [P] [US2] Event version or disconnect behavior test in [path]

### Implementation for User Story 2

- [ ] T020 [P] [US2] Create/update domain model types in [path]
- [ ] T021 [US2] Implement service/state logic in [path]
- [ ] T022 [US2] Implement UI route/components in [path]
- [ ] T023 [US2] Apply semantic status/theme tokens in [path]

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (include when required by spec) ⚠️

- [ ] T024 [P] [US3] Contract or integration test for primary journey in [path]
- [ ] T025 [P] [US3] Performance budget validation for live render path in [path]

### Implementation for User Story 3

- [ ] T026 [P] [US3] Create/update domain model types in [path]
- [ ] T027 [US3] Implement service/state logic in [path]
- [ ] T028 [US3] Implement UI route/components in [path]

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Re-check constitution gates against implemented behavior
- [ ] TXXX Floor-plan/render performance optimization and validation
- [ ] TXXX [P] Additional tests in tests/unit/ or tests/integration/
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 -> P2 -> P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Implement role/access boundaries before exposing routes
- Implement and validate websocket/disconnect behavior before shipping live updates
- Implement destructive confirmations before enabling irreversible operations
- Complete story-level validation before moving to the next priority

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel
- Foundational tasks marked [P] can run in parallel
- Once Foundational completes, user stories can start in parallel (if capacity allows)
- Story-level tests and model tasks marked [P] can run in parallel

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Keep generated tasks concrete, file-scoped, and constitution-aligned
