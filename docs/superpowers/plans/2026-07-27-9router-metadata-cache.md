# Implementation Plan: 9router Metadata Cache

> **For implementation agent:** execute tasks in order. Each task ends with a runnable check and commit checkpoint. Do not mutate active OpenCode config after startup.

## Summary

Build route-specific persistent 9router metadata cache. Startup reads cache, uses basic `/v1/models` on empty state, and schedules one stale refresh per process. Refresh calls exact `/v1/models/info?id=...` with concurrency 6, preserves usable data on partial failure, and atomically replaces only validated cache. Add CLI `sync [--force]`, metadata precedence, collision-safe models.dev enrichment, tests, and README documentation.

## Repository facts

- Runtime: Bun preferred; ESM TypeScript, `module: NodeNext`, `strict: true`, `rootDir: src` (`tsconfig.json:2-13`).
- Existing test: `tests/model-mapper.test.ts:1-14` imports `bun:test`; no `package.json` test script (`package.json:27-31`). Run `bun test` directly. Add minimal `"test": "bun test"` only if implementation needs a stable package command; otherwise preserve current setup.
- Build: `bun run build` (`package.json:28`).

## Task 1: Add route URL and cache primitives

**Files:** `src/cache.ts:1-42` (replace models.dev-only cache API with separate named APIs); add `src/route-cache.ts`.

- [ ] Define exported types:

```ts
export type RouteInfo = {
  id: string;
  capabilities?: Record<string, unknown>;
  [key: string]: unknown;
};
export type RouteCache = {
  version: 1;
  baseUrl: string;
  fetchedAt: number;
  list: string[];
  info: Record<string, RouteInfo>;
  fingerprint: string;
};
```

- [ ] Add `normalizeRouteUrl(raw: string): string`: trim, remove trailing `/`, append `/v1` exactly once unless pathname already ends `/v1`; preserve origin/path/query-free route identity. Add `modelsUrl(base) = \`${base}/models\`` and `infoUrl(base,id) = \`${base}/models/info?id=${encodeURIComponent(id)}\``.
- [ ] Keep `src/cache.ts` existing `models.dev.json` behavior unchanged for `src/models-dev.ts`; expose new route-cache storage separately, keyed by stable SHA-256 of normalized base URL (filename contains no API key). Use `os.homedir()/.cache/opencode-9router-plus/routes/`.
- [ ] Validate cache JSON strictly: version `1`, matching normalized `baseUrl`, finite `fetchedAt`, unique non-empty `list`, object `info`, string `fingerprint`; reject malformed records and info entries with mismatched IDs.
- [ ] Implement `readRouteCache(baseUrl): Promise<RouteCache|null>`, `writeRouteCache(cache): Promise<void>`, `isRouteCacheStale(cache, now=Date.now()): boolean`; TTL `24 * 60 * 60 * 1000`.
- [ ] Write through `${file}.${pid}.tmp`, rename to final, remove temp on write failure. Never serialize request headers or API key.
- [ ] Implement deterministic canonical JSON and SHA-256 fingerprint over `{list, info}` only; exclude `fetchedAt`.

**Test:** add `tests/route-cache.test.ts` using `Bun.tmpdir()` or a test-overridable cache directory. Assert URL normalization, encoded IDs, route isolation, schema rejection, 24h boundary, fingerprint stability, and atomic replacement. Test name examples: `normalizes /v1 once`, `does not serialize API key`, `rejects mismatched route`, `keeps old file when replacement validation fails`.

**Command/result:** `bun test tests/route-cache.test.ts` → all route-cache tests pass. `bun run build` → exit 0.

**Commit checkpoint:** `git add src/cache.ts src/route-cache.ts tests/route-cache.test.ts && git commit -m "add route metadata cache primitives"`.

## Task 2: Implement list/info refresh engine

**Files:** add `src/route-sync.ts`; reuse fetch/header logic from `src/index.ts:9-53` only through exported shared helper, no duplicated auth semantics.

- [ ] Define `refreshRouteCache({ baseUrl, apiKey, timeoutMs, previous }): Promise<SyncResult>`.
- [ ] Fetch only normalized `${baseUrl}/models` for refresh. Require valid list IDs, reject malformed list, duplicate IDs, invalid capability types.
- [ ] Fetch `${baseUrl}/models/info?id=${encodeURIComponent(id)}` with worker pool capped at 6; never launch more than six requests concurrently.
- [ ] Treat info HTTP 404 as `skipped404`; preserve prior `info[id]` for timeout/network/non-404 failures and count `preservedFailures`. Successful records replace prior records.
- [ ] Build validated cache and call `writeRouteCache` only after all processing succeeds. If list fails, return failure without writing. Return counts, `replaced`, `fingerprintChanged`, old/new fingerprints, and structured error data without secrets.

**Test:** add `tests/route-sync.test.ts` with mocked `fetch`. Assert first request `/v1/models`, exact info path/query, max concurrency 6 using 13 IDs, 404 skip, failure preservation, invalid list leaves sentinel cache unchanged, valid refresh writes new fingerprint, and API key absent from result/log strings.

**Command/result:** `bun test tests/route-sync.test.ts` → all refresh tests pass; `bun run build` → exit 0.

**Commit checkpoint:** `git add src/route-sync.ts tests/route-sync.test.ts src/cache.ts && git commit -m "add bounded route metadata refresh"`.

## Task 3: Merge metadata into model mapping

**Files:** `src/model-mapper.ts:3-86`; add/extend tests `tests/model-mapper.test.ts:1-14`.

