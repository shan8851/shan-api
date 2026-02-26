# shan-api — Decisions Log

Status: active
Date started: 2026-02-25
Owner: Shan + Giles

Purpose: lock decisions as they are made so implementation can move fast without losing context.

## Entry template

Use this shape for new entries:

- **Decision ID:** D-XXX
- **Status:** proposed | decided | deferred | superseded
- **Date:** YYYY-MM-DD
- **Owner:** name
- **Context:** what problem/choice exists
- **Options considered:** short list
- **Decision:** chosen option
- **Consequences:** trade-offs, follow-ups
- **Revisit trigger:** when to reopen

---

## Decisions

### D-001 — Product intent
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** clarify what success means for this project.
- **Options considered:** reuse-first, learning-first, both.
- **Decision:** both are equally important: backend learning depth + reusable API for multiple UIs.
- **Consequences:** design should teach real backend patterns while staying practical for consumption.
- **Revisit trigger:** if one goal starts materially blocking the other.

### D-002 — Source of truth (v1)
- **Status:** decided (provisional)
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** choose where content data lives in v1.
- **Options considered:** files, DB, hybrid.
- **Decision:** lean DB-backed from the start (key/value-heavy), with easy editability.
- **Consequences:** requires schema + migration discipline early; enables pagination and growth.
- **Revisit trigger:** if DB overhead slows iteration too much in early build.

### D-003 — Content lifecycle states
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** whether to support draft/published/archived in v1.
- **Options considered:** lifecycle states now vs defer.
- **Decision:** defer lifecycle states; no draft/published workflow needed in v1.
- **Consequences:** simpler write model now, fewer state bugs.
- **Revisit trigger:** if multi-writer or publish workflows become necessary.

### D-004 — Data richness + freshness metadata
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** how much data each resource should expose.
- **Options considered:** minimal metadata vs richer payloads.
- **Decision:** include as much useful info as practical; blogs should include metadata + content; include per-record `updatedAt` and global `lastUpdated` signal.
- **Consequences:** stronger consumer utility; clearer cache invalidation.
- **Revisit trigger:** if payload size or latency becomes problematic.

### D-005 — Auth and public exposure
- **Status:** decided (provisional)
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** exposure model for endpoints.
- **Options considered:** fully public, fully token-gated, mixed.
- **Decision:** mixed model: public read for most endpoints with sensible rate limits; keep simple auth on 1–2 endpoints as a learning path.
- **Consequences:** need endpoint-level auth policy and abuse/rate-limit controls.
- **Revisit trigger:** if abuse risk appears or auth complexity outweighs benefit.

### D-006 — Deployment trade-off posture
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** optimize for cost vs DX vs ops quality.
- **Options considered:** cheapest, DX-first, observability-first.
- **Decision:** balanced approach: good DX + reasonable ops without overpaying.
- **Consequences:** platform choice should be justified by practical trade-offs, not dogma.
- **Revisit trigger:** if costs spike or deployment friction slows progress.

### D-007 — Observability + alerting baseline
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** what to monitor first.
- **Options considered:** minimal uptime only vs broader telemetry.
- **Decision:** uptime/failure is top priority; include logs, latency, error-rate, and endpoint usage telemetry; alert to Discord.
- **Consequences:** must define initial thresholds + channel routing.
- **Revisit trigger:** alert fatigue or missing incident signal.

### D-008 — Health endpoint scope
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** meaning of health in v1.
- **Options considered:** process-only vs dependency-aware checks.
- **Decision:** `health` should answer process liveness only (“is API alive”). Public status page deferred.
- **Consequences:** simple, reliable liveness; deeper readiness/dependency checks can come later.
- **Revisit trigger:** if dependency failures aren’t visible quickly enough.

### D-009 — CLI direction
- **Status:** decided (deferred for build)
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** whether CLI is in v1 scope.
- **Options considered:** include now vs later.
- **Decision:** CLI comes later, as a separate package/service: `shan-cli`; support table + JSON output and command/args style.
- **Consequences:** keep API clean now, design endpoints with future CLI ergonomics in mind.
- **Revisit trigger:** when API v1 is stable enough for consumer tooling.

