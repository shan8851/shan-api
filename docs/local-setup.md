# Local setup (env + first run)

Use Neon from day one so local development matches real runtime behavior.

## Required env vars

```env
# App runtime queries (Neon pooled URL)
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.neon.tech/DB?sslmode=require

# Migrations (Neon direct/non-pooled URL)
DATABASE_URL_MIGRATIONS=postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require

# Protects /readyz and /metrics
# Comma-separated list to support key rotation (current,next)
INTERNAL_API_KEYS=replace_with_random_key

# Optional local port
PORT=3000
```

## Which URL goes where?

- `DATABASE_URL` → pooled URL (normal app connections)
- `DATABASE_URL_MIGRATIONS` → direct URL (migrations/admin operations)

## Internal API key usage

Protected endpoints in v1:
- `GET /readyz`
- `GET /metrics`

Header:

```http
x-internal-api-key: <one_key_from_INTERNAL_API_KEYS>
```

Generate a strong key:

```bash
openssl rand -hex 32
```

## First local steps

1. Copy env template and fill values.
2. Run migrations using `DATABASE_URL_MIGRATIONS`.
3. Run bootstrap import from `shan_site`:
   - dry-run: `npm run db:seed -- --dry-run`
   - apply: `npm run db:seed`
4. Start app and test:
   - public: `/healthz`
   - protected: `/readyz` and `/metrics` with `x-internal-api-key`

## Bootstrap import notes

- Source files:
  - `/home/shan/giles/shan_site/app/content/uses.ts`
  - `/home/shan/giles/shan_site/app/content/operatorFrontDoor.ts`
  - `/home/shan/giles/shan_site/content/writing/*.md`
- Import is idempotent:
  - upserts by stable slug/key
  - updates changed rows
  - deactivates stale rows with `is_active=false`
  - increments `version` only for meaningful row changes (including reactivation/deactivation)
- Postgres is the long-term canonical source of truth after bootstrap.
