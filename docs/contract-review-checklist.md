# Contract Review Checklist

Use this checklist before merging changes to `openapi/v1.yaml`.

- [ ] No breaking changes introduced within `/v1`.
- [ ] Changes are additive-only for v1 (no removals/renames/type changes).
- [ ] Auth scope is unchanged (`/readyz` and `/metrics` protected by `x-internal-api-key`; public endpoints remain public).
- [ ] Pagination semantics are unchanged (`/v1/projects` cursor-paginated).
- [ ] Snapshot semantics are unchanged (`/v1/now` and `/v1/uses` non-paginated).
- [ ] Error response shapes remain stable (`401` unauthorized and `400` error object on invalid cursor/query).
- [ ] `openapi:lint`, `openapi:validate`, and `openapi:check-breaking` pass.
