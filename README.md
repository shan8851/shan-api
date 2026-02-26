# shan-api

Standalone backend API for Shan content resources (`uses`, `projects`, `now`).

## Requirements

- Node.js 20+
- Docker (required for integration tests via Testcontainers)
- Neon Postgres credentials (or another Postgres connection)

## Environment

Copy and fill environment values:

```bash
cp .env.example .env
```

Required values:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.neon.tech/DB?sslmode=require
DATABASE_URL_MIGRATIONS=postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require
INTERNAL_API_KEYS=replace_with_random_key
PORT=3000
```

## Local run flow

1. Generate migration files:

```bash
npm run db:generate
```

2. Apply migrations:

```bash
npm run db:migrate
```

3. Optional seed scaffold:

```bash
npm run db:seed
```

4. Run API locally:

```bash
npm run dev
```

## Endpoint smoke checks

Public endpoints:

```bash
export API_BASE_URL="http://localhost:3000" # or your configured PORT (for example 3010)

curl -s "$API_BASE_URL/healthz"
curl -s "$API_BASE_URL/v1/now"
curl -s "$API_BASE_URL/v1/uses"
curl -s "$API_BASE_URL/v1/projects?limit=20"
```

Endpoint pagination policy:
- `/v1/now`: snapshot (non-paginated)
- `/v1/uses`: snapshot (non-paginated)
- `/v1/projects`: cursor-paginated

Protected endpoints:

```bash
curl -s -H "x-internal-api-key: $INTERNAL_API_KEY" "$API_BASE_URL/readyz"
curl -s -H "x-internal-api-key: $INTERNAL_API_KEY" "$API_BASE_URL/metrics"
```

Set the header key from your `.env` value:

```bash
export INTERNAL_API_KEY="replace_with_random_key"
```

Projects pagination follow-up request:

```bash
FIRST_PAGE=$(curl -s "$API_BASE_URL/v1/projects?limit=2")
NEXT_CURSOR=$(echo "$FIRST_PAGE" | jq -r '.page.nextCursor')
curl -s "$API_BASE_URL/v1/projects?limit=2&cursor=$NEXT_CURSOR"
```

Current data behavior:
- Endpoints are DB-backed.
- Content import/seed synchronization from `shan_site` is intentionally deferred to a later slice.

## Validation commands

```bash
npm test
npm run build
npm run lint
```

## OpenAPI contract

Canonical v1 contract file:
- `openapi/v1.yaml`

Endpoint semantics tracked in contract:
- `/v1/now`: snapshot (non-paginated)
- `/v1/uses`: snapshot (non-paginated)
- `/v1/projects`: cursor-paginated

Contract tooling:

```bash
npm run openapi:lint
npm run openapi:validate
npm run openapi:check-breaking
```

CI-compatible local flow:

```bash
npm run openapi:ci
```

Breaking check baseline path:
- `openapi/baseline/v1.yaml`
- If baseline is missing, the check prints a clear skip message and exits successfully.
