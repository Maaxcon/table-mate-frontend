# TableMate Frontend

Frontend for the TableMate restaurant operations platform.

## Spec Kit Workflow (Frontend)

Spec Kit is managed from the repository root/backend side, not inside this frontend package.
Source of truth is the backend/root workspace where product specs are maintained.

- Run all Spec Kit commands from the root folder.
- Backend/root is responsible for creating and updating `spec.md`, `plan.md`, and `tasks.md`.
- Keep `.specify/`, `specs/`, and `AGENTS.md` in the root only.
- In this frontend package, implement tasks based on the active root spec artifacts.
- Do not recreate Spec Kit folders/files locally in `table-mate-frontend`.

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
