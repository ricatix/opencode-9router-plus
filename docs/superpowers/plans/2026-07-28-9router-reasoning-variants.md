# 9router Reasoning Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tampilkan varian reasoning-effort aman, per route-model 9router, dalam picker OpenCode tanpa memaksa effort pada varian `default`.

**Architecture:** Discovery 9router mempertahankan objek model serta capability-nya. Resolver murni memisahkan identitas route, canonical model/provider, metadata models.dev provider-specific/model-only, lalu menghitung variants aman. Snapshot route map yang dikomit dipakai runtime bersama models.dev cache. Workflow detector hanya mendeteksi revisi upstream dan membuka/memperbarui PR laporan; workflow tidak pernah membuat, mengedit, atau memvalidasi `src/generated/9router-route-map.ts`, tidak mengambil blob/source, dan tidak menurunkan mapping.

**Tech Stack:** TypeScript ESM, Bun built-in test runner, TypeScript compiler, GitHub Actions, GitHub REST API.

---

## Mandatory Oracle task gate

Before starting each numbered Task, request one Oracle review with:

1. Task goal, target files, proposed tests, and exact task steps.
2. Evidence from completed prior task: changed paths, focused test/build output, and relevant diff.
3. Risks, requirement conflicts, or simpler alternative discovered.

Proceed through every checkbox within that Task only after Oracle explicitly approves the Task. If implementation reveals a requirement conflict, scope change, destructive action, dependency addition, or release action, pause and request a fresh Oracle review before continuing. User approval remains required for scope changes, destructive actions, dependency additions, and releases.

## File structure

- Modify: `src/cache.ts` — cache TTL/atomic write generik berdasarkan nama catalog.
- Modify: `src/models-dev.ts` — cache/load `api.json` provider map dan `models.json` flat canonical-ref map; lookup provider-aware tanpa flat collision.
- Create: `src/route-types.ts` — type data discovery dan route capability bersama.
- Create: `src/route-map.ts` — resolver `routeId` ke canonical provider/model memakai snapshot.
- Create: `src/capability-resolver.ts` — fungsi murni variants reasoning aman.
- Create: `src/generated/9router-route-map.ts` — snapshot kecil, dikomit.
- Modify: `src/model-mapper.ts` — pilih metadata canonical dan inject `variants`.
- Modify: `src/index.ts` — pertahankan objek discovery dan teruskan context ke mapper.
- Create: `tests/fixtures/models-dev.ts` — payload catalog kecil dan discovery entries.
- Create: `tests/models-dev.test.ts` — provider boundary, fallback unik, cache catalog.
- Create: `tests/route-map.test.ts` — canonicalisasi route dan invariants snapshot.
- Create: `tests/capability-resolver.test.ts` — matrix safe variants.
- Create: `tests/model-mapper.test.ts` — mapper menggabungkan metadata/variants.
- Create: `tests/index.test.ts` — discovery object dan config injection.
- Create: `.github/workflows/watch-9router-upstream.yml` — detector revisi harian/manual yang membuka/memperbarui PR laporan saja.
- Create: `docs/upstream/9router-change-report.md` — checkpoint revisi dan laporan perubahan upstream.
- Modify: `README.md` — perilaku picker dan batas aman.

## Task 1: Shared types and safe route snapshot

**Files:**
- Create: `src/route-types.ts`
- Create: `src/generated/9router-route-map.ts`
- Create: `src/route-map.ts`
- Test: `tests/route-map.test.ts`

- [ ] **Step 1: Write failing route resolver tests**

