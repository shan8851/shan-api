# shan-api

Standalone backend API for Shan content resources (`uses`, `projects`, `now`, `posts`).

## Requirements

- Node.js 20+
- Docker (required for integration tests via Testcontainers)
- Neon Postgres credentials (or another Postgres connection)

## Docs

- `docs/decisions-log.md` — locked architecture/product decisions
- `docs/next-steps.md` — active execution plan (hardening/deploy/write-path)
- `docs/local-setup.md` — env + local setup flow
- `docs/content-source-map.md` — current bootstrap source mapping from `shan_site`
- `docs/contract-review-checklist.md` — OpenAPI review checklist
- `docs/implementation-plan.md` — historical draft plan (kept for context)

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

3. Bootstrap import from `shan_site` (dry-run first):

```bash
npm run db:seed -- --dry-run
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
curl -s "$API_BASE_URL/v1/posts?limit=20"
curl -s "$API_BASE_URL/v1/posts/agent-basics"
```

Endpoint pagination policy:
- `/v1/now`: snapshot (non-paginated)
- `/v1/uses`: snapshot (non-paginated)
- `/v1/projects`: cursor-paginated
- `/v1/posts`: cursor-paginated

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

Posts pagination + detail follow-up request:

```bash
POSTS_PAGE=$(curl -s "$API_BASE_URL/v1/posts?limit=2")
POSTS_NEXT_CURSOR=$(echo "$POSTS_PAGE" | jq -r '.page.nextCursor')
POST_SLUG=$(echo "$POSTS_PAGE" | jq -r '.data[0].slug')
curl -s "$API_BASE_URL/v1/posts?limit=2&cursor=$POSTS_NEXT_CURSOR"
curl -s "$API_BASE_URL/v1/posts/$POST_SLUG"
```

Current data behavior:
- Endpoints are DB-backed.
- `shan_site` import is a bootstrap path to initialize data.
- Postgres remains the canonical source of truth after bootstrap.
- The importer is idempotent: re-runs upsert by stable slug/key and deactivate stale rows.
- `version` increments only on meaningful row changes (including reactivation/deactivation), and stays stable on no-op re-runs.
- Posts import source path: `/home/shan/giles/shan_site/content/writing/*.md`.

Optional bootstrap source override:

```bash
SHAN_SITE_ROOT=/custom/path/to/shan_site npm run db:seed -- --dry-run
```

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
- `/v1/posts`: cursor-paginated

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
