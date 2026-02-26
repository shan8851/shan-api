# shan-api — Next Steps

Status date: 2026-02-26
Owner: Shan + Giles

This is the active plan from the current repo state.

## Current status (done)
- v1 read endpoints shipped:
  - `/v1/now` (snapshot)
  - `/v1/uses` (snapshot)
  - `/v1/projects` (cursor paginated)
  - `/v1/posts` + `/v1/posts/:slug` (cursor paginated list + detail)
- Protected ops endpoints shipped:
  - `/healthz` public
  - `/readyz` and `/metrics` protected by `x-internal-api-key`
- OpenAPI contract + lint/validate scripts shipped.
- Bootstrap importer from `shan_site` shipped (dry-run + apply, idempotent).

## Immediate hardening (next)
1. **Importer transaction safety**
   - Wrap bootstrap import in a single DB transaction so partial writes cannot land on failure.
2. **OpenAPI breaking baseline**
   - Commit `openapi/baseline/v1.yaml` and wire `openapi:check-breaking` to fail on breaking changes.
3. **Migration discipline**
   - Add lightweight migration checklist:
     - schema change -> migration file
     - migration tested locally
     - seed dry-run + apply verified
4. **Seed observability**
   - Add concise seed run summary logs and clear failure messages by resource.

## Deploy + runtime readiness
1. Provision Railway `staging` + `prod` services.
2. Provision Neon DBs/branches for `staging` + `prod`.
3. Set env vars in Railway (including rotated `INTERNAL_API_KEYS`).
4. Run migrations in staging and verify `/readyz` with auth header.
5. Add first uptime monitor + Discord alerts.

## Private write path planning (high priority)
Design an internal/operator-only write lane (no public writes) for:
- now updates
- uses updates
- projects updates
- posts create/update/publish

Target shape:
- `npm run ops:*` style commands or `shan-cli` later.
- Strong input validation + dry-run mode.
- Deterministic slug handling and conflict behavior.
- Explicit publish/update semantics for posts.
- Audit-friendly logs for every write action.

## Bootstrap importer retirement plan
- Keep importer only as bootstrap/backfill tool.
- Once operator write path is stable and DB is canonical in daily flow:
  1) stop routine reliance on `shan_site` imports,
  2) keep importer as emergency one-shot utility,
  3) optionally move importer docs/code under `scripts/bootstrap/` or archive.

## Naming direction for cross-surface aggregate content
- Avoid `home` naming.
- Use `overview` for future composed endpoint payloads consumed by multiple apps.
