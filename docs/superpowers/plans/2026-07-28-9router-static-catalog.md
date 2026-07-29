# 9router Static LLM Catalog Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Inject runtime-available 9router LLM routes into OpenCode using reviewed static catalog facts and source picker variants.

**Architecture:** Static catalog owns aliases, static LLM identities, and picker rules. `/v1/models` is final inclusion filter. models.dev enriches only catalog-resolved identity. Detector reports source changes; catalog refresh remains manual.

**Tech Stack:** TypeScript ESM, Bun test, TypeScript compiler, GitHub Actions.

---

## Mandatory Oracle task gate

Before every numbered Task: Oracle approves exact files, API, tests, commands, prior-task evidence, and risk. After every Task: run checks, Oracle completion review, then commit. Re-run Oracle only for contract/scope/provenance change, dependency addition, destructive action, release behavior change, or broader parser.

Every Task starts with Step 0: send Oracle its exact files, API contract, test
matrix, commands, prior-task evidence, and risks; do not edit before approval.

## Task 1: Catalog types and matcher

**Files:** Modify `src/route-types.ts`; create `src/llm-catalog.ts`, `tests/fixtures/9router-llm-catalog.ts`, `tests/llm-catalog.test.ts`.

- [ ] **Step 0: Oracle task gate**

Ask Oracle to approve this Task. Existing `RouteMapSnapshot` and
`RouteModelResolution` must remain until Task 4 migrates their consumers.

- [ ] **Step 1: Write red tests**

```ts
import { describe, expect, test } from "bun:test";
import { matchLlmCatalogRoute, validateLlmCatalog } from "../src/llm-catalog.js";
import { CATALOG_FIXTURE } from "./fixtures/9router-llm-catalog.js";

describe("LLM catalog", () => {
  test("requires immutable provenance and LLM-only models", () => {
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, sourceCommit: "master" })).toThrow();
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, providers: { bad: { id: "bad", catalogKey: "bad", aliases: [], models: [{ id: "image", kind: "image" }] } } })).toThrow();
  });
  test("matches exact route without guessing", () => {
    expect(matchLlmCatalogRoute("cx/gpt-5.6-sol", CATALOG_FIXTURE)).toMatchObject({ providerId: "codex", catalogKey: "cx", modelId: "gpt-5.6-sol" });
    expect(matchLlmCatalogRoute("cx/not-static", CATALOG_FIXTURE)).toBeNull();
  });
  test("validates source and identity uniqueness", () => {
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, sourceFiles: [] })).toThrow();
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, sourceFiles: ["bad.js"] })).toThrow();
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, providers: {
      one: CATALOG_FIXTURE.providers.codex,
      two: { ...CATALOG_FIXTURE.providers["grok-cli"], aliases: ["cx"] },
    }})).toThrow();
  });
  test("uses static provider and model entries exactly", () => {
    const match = matchLlmCatalogRoute("gb/grok-4.5-high", CATALOG_FIXTURE);
    expect(match?.provider).toBe(CATALOG_FIXTURE.providers["grok-cli"]);
    expect(match?.model).toBe(CATALOG_FIXTURE.providers["grok-cli"].models[0]);
    expect(matchLlmCatalogRoute("gcli/grok-4.5-HIGH", CATALOG_FIXTURE)).toBeNull();
    expect(matchLlmCatalogRoute("gcli", CATALOG_FIXTURE)).toBeNull();
    expect(matchLlmCatalogRoute("unknown/grok-4.5-high", CATALOG_FIXTURE)).toBeNull();
  });
});
```

- [ ] **Step 2: Confirm red state**

Run: `bun test tests/llm-catalog.test.ts`

Expected: FAIL; module and fixture absent.

- [ ] **Step 3: Add contract and matcher**

Add alongside old route-map types:

```ts
export type NineRouterModelKind = "llm" | "image" | "tts" | "stt" | "embedding" | "image-to-text" | "web";
export interface StaticLlmModel { id: string; name?: string; kind: "llm"; upstreamModelId?: string; canonicalProvider?: string; canonicalModelId?: string; reasoning?: NineRouterCapabilities; }
export interface StaticLlmProvider { id: string; catalogKey: string; aliases: readonly string[]; models: readonly StaticLlmModel[]; modelsFetcher?: true; passthroughModels?: true; }
export interface NineRouterLlmCatalog { sourceCommit: string; sourceFiles: readonly string[]; providers: Readonly<Record<string, StaticLlmProvider>>; reasoningPicker: { formatLevels: Readonly<Record<string, readonly string[]>>; patternLevels: readonly { pattern: string; levels: readonly string[] }[]; }; }
export interface CatalogRouteMatch { providerId: string; catalogKey: string; modelId: string; canonicalProvider?: string; canonicalModelId?: string; provider: StaticLlmProvider; model: StaticLlmModel; }
```

Implement `validateLlmCatalog()` and `matchLlmCatalogRoute()`. Validate lowercase 40-hex SHA, source files, LLM-only models, conflicting aliases, duplicate IDs. Match only first `/`, provider catalog key/alias, exact model ID. Never use display name, models.dev, or `thinkingFormat`.

Also test and implement: missing/empty source files, an outside-whitelist source
path, duplicate `catalogKey`, duplicate aliases,
duplicate model IDs, provider record key not equal to `provider.id`, alias
matching, route IDs with more than one `/` (model segment remains intact),
unknown provider, missing model segment, exact case-sensitive model ID, and a
display name that must not match an unrelated raw ID.

- [ ] **Step 4: Add fixture and pass**

Fixture: `codex/cx/gpt-5.6-sol`; `grok-cli/gcli`, alias `gb`, `grok-4.5-high`, canonical `xai/grok-4.5`.

Run: `bun test tests/llm-catalog.test.ts`

Expected: PASS.

- [ ] **Step 5: Oracle review and commit**

Run: `bun test tests/llm-catalog.test.ts && bun run build && git diff --check`

After Oracle approval:

```bash
git add src/route-types.ts src/llm-catalog.ts tests/fixtures/9router-llm-catalog.ts tests/llm-catalog.test.ts
git commit -m "feat: add static LLM catalog contract"
```

## Task 2: Reviewed full static LLM snapshot

**Files:** Create `src/generated/9router-llm-catalog.ts`, `docs/upstream/9router-llm-catalog-manifest.md`; modify `tests/llm-catalog.test.ts`.

- [ ] **Step 0: Oracle task gate**

Ask Oracle to approve exact pinned SHA, whitelist, manual-review manifest,
snapshot fields, tests, and the rule that old route-map modules remain until
Task 4.

- [ ] **Step 1: Write red snapshot tests**

```ts
import { NINE_ROUTER_LLM_CATALOG } from "../src/generated/9router-llm-catalog.js";

test("snapshot is LLM-only data from one immutable revision", () => {
  validateLlmCatalog(NINE_ROUTER_LLM_CATALOG);
  expect(NINE_ROUTER_LLM_CATALOG.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
  expect(NINE_ROUTER_LLM_CATALOG.sourceFiles).toContain("open-sse/providers/thinkingLevels.js");
});
test("snapshot provenance is complete and ordered", () => {
  expect(NINE_ROUTER_LLM_CATALOG.sourceFiles).toEqual([...NINE_ROUTER_LLM_CATALOG.sourceFiles].sort());
  expect(Object.keys(NINE_ROUTER_LLM_CATALOG.providers)).toEqual([...Object.keys(NINE_ROUTER_LLM_CATALOG.providers)].sort());
});
```

- [ ] **Step 2: Confirm red state**

Run: `bun test tests/llm-catalog.test.ts`

Expected: FAIL; generated catalog absent.

- [ ] **Step 3: Create manual reviewed data snapshot**

Review one immutable latest `decolua/9router@master` SHA. Extract static data only; never execute source. Whitelist:

```text
open-sse/providers/registry/index.js
open-sse/providers/registry/*.js
open-sse/providers/index.js
open-sse/providers/schema.js
open-sse/providers/models/schema.js
open-sse/providers/models/helpers.js
open-sse/config/providerModels.js
open-sse/providers/thinkingLevels.js
open-sse/providers/capabilities.js
```

