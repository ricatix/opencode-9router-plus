# 9router Reasoning Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tampilkan varian reasoning-effort aman, per route-model 9router, dalam picker OpenCode tanpa memaksa effort pada varian `default`.

**Architecture:** Discovery 9router mempertahankan objek model serta capability-nya. Resolver murni memisahkan identitas route, canonical model/provider, metadata models.dev provider-specific/model-only, lalu menghitung variants aman. Snapshot route map digenerate di CI dari source 9router yang di-whitelist; runtime hanya memakai snapshot yang sudah dikomit dan models.dev cache.

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
- Create: `src/generated/9router-route-map.ts` — output generator kecil, dikomit.
- Modify: `src/model-mapper.ts` — pilih metadata canonical dan inject `variants`.
- Modify: `src/index.ts` — pertahankan objek discovery dan teruskan context ke mapper.
- Create: `scripts/generate-route-map.ts` — parser text-only source 9router menjadi snapshot.
- Create: `tests/fixtures/models-dev.ts` — payload catalog kecil dan discovery entries.
- Create: `tests/models-dev.test.ts` — provider boundary, fallback unik, cache catalog.
- Create: `tests/route-map.test.ts` — canonicalisasi route dan invariants snapshot.
- Create: `tests/capability-resolver.test.ts` — matrix safe variants.
- Create: `tests/model-mapper.test.ts` — mapper menggabungkan metadata/variants.
- Create: `tests/index.test.ts` — discovery object dan config injection.
- Modify: `package.json` — script `test` dan `generate:route-map`.
- Create: `.github/workflows/refresh-route-map.yml` — refresh snapshot harian/manual lewat bot PR.
- Modify: `README.md` — perilaku picker, batas aman, dan refresh snapshot.

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

- [ ] **Step 1: Write failing catalog lookup tests**

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

  test("does not choose a last-write-wins provider collision", () => {
    expect(lookup.lookup(undefined, "shared-model").modelOnly).toBeNull();
  });

  test("uses model-only catalog only for canonical model key", () => {
    expect(lookup.lookup(undefined, "openai/gpt-5.6-sol").modelOnly?.id).toBe("openai/gpt-5.6-sol");
  });
});
```

- [ ] **Step 2: Run models.dev tests; confirm failure**

Run: `bun test tests/models-dev.test.ts`

Expected: FAIL because `createModelsDevLookup` does not exist.

- [ ] **Step 3: Make cache catalog-specific while preserving atomic semantics**

Replace single-purpose cache API in `src/cache.ts` with:

```ts
export type CacheName = "models-dev-api" | "models-dev-models";
export async function readCache(name: CacheName): Promise<unknown | null>;
export async function writeCache(name: CacheName, data: unknown): Promise<void>;
export async function getCacheAge(name?: CacheName): Promise<{ exists: boolean; ageMs?: number }>;
```

Map names to `models.dev.api.json` and `models.dev.models.json` inside existing `~/.cache/opencode-9router-plus`. Retain 24-hour TTL, `mkdir`, temp-file write, and `rename`. Keep `getCacheAge()` defaulting to `models-dev-api` so current CLI output stays compatible.

- [ ] **Step 4: Replace lossy models.dev index with two catalog loaders**

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
4. Export pure `createModelsDevLookup(apiCatalog, modelCatalog)` with `.lookup(provider, canonicalModelId)`.
5. Export async `lookupModelsDev(provider, canonicalModelId)` that loads each catalog lazily and returns:

```ts
export interface ModelsDevLookup {
  providerModel: ModelsDevModel | null;
  modelOnly: ModelsDevModel | null;
}
```

`models.json` is `Record<string, ModelsDevModel>` keyed by canonical ref. Model-only lookup is exact `modelsJson[canonicalRef]`, for example `modelsJson["openai/gpt-5.6-sol"]`; it never falls back to basename matching. Provider lookup uses `apiJson[provider].models` and probes two candidates in order: canonical model local key (`gpt-5.6-sol`), then full canonical ref (`openai/gpt-5.6-sol`). Do not use current dash/dot fuzzy fallback for reasoning options.

Export a test-only reset seam so fixture tests never fetch network data:

```ts
export function resetModelsDevCatalogsForTest(): void;
```

It clears module-local catalog promises/maps only. Production code must not call it.

- [ ] **Step 5: Add fixture payloads and run tests**

`tests/fixtures/models-dev.ts` must include:

- OpenAI provider entry keyed `gpt-5.6-sol` with full effort list.
- OpenRouter provider entry keyed `openai/gpt-5.6-sol`.
- Model-only entry keyed `openai/gpt-5.6-sol`.
- Two provider collisions for `shared-model`.

Run: `bun test tests/models-dev.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit provider-aware metadata layer**

