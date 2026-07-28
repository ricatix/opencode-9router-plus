# 9router Metadata Cache Design

- Date: 2026-07-27
- Status: approved design; implementation intentionally not included

## Scope and impacted modules

- `src/index.ts`: startup route discovery, cache read/use, stale refresh scheduling, toast/log notification, and immutable startup config injection.
- `src/cache.ts`: route-scoped persistent cache schema, validation, fingerprint handling, and atomic replacement. Existing models.dev cache storage must remain separate.
- `src/model-mapper.ts`: map 9router metadata into supported OpenCode fields; preserve variants policy and internal-only metadata.
- `src/models-dev.ts`: retain safe best-effort enrichment lookup behavior.
- `src/cli.ts`: add `opencode-9router-plus sync [--force]` and sync summary; retain existing config diagnostics.
- `package.json`: only if CLI command/build wiring needs metadata; no dependency change expected.

## Approved behavior

### Startup

Plugin reads route-specific persistent cache before model configuration. Cache key is normalized base URL; cache never stores API key. Cache record contains `fetchedAt`, model `list`, successful `info` records, and `fingerprint`.

Empty or missing cache uses basic `GET /v1/models` discovery. (Configured `OPENCODE_9ROUTER_URL` is treated as base route root; endpoint joining must avoid duplicate `/v1`.) Startup injects models once. Active config is never mutated after startup.

Cache older than 24 hours triggers exactly one best-effort background refresh per process. Refresh does not block startup and does not alter active config. Process-level guard prevents duplicate refreshes.

### Refresh

Refresh first gets `GET /v1/models`. Then fetches exact `GET /v1/models/info?id=...` for listed IDs, with bounded concurrency of 6. URL query values must be encoded. HTTP 404 on an info request is skipped. Other per-model failures preserve usable existing cache records. Refresh replaces cache only after complete payload validation; replacement is atomic (temporary file then rename). Failed or invalid refresh leaves prior cache untouched.

A changed metadata fingerprint emits `client.tui.showToast` when feature detection finds callable client support. Toast message states restart required. If unavailable, emit structured log with event/name, old and new fingerprints, and restart-required message. Notification failure must not fail refresh.

`opencode-9router-plus sync [--force]` forces refresh for configured route. Without `--force`, command may use fresh cache and reports no refresh needed; `--force` bypasses TTL. CLI prints concise summary: route, listed models, successful info count, skipped 404 count, preserved failures, cache replacement status, fingerprint change, and restart required when changed. CLI errors return non-zero without deleting cache.

## Metadata mapping

Map 9router capabilities:

- `vision` → supported OpenCode modality/attachment representation used by current schema.
- `tools` → `tool_call`.
- `reasoning` → `reasoning`.
- `contextWindow` → `limit.context`.
- `maxOutput` → `limit.output`.

Explicit `false` from 9router overrides catalog-derived value. Absent capability does not override catalog value. Mapping must distinguish absent from false; do not use truthiness checks.

Keep `thinking`, `fields`, `options`, and `params` internal. Variants stay unchanged: only generic compatible `low`, `medium`, and `high`; never expose `fast`, `pro`, or other provider-specific variants.

`models.dev` remains safe best-effort enrichment: exact provider/model match first, then unique basename. Never infer `cx` provider from an ambiguous or basename-only match.

## Errors and safety

- Treat malformed JSON, wrong shapes, missing IDs, duplicate IDs, invalid capability types, timeout, network errors, and non-404 HTTP errors as refresh failures.
- Preserve last valid route cache on all failed refresh paths.
- Never log or include API key in cache, fingerprints, summaries, errors, or notifications.
- Fingerprint deterministic canonical metadata, excluding secrets and volatile timestamps.
- Validate route identity and cache schema before use; ignore corrupt/unrelated cache.
- Atomic writes must clean temporary files on failure where possible.

## Test targets

Add focused tests (framework choice follows repository conventions) for:

1. Empty cache basic `/v1/models` startup.
2. Fresh cache startup and stale-cache one-refresh-per-process guard.
3. Exact info URL/query, concurrency ceiling 6, 404 skip, non-404 preservation.
4. Invalid/partial refresh leaves old cache; valid refresh atomically replaces it.
5. Route isolation by base URL and absence of API key in serialized cache/logs.
6. Stable fingerprint and changed-fingerprint toast detection plus structured-log fallback.
7. Capability mapping, explicit false precedence, absent-field preservation.
8. Variants allowlist and internal field non-exposure.
9. models.dev exact provider/model, unique basename, ambiguous basename, and no `cx` inference.
10. CLI `sync` default, `--force`, summary, and non-zero failure behavior.

## Non-goals

- No post-startup active config mutation or hot model reload.
- No API key persistence, cache sharing across routes, or cache encryption redesign.
- No new provider-specific variant taxonomy.
- No broad models.dev behavior rewrite or mandatory external metadata availability.
- No changes to chat request routing, authentication, or unrelated CLI install/uninstall behavior.

## Self-review

- Resolved: map `vision` to existing OpenCode `attachment` representation; do not add a new modality field.
- Resolved: normalize base URL by stripping trailing slashes; accept configured URLs whose root already ends in `/v1`, otherwise append `/v1` exactly once.
- Ambiguity resolved: stale refresh preserves old cache while startup uses stale records; replacement happens only after valid refresh.
- Ambiguity resolved: 404 applies only to individual info calls; list failure is whole-refresh failure.
- Consistency check: fingerprint excludes `fetchedAt`; notifications never alter config; CLI sync may write cache but cannot mutate running OpenCode config.
- Review result: design names exact source modules, separates route metadata cache from existing `models.dev` cache, and covers failure, test, and non-goal boundaries. No source changes made.
