# Quickstart: Frontend MVP Plan Validation

## 1) Start app

```bash
npm install
npm run dev
```

## 2) Validate policy-critical behavior

1. Verify guest/auth entry from `/` and read-only guest restrictions.
2. Verify protected route deny-by-default behavior for unauthorized roles.
3. Verify reservation flow shows backend-confirmed table statuses and handles `409` conflicts.
4. Verify cart/hall event handling ignores unknown `schema_version` safely.
5. Verify reconnect performs authoritative state re-fetch before write actions resume.
6. Verify destructive actions require explicit confirmation.
7. Verify settled/completed/closed records render as read-only.

## 3) Validate explicit scope exceptions

Confirm frontend does not perform:
- payment settlement or webhook verification,
- authoritative ticket injection sequencing,
- historical replay service implementation,
- immutable reporting generation.

## 4) Quality checks

```bash
npm run lint
npm run build
```
