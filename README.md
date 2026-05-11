# TableMate Frontend

Frontend for the TableMate restaurant operations platform.

## Stack

- React 18 + Vite
- TypeScript (strict mode)
- Redux Toolkit (single state management layer)
- Axios API layer (`src/api/`)
- Feature-Sliced Design structure

## Governance Sources

- Constitution: `.specify/memory/constitution.md`
- Active feature artifacts: `specs/<feature>/spec.md`, `plan.md`, `tasks.md`
- Agent workflow rules: `AGENTS.md`

All implementation and planning work MUST satisfy constitution gates before merge.

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

Use Conventional Commits and target PRs to `develop`.
