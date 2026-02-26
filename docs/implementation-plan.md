# shan-api — Implementation Plan (v1 draft)

Status: draft for review
Date: 2026-02-25
Owner: Shan + Giles

This plan reflects decisions D-001 → D-025 from `decisions-log.md`.

## Success criteria (v1)
- Public read API live for `uses`, `projects`, `now`.
- Contract governed by OpenAPI + CI breaking-change guardrails.
- `healthz` + protected `readyz` + protected `metrics` shipped.
- Basic observability + Discord alerting to `#alerts`.
- 99.0% monthly availability posture established with thresholds.

## Scope (explicit)
### In
- API service (standalone)
- Postgres + migrations
- Public read endpoints for v1 resources
- Minimal auth for protected endpoints
- Logging/metrics + alerts
- CI/CD baseline

### Out (for now)
- CMS/editor UI
- multi-tenant auth
- write APIs
- shan_site migration work
- CLI implementation (`shan-cli`) until API is stable

## Architecture baseline
- Runtime: Node + TypeScript
- Host platform: Railway (single service, Docker-based deploy)
- Environments: local `dev` + Railway `staging` + Railway `prod`
- Region: EU-first (London preferred, nearest EU fallback)
- DB: Neon Postgres (managed)
- ORM/migrations: Drizzle
- Contract: OpenAPI (`/v1`)
- Auth (protected endpoints only): `x-internal-api-key` against `INTERNAL_API_KEYS`
- Observability: Grafana-first stack (Prometheus metrics + Loki logs + uptime checks + Discord alerts)
- Tracing in v1: lightweight request correlation (`request_id` + `trace_id`), full distributed tracing deferred to v1.1

---

## Milestone 0 — Repo + foundations (Day 0-1)
**Outcome:** clean bootstrap with enforced standards.

Tasks:
- Create `shan-api` repo/service scaffold.
- Set up TypeScript, linting, formatting, test runner.
- Add env config layer with strict validation.
- Add CI pipeline skeleton (lint + test + build).
- Add basic app startup + graceful shutdown hooks.

Deliverables:
- passing CI on empty scaffold
- `README` setup/run docs

## Milestone 1 — Data layer + migrations (Day 1-2)
**Outcome:** stable schema and migration workflow.

Tasks:
- Provision Neon Postgres projects/branches for `staging` and `prod`.
- Implement Drizzle schema for:
  - `uses`
  - `projects`
  - `now_entries`
  - `meta` (`global_last_updated`)
- Add shared metadata fields (`id`, `slug`, `updated_at`, `version`, `is_active`).
- Add first migrations + seed script.
- Define indexes for expected reads (slug lookups, updated_at + id sorting).

Deliverables:
- reproducible migrate + seed flow
- schema docs in `/docs/data-model.md`

## Milestone 2 — API contract-first design (Day 2-3)
**Outcome:** explicit API contract before handlers.

Tasks:
- Write OpenAPI spec for:
  - `GET /v1/uses`
  - `GET /v1/projects`
  - `GET /v1/now`
  - `GET /v1/meta/last-updated`
  - `GET /healthz`
  - `GET /readyz` (protected)
  - `GET /metrics` (protected)
- Define OpenAPI security scheme for protected endpoints (`x-internal-api-key`).
- Define pagination contract for paginated list resources (`/v1/projects` in v1):
  - `limit` (default 20, max 50)
  - opaque `cursor` (base64 of `updated_at:id`)
  - stable order `updated_at DESC, id DESC`
  - response page metadata: `nextCursor`, `hasMore`, `asOf`
  - no `totalCount` in v1.
- Define common response envelope + error model.
- Add OpenAPI lint + validation in CI.

Deliverables:
- versioned `openapi/v1.yaml`
- contract review checklist

## Milestone 3 — Endpoint implementation (Day 3-5)
**Outcome:** functional read API with auth split.

Tasks:
- Implement public read handlers + DB queries.
- Implement `healthz` (liveness only).
- Implement `readyz` dependency checks (DB connectivity, migration state, simple query).
- Implement API-key middleware for protected endpoints (`readyz`, `metrics`) using `x-internal-api-key`.
- Support key rotation via multi-key env (`INTERNAL_API_KEYS=current,next`).
- Add rate limiting for public endpoints.
- Add response caching headers where safe.