### D-010 — Consumer integration stance
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** whether to optimize for `shan_site` migration now.
- **Options considered:** integrate immediately vs standalone focus.
- **Decision:** treat `shan-api` as standalone for now; do not optimize for `shan_site` or other consumers yet.
- **Consequences:** faster focus, less migration drag during v1.
- **Revisit trigger:** once core API is stable and ready for first consumer migration.

### D-011 — Write permissions
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** who can write/update content.
- **Options considered:** single-writer vs multi-writer.
- **Decision:** Shan-only writes; keep API read-only in v1 (possibly long-term).
- **Consequences:** write-path complexity deferred; lower security surface in v1.
- **Revisit trigger:** if team workflows or automation require write APIs.

### D-012 — Explicit learning targets
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** what skills this project should sharpen.
- **Options considered:** broad learning vs explicit focus.
- **Decision:** prioritize API design, CI/CD, versioning, health, and observability.
- **Consequences:** implementation plan should map milestones directly to these skills.
- **Revisit trigger:** if plan drifts toward low-learning busywork.

### D-013 — Non-goals (v1)
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** guardrails against scope creep.
- **Options considered:** include advanced platform features now vs defer.
- **Decision:** keep current non-goals list from discovery doc; v1 stays simple/read-focused but future-friendly.
- **Consequences:** avoid accidental platform-building in early phase.
- **Revisit trigger:** only after v1 reliability + contract goals are met.

### D-014 — v1 resource scope
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** what resources launch in v1.
- **Options considered:** broad content coverage vs narrow initial slice.
- **Decision:** v1 starts with `uses`, `projects`, and `now` only (small scope). `blogs` and broader homepage content are later.
- **Consequences:** faster path to useful API with lower complexity.
- **Revisit trigger:** after stable delivery of initial resources.

### D-015 — DB/storage technology + schema strategy
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** lock concrete storage choice and schema approach for v1.
- **Options considered:** SQLite, Postgres, document store, file-backed content.
- **Decision:** use **Postgres** (managed, e.g. Neon/Supabase) with migration-driven schema management (Drizzle).
- **Consequences:** stronger backend learning and production-like reliability; requires migration discipline from day one.
- **Revisit trigger:** if ops overhead materially slows iteration in early phase.

#### D-015A — Schema shape details
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** avoid either over-normalizing or dumping everything into one JSON blob.
- **Options considered:** single generic key-value table, resource-specific tables, hybrid with JSONB adjunct fields.
- **Decision:** resource-specific tables for `uses`, `projects`, `now_entries` with shared metadata columns (`id`, `slug`, `updated_at`, `version`, `is_active`); use JSONB only for flexible nested fields. Include a small `meta` table for global freshness (`last_updated`).
- **Consequences:** clean query model + pagination readiness without losing flexibility.
- **Revisit trigger:** if repeated schema churn suggests a better hybrid abstraction.

### D-016 — Versioning, compatibility, and deprecation policy
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** define exact API evolution rules before implementation.
- **Options considered:** implicit versioning, date-based versions, URL major versioning.
- **Decision:** major version in URL (`/v1`). Within v1, changes must be additive only (no field removals/renames/type changes). Any breaking change requires `/v2`.
- **Consequences:** safer consumer upgrades and clearer contract boundaries.
- **Revisit trigger:** if consumer ecosystem or release cadence suggests alternative strategy.

#### D-016A — Deprecation mechanics
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** define how long old behavior remains supported and how consumers are warned.
- **Options considered:** informal deprecation, immediate removals, fixed deprecation window.
- **Decision:** minimum **60-day** deprecation window for planned removals/behavior changes, with changelog entry and response headers (`Deprecation`, `Sunset`) on affected endpoints.
- **Consequences:** predictable migration path with explicit signals.
- **Revisit trigger:** if future release tempo warrants shorter/longer windows.

#### D-016B — Contract enforcement in CI
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** prevent accidental breakage slipping into main.
- **Options considered:** manual review only vs automated OpenAPI diff checks.
- **Decision:** add OpenAPI diff check in CI; fail pipeline on unapproved breaking changes to current major.
- **Consequences:** stronger guardrail with low ongoing effort.
- **Revisit trigger:** if tooling noise creates false positives.

