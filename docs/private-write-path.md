# shan-api — Private Write Path (Draft v1)

Status: draft (opinionated first pass)
Date: 2026-02-26
Owner: Shan + Giles

## TL;DR
- Keep **public API read-only**.
- Add an **operator-only write lane via CLI commands** (not HTTP) first.
- Make DB canonical now; keep `shan_site` importer as fallback only.
- Ship posts write flow first, then now/uses/projects updates.

---

## Why this approach
For your use case (single trusted operator, fast iteration, low ceremony), CLI writes beat building full admin HTTP writes right now:
- lower security surface
- faster to build and maintain
- easy to audit in git + terminal history
- avoids premature auth complexity for write endpoints

Public write API can come later if/when there is a real external writer need.

---

## Principles
1. **DB is canonical source of truth.**
2. **No public write endpoints in v1.**
3. **Every write is explicit, validated, and logged.**
4. **Dry-run first, apply second** for batch operations.
5. **Transaction-wrapped writes** to avoid partial state.
6. **Deterministic slug behavior** (no surprise renames).

---

## Proposed write surface (CLI)

Implement under `src/ops/` with `npm run ops:*` scripts.

### Core commands
- `ops:now:set --file <path>`
  - Replaces now narrative + now items snapshot in one transaction.
- `ops:uses:set --file <path>`
  - Replaces uses sections snapshot in one transaction.
- `ops:project:upsert --file <path>`
  - Create/update one project by slug.
- `ops:project:archive --slug <slug>`
  - Sets `is_active=false`.
- `ops:post:create --file <path>`
  - Creates draft/live post row (based on flags).
- `ops:post:update --slug <slug> --file <path>`
  - Updates content/metadata with optimistic check.
- `ops:post:archive --slug <slug>`
  - Sets `is_active=false` (no hard delete).

### Optional flags (all commands)
- `--dry-run`
- `--yes` (skip confirmation)
- `--expected-version <n>` (optimistic concurrency)

---

## Input contracts (opinionated)

### now file format (JSON)
```json
{
  "updatedAt": "2026-02-26T00:00:00.000Z",
  "narrative": "...",
  "items": [
    { "label": "Focus", "text": "...", "href": null }
  ]
}
```

### uses file format (JSON)
```json
{
  "updatedAt": "2026-02-26T00:00:00.000Z",
  "sections": [
    {
      "title": "Dev environment",
      "items": [{ "label": "Editor", "value": "VS Code" }]
    }
  ]
}
```

### post file format (Markdown + frontmatter)
Use the same shape as existing writing markdown for low friction:
```md
---
title: ...
summary: ...
date: "2026-02-26"
updated: "2026-02-26"
tags: [ai, backend]
featured: false
author: Shan
slug: optional-explicit-slug
---

Markdown body...
```

If `slug` omitted, derive from filename.

---

## Metadata + consistency rules

On successful write operations:
- update resource-level meta keys:
  - `now_last_updated`
  - `uses_last_updated`
  - `projects_last_updated`
  - `posts_last_updated`
- update `global_last_updated` to max touched timestamp
- increment `version` only when meaningful changes occur

For snapshot resources (`now`, `uses`):
- write commands are **replace-snapshot semantics**.
- old active rows not present in snapshot become inactive.

For list resources (`projects`, `posts`):
- upsert by slug.
- archive is soft-delete via `is_active=false`.

---

## Safety + auditability

### Required
- zod validation on all command inputs
- transaction per command
- clear summary output:
  - inserted / updated / archived / unchanged
- non-zero exit on any failure

### Strongly recommended next
- add `change_events` table:
  - `id`, `resource_type`, `resource_slug`, `action`, `before_json`, `after_json`, `actor`, `created_at`
- write one event per successful command

---

## Rollout plan (practical)

### Phase 1 (immediate)
1. Add transaction wrapper to importer + write helpers.
2. Build `ops:post:create`, `ops:post:update`, `ops:post:archive`.
3. Build `ops:now:set` and `ops:uses:set`.
4. Add command integration tests.

### Phase 2
1. Add project commands (`upsert`, `archive`).
2. Add optional `change_events` audit table.
3. Add lightweight docs/playbook for daily editing flow.

### Phase 3
1. Stop routine importer usage.
2. Keep importer as emergency bootstrap/backfill only.

---

## What we are explicitly not doing yet
- public write HTTP endpoints
- OAuth/session-based admin panel
- multi-user role model
- rich WYSIWYG CMS

Those can come later if there’s real demand.

---

## Open questions for refinement
1. Do we want explicit `post status` (`draft`/`published`) now, or keep `is_active` only?
2. Should post publish date be immutable after first publish?
3. Do we require `--expected-version` by default for update commands?
4. Should write commands live in this repo or in future `shan-cli`?