```bash
git add src/cache.ts src/models-dev.ts tests/fixtures/models-dev.ts tests/models-dev.test.ts
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

## Task 5: Route-map generator and protected refresh workflow

**Files:**
- Create: `scripts/generate-route-map.ts`
- Modify: `package.json`
- Create: `.github/workflows/refresh-route-map.yml`
- Test: `tests/route-map.test.ts`

- [ ] **Step 1: Extend tests for generated snapshot invariants**

Add tests that invoke exported generator helpers using fixture source strings. Assert:

```ts
expect(snapshot.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
expect(snapshot.directProviders.length).toBeGreaterThan(10);
expect(Object.keys(snapshot.aliases)).toContain("cx");
expect(() => validateRouteMapSnapshot({ ...snapshot, directProviders: [] })).toThrow();
```

- [ ] **Step 2: Run generator invariant tests; confirm failure**

Run: `bun test tests/route-map.test.ts`

Expected: FAIL because generator helpers do not exist.

- [ ] **Step 3: Implement text-only route-map generator**

Create `scripts/generate-route-map.ts` with exports:

```ts
export function generateRouteMap(sourceCommit: string, files: ReadonlyMap<string, string>): RouteMapSnapshot;
export function renderRouteMap(snapshot: RouteMapSnapshot): string;
```

Wrap CLI execution in an ESM entrypoint guard so `tests/route-map.test.ts` can import these helpers without writing files:

```ts
if (import.meta.main) {
  await main(process.argv.slice(2));
}
```

The CLI portion accepts `--commit <sha> --input <directory> --output src/generated/9router-route-map.ts`. It must:

1. Read only whitelist paths matching `open-sse/providers/registry/*.js`, `open-sse/config/providerModels.js`, and `src/shared/constants/providers.js`.
2. Extract literal `id`, `alias`, `aliases`, `upstreamModelId`, and suffix/prefix rules with constrained regex or TypeScript AST parsing.
3. Never import, evaluate, or execute fetched JavaScript.
4. Reject empty input, non-40-hex commit, no direct providers, missing `cx`, or a generated direct-provider count less than half of currently committed snapshot.
5. Write output atomically and render only data literals plus a type import.

- [ ] **Step 4: Add Bun scripts**

Modify `package.json` scripts:

```json
"test": "bun test",
"generate:route-map": "bun scripts/generate-route-map.ts"
```

Keep `prepublishOnly` unchanged because npm invokes it during publishing.

- [ ] **Step 5: Add daily/manual GitHub workflow**

Create `.github/workflows/refresh-route-map.yml`:

```yaml
name: Refresh 9router route map

on:
  schedule:
    - cron: "17 4 * * *"
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - name: Restore commit ETag
        uses: actions/cache/restore@v4
        with:
          path: .tmp/route-map-etag
          key: route-map-etag-restore-${{ github.run_id }}
          restore-keys: route-map-etag-
      - name: Resolve one upstream revision conditionally
        id: revision
        run: |
          etag_file=.tmp/route-map-etag/commit.etag
          mkdir -p "$(dirname "$etag_file")"
          header=()
          if test -s "$etag_file"; then
            header=(-H "If-None-Match: $(cat "$etag_file")")
          fi
          status="$(curl -sS -D .tmp/route-map-headers -o .tmp/route-map-commit.json -w '%{http_code}' \
            -H "Authorization: Bearer $GH_TOKEN" \
            -H "Accept: application/vnd.github+json" \
            "${header[@]}" \
            https://api.github.com/repos/decolua/9router/commits/master)"
          if test "$status" = 304; then
            printf 'unchanged=true\n' >> "$GITHUB_OUTPUT"
            exit 0
          fi
          test "$status" = 200
          sha="$(jq -r .sha .tmp/route-map-commit.json)"
          test -n "$sha"
          printf 'sha=%s\n' "$sha" >> "$GITHUB_OUTPUT"
          awk 'BEGIN{IGNORECASE=1} /^etag:/{sub(/^[^:]*:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit}' .tmp/route-map-headers > "$etag_file"
        env:
          GH_TOKEN: ${{ github.token }}
      - name: Save commit ETag
        if: steps.revision.outputs.unchanged != 'true'
        uses: actions/cache/save@v4
        with:
          path: .tmp/route-map-etag
          key: route-map-etag-${{ steps.revision.outputs.sha }}
      - name: Fetch whitelisted source at revision
        if: steps.revision.outputs.unchanged != 'true'
        run: ./scripts/fetch-route-map-source.sh "${{ steps.revision.outputs.sha }}" .tmp/9router
        env:
          GH_TOKEN: ${{ github.token }}
      - if: steps.revision.outputs.unchanged != 'true'
        run: bun run generate:route-map -- --commit "${{ steps.revision.outputs.sha }}" --input .tmp/9router --output src/generated/9router-route-map.ts
      - if: steps.revision.outputs.unchanged != 'true'
        run: bun test
      - if: steps.revision.outputs.unchanged != 'true'
        run: bun run build
      - uses: peter-evans/create-pull-request@v7
        if: steps.revision.outputs.unchanged != 'true'
        with:
          branch: bot/refresh-9router-route-map
          title: "chore: refresh 9router route mapping"
          commit-message: "chore: refresh 9router route mapping"
          body: "Automated snapshot refresh from decolua/9router at ${{ steps.revision.outputs.sha }}."
```

Create `scripts/fetch-route-map-source.sh` in same task:

```bash
#!/usr/bin/env bash
set -euo pipefail

sha="$1"
out="$2"
repo="decolua/9router"
mkdir -p "$out/open-sse/providers/registry" "$out/open-sse/config" "$out/src/shared/constants"

tree="$(gh api "repos/$repo/git/trees/$sha?recursive=1")"
paths="$(jq -r '.tree[].path | select(. == "open-sse/config/providerModels.js" or . == "src/shared/constants/providers.js" or startswith("open-sse/providers/registry/")) | select(endswith(".js"))' <<<"$tree")"
test -n "$paths"

while IFS= read -r path; do
  target="$out/$path"
  mkdir -p "$(dirname "$target")"
  gh api "repos/$repo/contents/$path?ref=$sha" --jq .content | base64 --decode > "$target"
done <<<"$paths"

test -s "$out/open-sse/config/providerModels.js"
test -s "$out/src/shared/constants/providers.js"
test -n "$(printf '%s\n' "$paths" | grep '^open-sse/providers/registry/')"
```

The workflow persists only the commit endpoint ETag in Actions cache. A `304` ends the job. The generated snapshot retains authoritative `sourceCommit`; a changed revision fetches all whitelisted files at that one SHA using the script above. Do not use raw GitHub URLs or execute downloaded files.

- [ ] **Step 6: Run generator and full checks locally**

Run: `bun test && bun run build`

Expected: PASS.

- [ ] **Step 7: Commit generator and CI automation**

```bash
git add scripts/generate-route-map.ts scripts/fetch-route-map-source.sh package.json .github/workflows/refresh-route-map.yml src/generated/9router-route-map.ts tests/route-map.test.ts
git commit -m "ci: refresh 9router route mapping"
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

Route mapping is a committed snapshot refreshed by a daily/manual GitHub Actions workflow. Runtime never fetches 9router source or GitHub.
```

- [ ] **Step 2: Document maintainer refresh behavior**

Add README maintainer note: workflow watches only registry files, `providerModels.js`, and provider constants; generator parses source as text/AST; tests/build gate a bot PR; merge does not publish because release remains tag-triggered.

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
- [ ] Snapshot workflow uses one source revision, validates output, opens/updates PR, never pushes `main`.
- [ ] `bun test` and `bun run build` pass.