`models/helpers.js` derived Codex review models are manually flattened. Exclude
`pricing.js`: matcher behavior is copied as source literal/pattern and Task 3
has its own `*` matcher; `config/providers.js` output is not copied;
`providers/shared.js` is transport/auth-only.

Create `NINE_ROUTER_LLM_CATALOG` with real SHA, exact source paths, all statically declared LLM providers/models, `alias || id`, aliases, source-backed upstream/canonical identities, dynamic flags, reasoning facts, literal `FORMAT_LEVELS`, and source-ordered `PATTERN_THINKING`. Exclude non-LLM, fetched routes, inferred data, and executable expressions.

- [ ] **Step 4: Add manual-review provenance manifest**

Create `docs/upstream/9router-llm-catalog-manifest.md`. It records the exact
40-hex SHA, sorted whitelist, every registry import/provider reviewed, static
LLM provider/model counts, dynamic/passthrough provider list, and unsupported
syntax report. Unsupported syntax matters only in catalog, capability, or
picker fields. A nonempty report or conflicting source fact aborts refresh
before catalog replacement.

Add tests rejecting outside-whitelist/duplicate paths, missing
`thinkingLevels.js` or `capabilities.js`, malformed SHA, duplicate aliases,
and non-LLM entries. Stable source/provider order is mandatory.

- [ ] **Step 5: Add source golden checks**

```ts
expect(matchLlmCatalogRoute("cx/gpt-5.6-sol", NINE_ROUTER_LLM_CATALOG)).toMatchObject({ providerId: "codex", canonicalProvider: "openai", canonicalModelId: "gpt-5.6-sol" });
expect(NINE_ROUTER_LLM_CATALOG.reasoningPicker.patternLevels.find((r) => r.pattern === "*gpt-5.6-sol*")?.levels).toEqual(["none", "minimal", "low", "medium", "high", "xhigh", "max"]);
```

Run: `bun test tests/llm-catalog.test.ts`

Expected: PASS.

- [ ] **Step 6: Oracle review and commit**

Run: `bun test tests/llm-catalog.test.ts && bun test && bun run build && git diff --check`

After Oracle approval:

```bash
git add src/generated/9router-llm-catalog.ts src/route-types.ts src/llm-catalog.ts tests/fixtures/9router-llm-catalog.ts tests/llm-catalog.test.ts
git add -f docs/upstream/9router-llm-catalog-manifest.md
git commit -m "feat: add 9router static LLM catalog snapshot"
```

## Task 3: Source-authoritative reasoning variants

**Files:** Modify `src/capability-resolver.ts`, `tests/capability-resolver.test.ts`.

- [ ] **Step 0: Oracle task gate**

Ask Oracle to approve picker API replacement, `minimal`/`max` policy, test
matrix, and unchanged runtime integration until Task 4.

- [ ] **Step 1: Write red picker tests**

```ts
test("mirrors gpt-5.6-sol picker including max", () => {
  expect(resolveCatalogVariants({ rawModelId: "gpt-5.6-sol", staticCapabilities: { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true }, picker: CATALOG_FIXTURE.reasoningPicker })).toEqual({
    none: { reasoningEffort: "none" }, minimal: { reasoningEffort: "minimal" }, low: { reasoningEffort: "low" }, medium: { reasoningEffort: "medium" }, high: { reasoningEffort: "high" }, xhigh: { reasoningEffort: "xhigh" }, max: { reasoningEffort: "max" },
  });
});
test("non-discrete source levels emit no variants", () => expect(resolveCatalogVariants({ rawModelId: "toggle", staticCapabilities: { reasoning: true, thinkingFormat: "zai" }, picker: { formatLevels: { zai: ["none", "thinking"] }, patternLevels: [] } })).toEqual({}));
```

- [ ] **Step 2: Confirm red state**

Run: `bun test tests/capability-resolver.test.ts`

Expected: FAIL because current resolver has no catalog picker, `minimal`, or `max`.

- [ ] **Step 3: Implement catalog picker resolver**

Export seven-value `ReasoningEffort`, `ModelVariants`, and:

```ts
resolveCatalogVariants({ rawModelId, staticCapabilities, picker }): ModelVariants
```