```ts
import { describe, expect, test } from "bun:test";
import { resolveRouteModel, validateRouteMapSnapshot } from "../src/route-map.js";
import { ROUTE_MAP_SNAPSHOT } from "../src/generated/9router-route-map.js";

describe("resolveRouteModel", () => {
  test("normalizes Codex review alias", () => {
    expect(resolveRouteModel("cx/gpt-5.6-sol-review", ROUTE_MAP_SNAPSHOT)).toEqual({
      routeAlias: "cx",
      routeModelId: "gpt-5.6-sol-review",
      canonicalProvider: "openai",
      canonicalModelId: "gpt-5.6-sol",
    });
  });

  test("normalizes Grok quality alias", () => {
    expect(resolveRouteModel("gcli/grok-4.5-high", ROUTE_MAP_SNAPSHOT)).toMatchObject({
      canonicalProvider: "xai",
      canonicalModelId: "grok-4.5",
    });
  });

  test("does not guess opaque routes", () => {
    expect(resolveRouteModel("openai-compatible-team/private-model", ROUTE_MAP_SNAPSHOT)).toEqual({
      routeAlias: "openai-compatible-team",
      routeModelId: "private-model",
    });
  });

  test("rejects empty generated snapshots", () => {
    expect(() => validateRouteMapSnapshot({ sourceCommit: "", directProviders: [] })).toThrow();
  });
});
```

- [ ] **Step 2: Run route tests; confirm missing modules fail**

Run: `bun test tests/route-map.test.ts`

Expected: FAIL with missing `src/route-map.ts` or `src/generated/9router-route-map.ts`.

- [ ] **Step 3: Add shared types and minimal checked-in snapshot**

Create `src/route-types.ts`:

```ts
export interface NineRouterCapabilities {
  reasoning?: boolean;
  thinkingFormat?: string | null;
  thinkingCanDisable?: boolean;
  thinkingRange?: unknown;
}

export interface NineRouterDiscoveryEntry {
  id: string;
  name?: string;
  capabilities?: NineRouterCapabilities;
}

export interface RouteModelResolution {
  routeAlias: string;
  routeModelId: string;
  canonicalProvider?: string;
  canonicalModelId?: string;
}

export interface RouteMapSnapshot {
  sourceCommit: string;
  directProviders: readonly string[];
  aliases: Readonly<Record<string, string>>;
  providerRules: Readonly<Record<string, string>>;
  suffixRules: Readonly<Record<string, readonly string[]>>;
  wrapperRules: Readonly<Record<string, { prefix: string; providerAliases?: Readonly<Record<string, string>> }>>;
  prefixRules: Readonly<Record<string, string>>;
  upstreamModels: Readonly<Record<string, string>>;
}
```

Create `src/generated/9router-route-map.ts` with provenance and minimum rules required by tests. Use the known 9router `master` revision captured during planning: `79918c7830695bbca4a45c9fea4a42c3e9fd73d1`.

```ts
import type { RouteMapSnapshot } from "../route-types.js";

export const ROUTE_MAP_SNAPSHOT: RouteMapSnapshot = {
  sourceCommit: "79918c7830695bbca4a45c9fea4a42c3e9fd73d1",
  directProviders: ["openai", "openrouter", "anthropic", "google", "azure", "mistral", "deepseek", "zai", "zhipuai", "xai", "groq", "cohere", "perplexity", "minimax", "stepfun", "hunyuan", "nvidia", "togetherai", "deepinfra", "cerebras", "featherless", "chutes"],
  aliases: { cx: "codex", gcli: "grok-cli", gb: "grok-cli", bb: "blackbox" },
  providerRules: { codex: "openai", "grok-cli": "xai" },
  suffixRules: { codex: ["-review"], "grok-cli": ["-high", "-medium", "-low"], deepseek: ["-none", "-max"] },
  wrapperRules: { blackbox: { prefix: "blackboxai/", providerAliases: { "x-ai": "xai" } } },
  prefixRules: { "deepseek-": "deepseek", "kimi-": "moonshot", "qwen": "qwen", "glm-": "zhipuai", "minimax-": "minimax" },
  upstreamModels: {},
};
```

- [ ] **Step 4: Implement route resolver without provider guesses**

Create `src/route-map.ts`. Export:

```ts
export function validateRouteMapSnapshot(snapshot: unknown): asserts snapshot is RouteMapSnapshot;
export function resolveRouteModel(routeId: string, snapshot: RouteMapSnapshot): RouteModelResolution;
```

Implementation order:

1. Split only first `/`; invalid/no-slash values return `{ routeAlias: "", routeModelId: routeId }`.
2. Reject `openai-compatible-*`, `anthropic-compatible-*`, `local`, and `passthrough` aliases before applying provider-specific rules.
3. Convert alias to route provider through `aliases`; prefer `providerRules[routeProvider]` as canonical provider, then use direct provider route alias as canonical provider.
4. Prefer exact `upstreamModels[routeId]`; parse scoped wrapper IDs only for declared `wrapperRules`.
5. Apply only suffixes declared for route provider, then strong prefix rule.
6. Return route identity even if canonical fields remain absent.

Never examine `thinkingFormat` in this module.

- [ ] **Step 5: Run route tests; confirm pass**

Run: `bun test tests/route-map.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit route mapping boundary**

```bash
git add src/route-types.ts src/route-map.ts src/generated/9router-route-map.ts tests/route-map.test.ts docs/superpowers/plans/2026-07-28-9router-reasoning-variants.md
git commit -m "feat: add 9router route resolver"
```

## Task 2: Provider-aware models.dev catalogs

**Files:**
- Modify: `src/cache.ts`
- Modify: `src/models-dev.ts`
- Create: `tests/fixtures/models-dev.ts`
- Test: `tests/models-dev.test.ts`
- Test: `tests/cache.test.ts`

- [x] **Step 1: Write failing catalog lookup tests**

```ts
import { describe, expect, test } from "bun:test";
import { createModelsDevLookup } from "../src/models-dev.js";
import { apiCatalog, modelCatalog } from "./fixtures/models-dev.js";

const lookup = createModelsDevLookup(apiCatalog, modelCatalog);

describe("models.dev lookup", () => {
  test("uses canonical provider entry before model-only metadata", () => {
    expect(lookup.lookup("openai", "gpt-5.6-sol").providerModel?.reasoning_options).toEqual([
      { type: "effort", values: ["none", "low", "medium", "high", "xhigh", "max"] },
    ]);
  });

  test("keeps provider collisions isolated", () => {
    expect(lookup.lookup("provider-a", "shared-model").providerModel?.name).toBe("Provider A Shared");
    expect(lookup.lookup("provider-b", "shared-model").providerModel?.name).toBe("Provider B Shared");
    expect(lookup.lookup(undefined, "shared-model").providerModel).toBeNull();
  });

  test("uses model-only catalog only for canonical model key", () => {
    expect(lookup.lookup(undefined, "openai/gpt-5.6-sol").modelOnly?.id).toBe("openai/gpt-5.6-sol");
  });
});
```

- [x] **Step 2: Run models.dev tests; confirm failure**

Run: `bun test tests/models-dev.test.ts`

Expected: FAIL because `createModelsDevLookup` does not exist.

- [x] **Step 3: Make cache catalog-specific while preserving atomic semantics**

Replace single-purpose cache API in `src/cache.ts` with:

```ts
export type CacheName = "models-dev-api" | "models-dev-models";
export async function readCache(name: CacheName): Promise<unknown | null>;
export async function writeCache(name: CacheName, data: unknown): Promise<void>;
export async function getCacheAge(name?: CacheName): Promise<{ exists: boolean; ageMs?: number }>;
```

Map names to `models.dev.api.json` and `models.dev.models.json` inside existing `~/.cache/opencode-9router-plus`. Retain 24-hour TTL, `mkdir`, temp-file write, and `rename`. Keep `getCacheAge()` defaulting to `models-dev-api` so current CLI output stays compatible.

Add `tests/cache.test.ts` with an injected temporary cache directory seam. It must assert that writing `models-dev-api` never changes `models-dev-models`, `getCacheAge()` without an argument reads the API catalog file, and an entry older than 24 hours returns `null`. Temporary output names must include the catalog name, for example `.models.dev.api.${process.pid}.tmp` and `.models.dev.models.${process.pid}.tmp`, so concurrent catalog writes cannot collide.

- [x] **Step 4: Replace lossy models.dev index with two catalog loaders**

In `src/models-dev.ts`:

1. Add `ReasoningOption`:

```ts
export interface ReasoningOption {
  type: string;
  values: string[];
}
```

2. Add `reasoning_options?: ReasoningOption[]` to `ModelsDevModel`.
3. Add URLs `https://models.dev/api.json` and `https://models.dev/models.json`.
4. Export pure `createModelsDevLookup(apiCatalog, modelCatalog)` with `.lookup(provider, canonicalModelRef)`.
5. Export async `lookupModelsDev(provider, canonicalModelRef)` that loads each catalog lazily and returns:

```ts
export interface ModelsDevLookup {
  providerModel: ModelsDevModel | null;
  modelOnly: ModelsDevModel | null;
}
```

`models.json` is `Record<string, ModelsDevModel>` keyed by canonical ref. Model-only lookup is exact `modelsJson[canonicalRef]`, for example `modelsJson["openai/gpt-5.6-sol"]`; it never falls back to basename matching. Split `canonicalModelRef` once at its first slash into `canonicalProvider` and `localModelId`; reject an unscoped value for model-only lookup. Provider lookup uses `apiJson[provider].models` and probes `localModelId` (`gpt-5.6-sol`) then the full canonical ref (`openai/gpt-5.6-sol`). Never construct `${provider}/${canonicalModelRef}`; it can produce `openai/openai/gpt-5.6-sol`. Do not use current dash/dot fuzzy fallback for reasoning options.

Export a test-only reset seam so fixture tests never fetch network data:

```ts
export function resetModelsDevCatalogsForTest(): void;
```

It clears module-local catalog promises/maps only. Production code must not call it.

Keep a temporary compatibility export until Task 4 rewires the mapper:

```ts
export async function lookupModel(modelName: string): Promise<ModelsDevModel | null>;
```

It may use existing legacy fuzzy lookup against `api.json` only for current display metadata. It must not provide `reasoning_options`, provider-aware resolution, or a new last-write-wins path. Legacy compatibility contract: an ID present under exactly one provider retains its metadata; an ID present under two or more providers is tombstoned and returns `null`, permanently for that catalog build, including later occurrences. Preserve dash insertion and dot-to-dash normalization. Remove it only in Task 4 after `src/model-mapper.ts` uses `lookupModelsDev`.

- [x] **Step 5: Add fixture payloads and run tests**

`tests/fixtures/models-dev.ts` must include:

- OpenAI provider entry keyed `gpt-5.6-sol` with full effort list.
- OpenRouter provider entry keyed `openai/gpt-5.6-sol`.
- Model-only entry keyed `openai/gpt-5.6-sol`.
- Two provider collisions for `shared-model`.

Run: `bun test tests/models-dev.test.ts`

Expected: PASS.

Run: `bun test tests/models-dev.test.ts tests/cache.test.ts && bun run build`

Expected: PASS. The build proves compatibility `lookupModel` keeps current `src/model-mapper.ts` valid until Task 4.

### Task 2 corrective verification

- Mock `globalThis.fetch`; call `resetModelsDevCatalogsForTest()` before and after each legacy lookup test. No live network or cache fixture.
- Verify two-provider collision returns `null`; unique ID returns metadata; third collision remains `null`; reversed provider order remains `null`.
- Verify legacy dash/dot normalization still resolves a unique ID.
- Run `bun test tests/models-dev.test.ts`, `bun test`, and `bun run build`.

- [x] **Step 6: Commit provider-aware metadata layer**