- [ ] Extend `resolveModel(fullId, routeInfo?)`; begin with models.dev exact provider/model lookup, then unique basename only. Make `src/models-dev.ts:76-101` return null for ambiguous basename candidates and never infer provider `cx`; retain exact provider/model match priority.
- [ ] Merge route capabilities after catalog mapping. `vision` maps to existing `attachment`; `tools` to `tool_call`; `reasoning` to `reasoning`; `contextWindow` to `limit.context`; `maxOutput` to `limit.output`.
- [ ] Apply route value when property exists, including `false`; leave catalog value unchanged when absent. Validate numeric limits before applying.
- [ ] Keep `thinking`, `fields`, `options`, `params` internal and omit them from returned OpenCode entry. Preserve variants unchanged; allow only generic compatible `low`, `medium`, `high`, never `fast` or `pro`.

**Test:** add names `explicit false overrides catalog`, `absent capability preserves catalog`, `ambiguous basename returns null`, `does not infer cx`, `does not expose internal fields`, `keeps generic variants allowlist`.

**Command/result:** `bun test tests/model-mapper.test.ts` → existing and new tests pass; `bun run build` → exit 0.

**Commit checkpoint:** `git add src/model-mapper.ts src/models-dev.ts tests/model-mapper.test.ts && git commit -m "merge route metadata with catalog models"`.

## Task 4: Integrate startup cache and notification

**Files:** `src/index.ts:1-106`; add `tests/index.test.ts`.

- [ ] Replace fallback endpoint probing with normalized route cache flow: read route cache before config; empty cache performs basic `/v1/models`; stale cache uses cached list/info immediately and starts one best-effort refresh.
- [ ] Add process-level `let refreshStarted = false`; stale path sets guard before scheduling `void refresh...`; refresh completion never mutates captured `discoveredModels`, provider model entries, or active config.
- [ ] Use cache list/info for `resolveModel`; choose default from startup list. Keep API key only in request/provider options, never cache.
- [ ] Feature-detect `client.tui?.showToast`; call with restart-required message on changed fingerprint. Catch notification errors. Fallback `console.log(JSON.stringify({ event: "9router.metadata.updated", ... }))` with no secret and explicit `restart required`.

**Test:** assert empty startup requests list, fresh cache avoids fetch, stale cache triggers one refresh despite repeated config hook calls, config remains unchanged after refresh, toast path and structured-log fallback both work, and restart text appears.

**Command/result:** `bun test tests/index.test.ts` → all integration tests pass; `bun run build` → exit 0.

**Commit checkpoint:** `git add src/index.ts tests/index.test.ts && git commit -m "use route metadata cache at startup"`.

## Task 5: Add CLI sync command

**Files:** `src/cli.ts:16-63,273-318`; add `tests/cli.test.ts` if CLI helpers are exported or test via subprocess.

- [ ] Extend command union/parser to accept `sync`; parse `--force`; update help usage.
- [ ] Add `sync(args)` using same normalized route, cache, fetch, and refresh engine as startup. Without `--force`, print `no refresh needed` for fresh cache; with `--force`, bypass TTL.
- [ ] Print concise route, listed count, successful info count, skipped 404, preserved failures, replacement, fingerprint change, and restart-required message when changed. Never print API key.
- [ ] On fetch/validation/write failure print `Error: ...`, set non-zero exit, preserve old cache, and avoid config edits. Keep install/check/uninstall behavior unchanged.

**Test:** subprocess tests for `bun run build && bun dist/cli.js sync`, fresh no-op, forced summary, failure exit code and old-cache preservation. If package script is added, use only minimal `"test": "bun test"`; otherwise command remains direct `bun test`.

**Command/result:** `bun test tests/cli.test.ts` → CLI tests pass; `bun run build` → exit 0.

**Commit checkpoint:** `git add src/cli.ts tests/cli.test.ts package.json && git commit -m "add route metadata sync command"`.

## Task 6: Document behavior and run full validation

**Files:** `README.md:9-16,88-103,131-152`; optionally `package.json:27-31` only if justified by Task 5.

- [ ] Document startup cache, 24h stale refresh, route isolation, no API-key persistence, restart-required toast/log, and no post-startup config mutation.
- [ ] Document `opencode-9router-plus sync` and `sync --force`, summary semantics, and failure behavior.
- [ ] Document metadata mapping, explicit-false precedence, models.dev exact/unique-basename rules, and variants non-goal (`fast`/`pro` never exposed).
- [ ] Update development section with actual test command `bun test`; add script only if CLI/package workflow proves it necessary.

**Command/result:** `bun test` → all tests pass; `bun run build` → TypeScript exits 0; `git diff --check` → no whitespace errors.

**Commit checkpoint:** `git add README.md package.json && git commit -m "document route metadata cache"`.

## Final self-review checklist

- [ ] Spec coverage: normalized route, keyed isolated persistent cache, schema validation, atomic write, TTL, fingerprint, list/info concurrency 6, 404 skip, preservation, startup guard, toast/log fallback, CLI sync/force, mapping precedence, models.dev collision safety, variants policy, README, errors, tests, non-goals.
- [ ] No API key in cache, fingerprint, logs, summaries, or notifications.
- [ ] No active config mutation after startup.
- [ ] All imports use `.js` suffix; all new source stays under `src/` for `tsconfig.json`.
- [ ] No placeholders remain; test seams use dependency injection or Bun mocks, not production-only assumptions.
- [ ] Type consistency: cache `info` records carry IDs; `SyncResult` counts are explicit; optional capability fields distinguish absence from `false`.
- [ ] Final commands: `bun test`, `bun run build`, `git diff --check`.