Require static `reasoning === true`. First matching ordered `patternLevels` wins; match raw model ID case-sensitively with `*` wildcard only. Else use exact `formatLevels[thinkingFormat]`. Retain only `none|minimal|low|medium|high|xhigh|max` in source order, remove `none` only when `thinkingCanDisable === false`, filter `auto|on|off|thinking`, and never read models.dev/runtime `thinkingRange`.

- [ ] **Step 4: Pass edge suite**

Test first-pattern-wins, case sensitivity, unknown format, none removal, no `default`, non-discrete filtering, and distinct `xhigh`/`max` payloads.

Run: `bun test tests/capability-resolver.test.ts`

Expected: PASS.

- [ ] **Step 5: Oracle review and commit**

Run: `bun test tests/capability-resolver.test.ts && bun test && bun run build && git diff --check`

After Oracle approval:

```bash
git add src/capability-resolver.ts tests/capability-resolver.test.ts
git commit -m "feat: mirror 9router reasoning picker variants"
```

## Task 4: Runtime/catalog/models.dev composition

**Files:** Modify `src/index.ts`, `src/model-mapper.ts`, `src/models-dev.ts`, `src/route-types.ts`, `tests/index.test.ts`, `tests/model-mapper.test.ts`, `tests/fixtures/models-dev.ts`; delete `src/generated/9router-route-map.ts`, `src/route-map.ts`, `tests/route-map.test.ts`.

- [ ] **Step 0: Oracle task gate**

Ask Oracle to approve consumer migration, old route-map deletion, runtime kind
precedence, template fallback, models.dev boundary, and integration tests.

- [ ] **Step 1: Write red intersection tests**

Tests prove: runtime Sol injects while snapshot-only Terra does not; Sol with runtime `thinkingRange: null` gets `minimal` and `max`; matched Sol stays injected with missing or conflicting runtime kind; matched non-discrete route has exact `variants: {}`; runtime-only reasoning route is raw template with `variants: {}`; unmatched non-reasoning route omits variants; explicit unmatched runtime `image|tts|stt|embedding|image-to-text|web` route is skipped.

- [ ] **Step 2: Confirm red state**

Run: `bun test tests/index.test.ts tests/model-mapper.test.ts`

Expected: FAIL because mapper uses deleted route map and old resolver.

- [ ] **Step 3: Implement composition**

`index.ts`: retain exact runtime kind, preserve endpoint/auth/timeout order, inject only runtime entries, skip only unmatched explicit non-LLM kinds.

After all imports migrate to `llm-catalog.ts`, delete
`src/generated/9router-route-map.ts`, `src/route-map.ts`, and
`tests/route-map.test.ts` in this Task.

`model-mapper.ts`:

```ts
const match = matchLlmCatalogRoute(fullId, NINE_ROUTER_LLM_CATALOG);
const metadata = match?.canonicalProvider && match.canonicalModelId
  ? await lookupModelsDev(match.canonicalProvider, `${match.canonicalProvider}/${match.canonicalModelId}`)
  : null;
```

Matched route uses provider then model-only models.dev enrichment and snapshot-only `resolveCatalogVariants`. Matched reasoning route with non-discrete result sets `variants: {}`. Unmatched route never calls models.dev; set `variants: {}` only for runtime `capabilities.reasoning === true`. Always preserve raw ID/name. Never set `options.reasoningEffort`.

- [ ] **Step 4: Pass integration suite**

Add provider precedence, model-only fallback, no lookup unmatched, snapshot-only exclusion, raw route key, existing config model/default preservation.

Run: `bun test tests/index.test.ts tests/model-mapper.test.ts`

Expected: PASS.

- [ ] **Step 5: Oracle review and commit**

Run: `bun test tests/index.test.ts tests/model-mapper.test.ts && bun test && bun run build && git diff --check`

After Oracle approval:

```bash
git add src/index.ts src/model-mapper.ts src/models-dev.ts src/route-types.ts tests/index.test.ts tests/model-mapper.test.ts tests/fixtures/models-dev.ts
git rm src/generated/9router-route-map.ts src/route-map.ts tests/route-map.test.ts
git commit -m "feat: intersect runtime models with 9router catalog"
```