```bash
git add src/cache.ts src/models-dev.ts tests/fixtures/models-dev.ts tests/models-dev.test.ts tests/cache.test.ts docs/superpowers/plans/2026-07-28-9router-reasoning-variants.md
git commit -m "feat: preserve models.dev provider metadata"
```

## Task 3: Pure safe reasoning variant resolver

**Files:**
- Create: `src/capability-resolver.ts`
- Test: `tests/capability-resolver.test.ts`

- [ ] **Step 1: Write failing capability matrix tests**

```ts
import { describe, expect, test } from "bun:test";
import { resolveReasoningVariants } from "../src/capability-resolver.js";

const efforts = [{ type: "effort", values: ["none", "low", "medium", "high", "xhigh", "max"] }];

describe("resolveReasoningVariants", () => {
  test("keeps default untouched and never emits max", () => {
    const variants = resolveReasoningVariants({
      capabilities: { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true },
      reasoningOptions: efforts,
    });
    expect(variants).toEqual({
      none: { reasoningEffort: "none" }, low: { reasoningEffort: "low" },
      medium: { reasoningEffort: "medium" }, high: { reasoningEffort: "high" },
    });
    expect(variants).not.toHaveProperty("default");
    expect(variants).not.toHaveProperty("max");
  });

  test("does not add none without disable proof", () => {
    expect(resolveReasoningVariants({ capabilities: { reasoning: true, thinkingFormat: "openai" } })).not.toHaveProperty("none");
  });

  test("omits adaptive and non-reasoning models", () => {
    expect(resolveReasoningVariants({ capabilities: { reasoning: true, thinkingFormat: "minimax" } })).toEqual({});
    expect(resolveReasoningVariants({ capabilities: { reasoning: false } })).toEqual({});
  });

  test("adds xhigh only with explicit non-lossy route evidence", () => {
    expect(resolveReasoningVariants({
      capabilities: { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingRange: { values: ["xhigh"] } },
      reasoningOptions: efforts,
    })).toHaveProperty("xhigh", { reasoningEffort: "xhigh" });
  });
});
```

- [ ] **Step 2: Run capability tests; confirm failure**

Run: `bun test tests/capability-resolver.test.ts`

Expected: FAIL with missing module.

- [ ] **Step 3: Implement exact safe baseline**

Create `src/capability-resolver.ts` exporting:

```ts
export type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh";
export type ModelVariants = Partial<Record<ReasoningEffort, { reasoningEffort: ReasoningEffort }>>;
export function resolveReasoningVariants(input: {
  capabilities: NineRouterCapabilities | undefined;
  reasoningOptions?: ReasoningOption[];
}): ModelVariants;
```

Rules:

- return `{}` unless `capabilities?.reasoning === true`.
- format `adaptive`, `claude-adaptive`, `minimax`, or on/off-only signal returns `{}`.
- OpenAI: `low`, `medium`, `high`; prepend `none` only with `thinkingCanDisable === true`.
- Gemini: same baseline; `none` only with disable proof.
- DeepSeek: emit only values explicitly listed by both route evidence and `reasoning_options`; no inferred low/medium aliases.
- unknown format: `low`, `medium`, `high`.
- intersect candidates with explicit models.dev effort values when supplied.
- `xhigh` requires explicit models.dev effort plus route evidence that exact `xhigh` is non-lossy. For this version, recognize only an object/array `thinkingRange` containing literal `xhigh`.
- remove `max` unconditionally.

- [ ] **Step 4: Run capability tests; confirm pass**

