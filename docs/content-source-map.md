# Content Source Map (bootstrap)

Status: v1 bootstrap reference

Yes — for now, source content lives in the `shan_site` project and should be imported/migrated into `shan-api`.

## Primary source repo
- `/home/shan/giles/shan_site`

## Resource → source mapping (v1)

### `uses`
- Source file: `shan_site/app/content/uses.ts`
- Main exports:
  - `usesSections`
  - `usesLastUpdated`

### `now`
- Source file: `shan_site/app/content/operatorFrontDoor.ts`
- Main exports:
  - `nowFocusNarrative`
  - `nowLogItems`
  - `nowOpenQuestionsAndAsks`
  - `deprioritizedItems`
  - `northStar`
  - `siteLastUpdated`

### `projects`
- Source file: `shan_site/app/content/operatorFrontDoor.ts`
- Main exports:
  - `activeProjects`
  - `aiProjects`
  - `selectedShippedWork`
  - `siteLastUpdated`

### `posts`
- Source path: `shan_site/content/writing/*.md`
- Frontmatter fields consumed:
  - `title`
  - `summary`
  - `date`
  - `updated` (optional)
  - `tags` (optional)
  - `author` (optional)
  - `featured` (optional)
- Slug source:
  - markdown filename without `.md` / `.mdx`

## Migration notes
- Current source is code-first (TypeScript exports), not DB-first.
- For v1 API bootstrap, we should do a one-time seed/import from these files into Postgres.
- After import path is stable, choose one canonical update path to avoid dual-edit drift.
