# TableMate Frontend

Frontend for the TableMate restaurant operations platform.

## Governance Sources

- Business constitution: `.specify/memory/constitution.md`
- Active feature artifacts: `specs/<feature>/spec.md`, `plan.md`, `tasks.md`
- Engineering workflow/rules: `AGENTS.md`

The constitution defines business logic and operational invariants.
Implementation standards live in engineering guidance and MUST align with business rules.

## Local Development

```bash
npm install
npm run dev
```

## Quality Gates

```bash
npm run lint
npm run build
```