Run: `bun test tests/capability-resolver.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit capability policy**

```bash
git add src/capability-resolver.ts tests/capability-resolver.test.ts
git commit -m "feat: resolve safe reasoning variants"
```

## Task 4: Mapper and discovery integration

**Files:**
- Modify: `src/model-mapper.ts`
- Modify: `src/index.ts`
- Test: `tests/model-mapper.test.ts`
- Test: `tests/index.test.ts`

- [ ] **Step 1: Write failing mapper and discovery tests**

`tests/model-mapper.test.ts` must assert:

```ts
const entry = await resolveModel("cx/gpt-5.6-sol", {
  id: "cx/gpt-5.6-sol",
  capabilities: { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true },
});
expect(entry.id).toBe("cx/gpt-5.6-sol");
expect(entry.name).toBe("cx/gpt-5.6-sol");
expect(entry.variants?.none).toEqual({ reasoningEffort: "none" });
expect(entry.variants).not.toHaveProperty("max");
```

Before this call, install fixture catalogs through a test-only dependency seam. Change the mapper API to accept optional dependencies:

```ts
export interface ModelMapperDependencies {
  lookupModelsDev?: typeof lookupModelsDev;
  resolveRouteModel?: typeof resolveRouteModel;
}
export async function resolveModel(
  fullId: string,
  discovery?: NineRouterDiscoveryEntry,
  dependencies?: ModelMapperDependencies,
): Promise<OpenCodeModelEntry>;
```

Tests pass fixture implementations for `lookupModelsDev` and `resolveRouteModel`; production omits `dependencies`. This prevents unit tests from fetching models.dev.

`tests/index.test.ts` must mock `fetch` with `{ data: [{ id: "cx/gpt-5.6-sol", capabilities: { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true } }] }`, invoke plugin config hook, then assert:

```ts
expect(cfg.provider["9router"].models["cx/gpt-5.6-sol"].variants?.high).toEqual({ reasoningEffort: "high" });
expect(cfg.provider["9router"].models["cx/gpt-5.6-sol"].options?.reasoningEffort).toBeUndefined();
expect(cfg.model).toBe("9router/cx/gpt-5.6-sol");
```

- [ ] **Step 2: Run integration tests; confirm failure**

Run: `bun test tests/model-mapper.test.ts tests/index.test.ts`

Expected: FAIL because mapper takes only `fullId` and discovery returns strings.

- [ ] **Step 3: Extend mapper with route context**

In `src/model-mapper.ts`:

1. Add `variants?: ModelVariants` to `OpenCodeModelEntry`.
2. Change signature to:

```ts
export async function resolveModel(
  fullId: string,
  discovery?: NineRouterDiscoveryEntry,
  dependencies?: ModelMapperDependencies,
): Promise<OpenCodeModelEntry>
```

3. Call `resolveRouteModel(fullId, ROUTE_MAP_SNAPSHOT)`.
4. Use `lookupModelsDev(resolution.canonicalProvider, resolution.canonicalModelId ?? getModelsDevLookupName(fullId))`.
5. Prefer `providerModel`, then `modelOnly`, then `TEMPLATE` for legacy metadata.
6. Set `entry.variants = variants` only when `Object.keys(variants).length > 0`.
7. Always restore `entry.id = fullId` and `entry.name = fullId`.

Do not set `options.reasoningEffort`, do not add `default`, and do not change existing template defaults.

- [ ] **Step 4: Retain discovery objects in `src/index.ts`**

Replace string extraction with exported helpers:

```ts
export function extractDiscoveryEntries(json: unknown): NineRouterDiscoveryEntry[];
export async function listModels(baseUrl: string, timeoutMs: number, apiKey: string): Promise<NineRouterDiscoveryEntry[]>;
export function pickDefaultModel(entries: NineRouterDiscoveryEntry[]): string | null;
```

Normalize scalar items to `{ id: String(value) }`; object entries require nonempty `id` or `name` and retain `capabilities` unchanged. During config injection use:

```ts
for (const model of discoveredModels) {
  if (!cfg.provider["9router"].models[model.id]) {
    cfg.provider["9router"].models[model.id] = await resolveModel(model.id, model);
  }
}
```

Keep endpoint fallback order, authentication, timeout, provider npm package, existing model entries, and default model selection behavior.

- [ ] **Step 5: Run focused integration tests**

Run: `bun test tests/model-mapper.test.ts tests/index.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit runtime integration**