### D-017 — Endpoint-level auth matrix (v1)
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** apply mixed auth model without overcomplicating public read use-cases.
- **Options considered:** all public, all protected, mixed by endpoint role.
- **Decision:**
  - **Public:** `GET /v1/uses`, `GET /v1/projects`, `GET /v1/now`, `GET /v1/meta/last-updated`, `GET /healthz`
  - **Protected (API key):** `GET /readyz`, `GET /metrics`
- **Consequences:** public consumption stays frictionless while still exercising auth and protecting internals.
- **Revisit trigger:** if abuse patterns appear or additional protected endpoints become necessary.

### D-018 — Initial SLO + alert thresholds + destination
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** define reliability target and practical alert posture for v1.
- **Options considered:** no formal SLO, aggressive enterprise SLO, pragmatic starter SLO.
- **Decision:** set **99.0% monthly availability SLO** for v1.
- **Consequences:** clear target without premature over-optimization.
- **Revisit trigger:** once traffic/criticality rises enough to justify tighter SLO.

#### D-018A — Alert policy
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** avoid alert spam while still catching meaningful incidents.
- **Options considered:** immediate single-failure paging vs thresholded incident alerts.
- **Decision:**
  - **Destination channel:** Discord `#alerts` (`1473441095475138823`)
  - **Critical alerts:**
    - uptime check fails 3 consecutive runs (1-minute cadence)
    - 5xx rate > 5% for 5 minutes (with minimum request volume)
    - `/readyz` failing continuously for > 3 minutes
  - **Warning alerts:**
    - p95 latency > 1.2s for 10 minutes
    - 5xx rate > 1% for 15 minutes
- **Consequences:** good signal-to-noise for early operations.
- **Revisit trigger:** if alert fatigue or missed incidents show threshold mismatch.

### D-019 — `/readyz` dependency checks in v1
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** decide whether readiness should be separate from liveness in first release.
- **Options considered:** health-only endpoint vs split liveness/readiness endpoints.
- **Decision:** keep a separate `/readyz` in v1 with dependency checks (DB reachability, migration state, basic query path), while `/healthz` remains process liveness only.
- **Consequences:** stronger deployment/ops behavior with clear semantics.
- **Revisit trigger:** if architecture changes make readiness checks materially different.

### D-020 — Hosting platform + environment strategy
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** choose host platform for v1 that balances speed and production realism.
- **Options considered:** Railway, Render, Fly, Workers.
- **Decision:** host API on **Railway** with two remote environments (`staging`, `prod`) plus local `dev`.
- **Consequences:** fast DX and simple deploy loop while preserving real deployment discipline.
- **Revisit trigger:** if scaling, cost, or platform constraints become a blocker.

#### D-020A — DB hosting detail
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** pick concrete managed Postgres provider for v1.
- **Options considered:** Railway Postgres, Neon, Supabase Postgres.
- **Decision:** use **Neon Postgres** for managed DB.
- **Consequences:** clean Postgres workflow and migration discipline with good dev/prod separation.
- **Revisit trigger:** if cost/perf/network ergonomics become problematic.

### D-021 — Monitoring stack/tooling detail
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** choose concrete telemetry stack implementing D-018A.
- **Options considered:** provider-native only, Better Stack, Grafana stack, mixed.
- **Decision:** use **Grafana-first stack**:
  - Prometheus metrics from protected `/metrics`
  - Loki-backed structured logs
  - uptime checks
  - Discord alerts to `#alerts` via webhook
  - start with Grafana Cloud free tier for speed, keep setup compatible with OSS/self-hosted Grafana later
- **Consequences:** practical observability learning without heavy ops burden in v1.
- **Revisit trigger:** if free-tier limits or complexity reduce signal quality.