## Task 5: Detector and documentation boundary

**Files:** Modify `.github/workflows/watch-9router-upstream.yml`, `docs/upstream/9router-change-report.md`, `README.md`; create `docs/upstream/9router-llm-catalog-refresh.md`, `scripts/render-9router-upstream-report.sh`, `tests/watch-9router-upstream.test.ts`, `tests/fixtures/9router-compare.json`, `tests/fixtures/9router-change-report.md`.

- [ ] **Step 0: Oracle task gate**

Ask Oracle to approve exact workflow/report/runbook changes. Approved spec and
plan are immutable in this Task.

- [ ] **Step 1: Narrow detector report**

Keep schedule/manual trigger. Changed-SHA report must show prior/current SHA and only these paths:

```text
open-sse/providers/registry/index.js
open-sse/providers/registry/*.js
open-sse/providers/index.js
open-sse/providers/schema.js
open-sse/providers/models/schema.js
open-sse/providers/models/helpers.js
open-sse/config/providerModels.js
open-sse/providers/thinkingLevels.js
open-sse/providers/capabilities.js
```

Keep `add-paths: docs/upstream/9router-change-report.md`. No blob fetch,
catalog write, tag, release, publish, or main write.

- [ ] **Step 2: Extract deterministic report renderer**

Create executable `scripts/render-9router-upstream-report.sh`. Arguments:

```text
--previous <40-hex SHA>
--current <40-hex SHA>
--compare <local JSON path>
--output <local Markdown path>
```

It validates SHA values, filters compare files to the whitelist above, and
writes old/new SHA, filtered paths, and report-only notice. It must not call
`gh`, `curl`, `git`, or modify any path except `--output`. Equal SHA exits zero
without rewriting output. Workflow obtains JSON with `gh api`, then calls this
renderer.

- [ ] **Step 3: Add detector tests**

Create compare/checkpoint fixtures and `tests/watch-9router-upstream.test.ts`.
Use temporary output and no network. Test equal SHA leaves report bytes
unchanged; changed SHA reports a whitelisted fixture path but excludes an
unrelated fixture path; workflow contains `schedule`, `workflow_dispatch`,
renderer invocation, exact `add-paths`, only `contents: write` and
`pull-requests: write`, and no `src/generated/9router-llm-catalog.ts` write
path or `bun install`.

Run: `bun test tests/watch-9router-upstream.test.ts`

Expected: PASS.

- [ ] **Step 4: Document behavior**

README states `/v1/models` controls listing; catalog adds reviewed semantics; models.dev enriches only; dynamic route remains template; default sends no effort; discrete variants mirror source; detector report never refreshes catalog automatically.

Create `docs/upstream/9router-llm-catalog-refresh.md`: manual refresh accepts
one explicit 40-hex SHA, reviews manifest, updates only catalog/manifest/tests,
runs `bun test` and `bun run build`, and opens a separate reviewed PR. Failed
review leaves committed snapshot unchanged.

- [ ] **Step 5: Validate**

Run:

```bash
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/watch-9router-upstream.yml")'
git diff --check
bun test tests/watch-9router-upstream.test.ts
bun test
bun run build
```

Expected: all pass.

- [ ] **Step 6: Oracle review and commit**

Freeze diff, rerun `git diff --check`, then give Oracle changed paths, workflow
diff, static assertions, YAML parse, test/build outputs. After approval:

```bash
git add .github/workflows/watch-9router-upstream.yml README.md docs/upstream/9router-llm-catalog-refresh.md scripts/render-9router-upstream-report.sh tests/watch-9router-upstream.test.ts tests/fixtures/9router-compare.json tests/fixtures/9router-change-report.md
git add -f docs/upstream/9router-change-report.md
git commit -m "docs: describe 9router LLM catalog refresh"
```

## Plan self-review

- Tasks run catalog contract, reviewed snapshot, picker, runtime composition, then detector/docs.
- Each task has Oracle approval before work and Oracle completion review before commit.
- No task executes 9router source, fetches GitHub at runtime, adds non-LLM models, or auto-applies upstream changes.