```bash
git add src/model-mapper.ts src/index.ts tests/model-mapper.test.ts tests/index.test.ts
git commit -m "feat: inject 9router reasoning variants"
```

## Task 5: Detector workflow for upstream changes

**Files:**
- Create: `.github/workflows/watch-9router-upstream.yml`
- Create: `docs/upstream/9router-change-report.md`

- [ ] **Step 1: Add daily/manual detector workflow**

Create a workflow with cron `17 4 * * *`, `workflow_dispatch`, a concurrency group, 10-minute job limit, `contents` and `pull-requests` write permissions, and no direct `main` update. It checks the report checkpoint revision through `gh api`. If unchanged, it exits without a PR. If changed, it calls only GitHub's compare endpoint and uses `jq` to render changed-path summaries and first commit lines into the report.

The workflow PR may modify only `docs/upstream/9router-change-report.md` through `add-paths`. It must never generate, edit, or validate `src/generated/9router-route-map.ts`; fetch blobs/source; derive mappings; run Bun, install, test, or build; use `curl`, ETag/cache, or release changes. Compare failure must fail the job and must not advance the checkpoint.

- [ ] **Step 2: Validate workflow syntax**

Run native YAML validation when available without installing dependencies.

- [ ] **Step 3: Commit detector workflow**

```bash
git add .github/workflows/watch-9router-upstream.yml docs/upstream/9router-change-report.md
git commit -m "ci: watch 9router upstream"
```

## Task 6: Documentation and release-safe verification

**Files:**
- Modify: `README.md`
- Test: all tests

- [ ] **Step 1: Document user-visible variants and safety contract**

Add README section after model discovery documentation:

```md
## Reasoning variants

For 9router models whose `/models` capability explicitly sets `reasoning: true`, the plugin can add model-picker variants. `default` sends no forced reasoning effort. Variant availability is route- and model-specific.

The plugin never exposes `max`. It exposes `none` only when the route confirms thinking can be disabled, and exposes `xhigh` only when both route metadata and models.dev show it is non-lossy. No inference request is sent to determine variants.

Route mapping is a committed snapshot. A daily/manual GitHub Actions detector reports upstream revision changes in a PR. Runtime never fetches 9router source or GitHub.
```

- [ ] **Step 2: Document maintainer refresh behavior**

Add README maintainer note: workflow detects upstream revision changes through GitHub APIs and opens/updates a report-only PR. It never fetches source/blobs, derives mappings, generates/edits/validates the route-map snapshot, or runs tests/build. Merge does not publish because release remains tag-triggered.

- [ ] **Step 3: Run full verification**

Run: `bun test && bun run build`

Expected: PASS.

Manual metadata-only check:

```bash
curl "$OPENCODE_9ROUTER_URL/models"
```

Expected: model list response. Do not send inference requests.

- [ ] **Step 4: Inspect final diff and commit docs**

```bash
git diff --check
git status --short
git add README.md
git commit -m "docs: explain reasoning variants"
```

## Final acceptance checklist

- [ ] `/v1/models` discovery retains capability objects.
- [ ] `default` does not force `reasoningEffort`.
- [ ] Only selected variants carry `{ reasoningEffort: value }`.
- [ ] `max` never appears.
- [ ] `none` and `xhigh` require explicit evidence.
- [ ] Provider-specific models.dev lookup never uses last-write-wins collision behavior.
- [ ] `thinkingFormat` is never used as provider identity.
- [ ] Ambiguous/custom routes do not receive guessed provider-specific metadata.
- [ ] Runtime performs no GitHub/source fetch and no inference probe.
- [ ] Detector workflow compares one upstream revision, opens/updates report PR, never pushes `main`.
- [ ] Detector never generates, edits, or validates `src/generated/9router-route-map.ts`; never fetches blobs/source; never derives mappings.
- [ ] `bun test` and `bun run build` pass.