Deliverables:
- end-to-end local testable API
- Postman/HTTPie collection for smoke testing

## Milestone 4 — Reliability + observability (Day 5-6)
**Outcome:** practical operational visibility.

Tasks:
- Add structured JSON request logging (Pino) including `request_id` and `trace_id` correlation fields.
- Expose Prometheus metrics (`/metrics`, protected) for latency, error-rate, endpoint hit counts.
- Configure Grafana (Cloud free tier to start) with:
  - Prometheus scrape/ingest for API metrics
  - Loki log ingestion for JSON logs
  - dashboards for p95 latency, 5xx rate, endpoint usage, uptime
- Add uptime monitor checks and wire alerts to Discord `#alerts` (`1473441095475138823`) via webhook.
- Configure alert rules per D-018A (critical + warning thresholds).
- Add runbook docs for common incident scenarios.

Deliverables:
- observability dashboard links
- alert test evidence (intentional fail + recovery)

## Milestone 5 — Compatibility guardrails + CI/CD (Day 6-7)
**Outcome:** safe iteration loop.

Tasks:
- Add OpenAPI diff gate in CI to fail unapproved breaking changes.
- Add integration tests for each endpoint and health behavior.
- Add deploy pipeline for dev + prod.
- Add release/changelog workflow with deprecation annotations (`Deprecation`, `Sunset`).

Deliverables:
- green CI/CD on main
- first tagged release (`v1.0.0`)

## Milestone 6 — Hardening + v1 launch checklist (Day 7)
**Outcome:** confident initial release.

Tasks:
- Validate SLO instrumentation for monthly availability.
- Load-test light traffic profile.
- Validate auth boundaries for protected endpoints.
- Validate pagination and contract examples.
- Write concise “operate this service” notes.

Deliverables:
- launch checklist signed off
- go/no-go summary

---

## Decision-driven implementation rules
- No write endpoints in v1 unless explicitly re-scoped.
- No breaking contract changes inside `/v1`.
- Any potential scope expansion must be logged in `decisions-log.md` first.

## Risks and mitigations
- **Risk:** overbuilding infra before useful API exists.
  - **Mitigation:** ship read endpoints by Milestone 3 before deeper hardening.
- **Risk:** alert noise.
  - **Mitigation:** thresholded alerts + warning vs critical split.
- **Risk:** schema churn.
  - **Mitigation:** keep core tables stable; isolate flexible fields in JSONB.

## Locked implementation choices (for v1)
1. **Hosting:** Railway for app runtime (`staging` + `prod`) using Docker-based deploys.
2. **Region:** EU-first (London preferred, nearest EU fallback).
3. **Database:** Neon Postgres, managed separately from app host.
4. **Monitoring:** Grafana-first (Prometheus metrics + Loki logs + uptime checks + Discord alerting).
5. **Pagination contract:** `/v1/projects` uses cursor pagination on `updated_at DESC, id DESC`; default `limit=20`, max `50`, opaque cursor, no total count in v1. `/v1/now` and `/v1/uses` are snapshot endpoints.
6. **Auth for protected endpoints:** `x-internal-api-key` checked against `INTERNAL_API_KEYS` (multi-key support for rotation).
7. **Tracing posture:** lightweight `request_id`/`trace_id` correlation in v1; full distributed tracing deferred to v1.1.

## Why this stack (short rationale)
- Railway keeps DX high and reduces deployment drag.
- Neon keeps Postgres strong and production-like, with clean migration discipline.
- Grafana aligns with real-world observability practice and keeps future portability.
- Cursor pagination on list-heavy resources teaches stable API contracts without overcomplicating snapshot resources.

## Open questions
- None (all previously open choices are now locked in `decisions-log.md`).

## First execution slice (recommended)
If you want minimal “prove-it” momentum:
1. Milestone 0 + Milestone 1
2. `GET /v1/now` + `GET /healthz`
3. OpenAPI + CI diff guard
4. Add `x-internal-api-key` protection to `readyz` + `metrics`
5. Deploy to Railway `staging` + verify Neon connectivity + alert path to Discord

That gives a meaningful backend loop quickly without waiting for full scope.
