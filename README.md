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

## Regenerating the API Client

The typed API client in `src/types/api/` is generated from the OpenAPI schema.

### Workflow

1. Make sure the latest `schema.yaml` is at the project root.
2. Run the generator:

   ```bash
   npm run generate:api
   ```

   This reads `schema.yaml` and outputs the client + types into `src/types/api/`.

3. Commit both the updated `schema.yaml` and the regenerated `src/types/api/` together so they stay in sync.

> The generated files are checked into version control so CI can detect drift. If the schema changes and the generated files aren't updated, `git diff --exit-code -- src/types/api/` will fail in CI.

## Quality Gates

```bash
npm run lint
npm run build
```
