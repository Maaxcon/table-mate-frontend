---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include tests when required by the feature spec.
Constitution-critical business invariants MUST have explicit validation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Constitution-Driven Task Types *(mandatory review while generating tasks)*

- Role permission boundary tasks (allow + deny paths).
- Canonical entity and lifecycle transition tasks.
- Payment-gated intake validation tasks for customer-originated orders.
- Void atomicity + audit-trail tasks (reason code + waste flag enforcement).
- Session-bound accounting and metric integrity tasks.
- Event compatibility tasks (`schema_version` safe-ignore + additive evolution).

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare feature scaffolding and baseline dependencies

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Establish contracts/entities impacted by the feature
- [ ] T003 [P] Set up validation/test harness for role and lifecycle rules

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core business-rule infrastructure required before story work

- [ ] T004 Implement/verify role access guardrails for affected surfaces
- [ ] T005 [P] Implement canonical state transition handling
- [ ] T006 [P] Implement event contract/version handling where applicable
- [ ] T007 Implement audit and error pathways for business-critical operations

**Checkpoint**: Business invariants are enforceable; story work can proceed

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [What this story delivers]

**Independent Test**: [How to verify this story works independently]

### Validation (as required by spec)

- [ ] T008 [P] [US1] Validate role permissions for story entrypoints
- [ ] T009 [P] [US1] Validate state transitions and invariants

### Implementation

- [ ] T010 [P] [US1] Implement entity/state changes in [path]
- [ ] T011 [US1] Implement action flow in [path]
- [ ] T012 [US1] Implement safeguards for irreversible actions (if applicable)

**Checkpoint**: User Story 1 independently functional and compliant

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [What this story delivers]

**Independent Test**: [How to verify this story works independently]

### Validation (as required by spec)

- [ ] T013 [P] [US2] Validate permission and denial paths
- [ ] T014 [P] [US2] Validate event/version compatibility behavior

### Implementation

- [ ] T015 [P] [US2] Implement entity/state changes in [path]
- [ ] T016 [US2] Implement action flow in [path]

**Checkpoint**: User Stories 1 and 2 independently functional and compliant

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [What this story delivers]

**Independent Test**: [How to verify this story works independently]

### Validation (as required by spec)

- [ ] T017 [P] [US3] Validate accounting/metric integrity impacts
- [ ] T018 [P] [US3] Validate auditability and rollback behavior

### Implementation

- [ ] T019 [P] [US3] Implement entity/state changes in [path]
- [ ] T020 [US3] Implement action flow in [path]

**Checkpoint**: All targeted stories independently functional and compliant

---

## Final Phase: Cross-Cutting

- [ ] TXXX Re-run constitution compliance checks for all impacted principles
- [ ] TXXX Update docs/spec artifacts to reflect final business behavior
- [ ] TXXX Validate no unresolved business-rule exceptions remain

## Notes

- Keep tasks specific, file-scoped, and traceable to a user story.
- If a constitution gate is deferred, include explicit justification and rollback plan.
