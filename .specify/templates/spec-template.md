# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`
**Created**: [DATE]
**Status**: Draft
**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE.
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

### Edge Cases

- What happens when [boundary condition]?
- How does system handle [error scenario]?
- What happens when an event version is unknown?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST [specific capability]
- **FR-002**: System MUST [specific capability]
- **FR-003**: Users MUST be able to [key interaction]
- **FR-004**: System MUST [data/lifecycle requirement]
- **FR-005**: System MUST [observable business behavior]

### Role Access Impact *(mandatory)*

- Define which roles can access each route/surface/action affected by this feature.
- Define denied paths for unauthorized roles.
- Define backend authorization dependencies for each role-gated action.

### Business State And Lifecycle Impact *(mandatory)*

- Identify canonical entities this feature creates/updates/reads.
- Define authoritative state transitions and trigger conditions.
- State how session boundaries, payment status, and order lifecycle are preserved.

### Event And Compatibility Contract *(mandatory if live state involved)*

- List event channels/types consumed or emitted.
- Define payload fields and schema-version behavior.
- Unknown versions MUST be ignored safely.
- Changes to existing event contracts MUST be additive or versioned.

### Irreversible Action Safeguards *(mandatory if applicable)*

- List irreversible actions introduced.
- Specify required confirmation inputs and consequence messaging.
- Specify dismiss/cancel behavior with no side effects.

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes]
- **[Entity 2]**: [What it represents, relationships]

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: [Operational metric, e.g., completion time]
- **SC-002**: [Permission correctness metric]
- **SC-003**: [State integrity metric]
- **SC-004**: [Business KPI or failure-rate reduction metric]

## Assumptions

- [Assumption about users/environment]
- [Assumption about external systems]
- [Assumption about scope boundaries]