### D-022 — Pagination contract (v1 list endpoints)
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** lock deterministic pagination semantics before implementation.
- **Options considered:** offset pagination, cursor pagination with varying sort fields.
- **Decision:**
  - `GET /v1/projects` uses cursor pagination:
    - stable sort: `updated_at DESC, id DESC`
    - `limit` default `20`, max `50`
    - opaque base64 cursor from `updated_at:id`
    - response metadata includes `nextCursor`, `hasMore`, and `asOf`
    - no `totalCount` in v1
  - `GET /v1/now` is snapshot (non-paginated)
  - `GET /v1/uses` is snapshot (non-paginated)
- **Consequences:** pagination complexity is focused where it adds value, while snapshot resources stay simple and explicit.
- **Revisit trigger:** if UX requires totals or alternate sort modes.

### D-023 — Auth mechanism for protected endpoints
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** keep auth pragmatic for low-criticality protected endpoints (`/readyz`, `/metrics`) without overengineering.
- **Options considered:** full OAuth/JWT, mTLS, static API keys.
- **Decision:** static internal API keys in request header `x-internal-api-key` for protected endpoints only.
  - `/healthz` remains public.
  - `/readyz` and `/metrics` require key match.
  - keys are environment-specific and stored in Railway secrets.
  - support key rotation via `INTERNAL_API_KEYS` (comma-separated active keys, e.g. current + next).
- **Consequences:** minimal implementation complexity with realistic operational hygiene.
- **Revisit trigger:** if protected surface expands beyond low-risk operational endpoints.

#### D-023A — Rotation/storage policy
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** define practical secret handling without auth sprawl.
- **Options considered:** ad-hoc manual key replacement vs dual-key overlap policy.
- **Decision:** quarterly rotation target (or immediate on suspected leak) using dual-key overlap:
  1) add new key as secondary,
  2) update clients/monitors,
  3) remove old key.
  Keys are never committed and only stored in Railway secret manager (plus local `.env` for dev).
- **Consequences:** predictable low-friction rotation process.
- **Revisit trigger:** if rotation burden increases or more consumers need scoped credentials.

### D-024 — Initial hosting region
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** choose first production geography for latency/reliability alignment.
- **Options considered:** US region, EU region, multi-region.
- **Decision:** start in **EU region** (prefer London if available; otherwise nearest EU region).
- **Consequences:** best latency fit for Shan’s primary working region without multi-region overhead.
- **Revisit trigger:** if audience distribution or reliability needs require multi-region.

### D-025 — Tracing posture (v1)
- **Status:** decided
- **Date:** 2026-02-25
- **Owner:** Shan
- **Context:** determine whether full distributed tracing belongs in first release.
- **Options considered:** full Tempo tracing in v1, no tracing signals, lightweight trace IDs now + full tracing later.
- **Decision:** v1 includes lightweight request correlation only (`request_id` + `trace_id` in logs/response headers); full Tempo/distributed tracing is deferred to v1.1.
- **Consequences:** preserves debugging quality now without delaying delivery.
- **Revisit trigger:** if incident debugging proves log correlation insufficient.

### D-026 — Posts resource added to v1 scope
- **Status:** decided
- **Date:** 2026-02-26
- **Owner:** Shan
- **Context:** expand content coverage after stabilizing initial read API foundations.
- **Options considered:** keep posts deferred, add posts now.
- **Decision:** add posts in v1 with:
  - `GET /v1/posts` (cursor paginated metadata list)
  - `GET /v1/posts/:slug` (full markdown body detail)
- **Consequences:** broader immediate API utility while keeping write-path deferred.
- **Revisit trigger:** if payload/performance or moderation requirements require splitting public metadata vs private body content.

### D-027 — Bootstrap import policy
- **Status:** decided
- **Date:** 2026-02-26
- **Owner:** Shan
- **Context:** define short-term role of `shan_site` import after read API is live.
- **Options considered:** keep long-term dual-source flow, one-time bootstrap then DB-canonical.
- **Decision:** `shan_site` importer is bootstrap/backfill only; Postgres is canonical for ongoing operation. Private write path will replace routine importer dependence.
- **Consequences:** clear migration direction and reduced long-term source-of-truth ambiguity.
- **Revisit trigger:** if operational reality requires periodic markdown-to-db sync for external contributors.

---

## Open follow-ups (not locked yet)
- None blocking. Active execution priorities are tracked in `docs/next-steps.md`.
