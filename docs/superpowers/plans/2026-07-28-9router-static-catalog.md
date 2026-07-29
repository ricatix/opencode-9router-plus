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
`RouteModelResolution` must remain until Task 5 migrates their consumers.

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

## Task 2: Bounded local offline AST extractor

**Files:** Create `scripts/extract-9router-llm-catalog.ts`,
`tests/extract-9router-llm-catalog.test.ts`, `tests/fixtures/9router-extractor/`;
modify `package.json` with exact script
`"extract:9router-catalog": "bun scripts/extract-9router-llm-catalog.ts"`.
Fixtures are synthetic minimum files only: registry index, literal provider,
Codex helper/provider, Grok config/provider, picker/capability, and rejected
syntax cases; never a full checkout. No generated
catalog, manifest, runtime, consumer, or route-map files.

- [ ] **Step 0: Oracle task gate**

Ask Oracle to approve pinned source, CLI, AST contract, whitelist, diagnostics,
candidate path, test matrix, commands, and rule that old route maps remain
until Task 5.

- [ ] **Step 1: Write red extractor tests**

Test exported `PINNED_9ROUTER_COMMIT`,
`extractCatalog({sourceDir}): Promise<ExtractCatalogResult>`,
`renderCatalogModule(result): string`, and
`writeCatalogAtomically(outputPath, contents): Promise<void>`. Test accepted
literals, reviewed static refs/imported constants, statically-resolvable spreads,
Codex review flattening,
`GROK_CLI_MODEL`, Grok reasoning gate, deterministic atomic candidate output,
and exact count checks. Reject calls, computed properties, unsupported imports
or identifiers, unknown forms, dynamic construction, conflicting facts,
outside-whitelist reads, wrong SHA, dirty whitelist path, and count mismatches.
Test atomic prior-output preservation and temporary-file cleanup. Require useful
`file:line:column` diagnostics with AST form and rejected field.

- [ ] **Step 2: Confirm red state**

Run: `bun test tests/extract-9router-llm-catalog.test.ts`

Expected: FAIL; extractor absent.

- [ ] **Step 3: Implement bounded extractor**

Input is local pinned `decolua/9router@79918c7830695bbca4a45c9fea4a42c3e9fd73d1`.
CLI accepts exactly `--source-dir <local pinned directory>` and `--output
<candidate path>`; no source-commit override. Export `PINNED_9ROUTER_COMMIT`,
`extractCatalog`, `renderCatalogModule`, and `writeCatalogAtomically`; result
has catalog/diagnostics/counts. Verify local Git HEAD exact pin and clean
whitelisted paths via local read-only Git subprocess before output; this is the
only permitted subprocess. Fully render and
validate before temp same-dir write/rename; preserve old output and clean temp
on failure. Never write committed snapshot. No execution, eval, import, require,
network, install, or fetch. Use existing TypeScript compiler API AST only; add
no dependency. Read only this whitelist:

```text
open-sse/providers/registry/index.js
open-sse/providers/registry/*.js
open-sse/providers/index.js
open-sse/providers/schema.js
open-sse/providers/models/schema.js
open-sse/providers/models/helpers.js
open-sse/config/providerModels.js
open-sse/config/grokCli.js
open-sse/providers/thinkingLevels.js
open-sse/providers/capabilities.js
```

Accept static literals, object/array literals, no-substitution templates,
reviewed static refs/imported constants, statically-resolvable object/array
spread, exact `withCodexReviewModels`, and exact
`PROVIDER_DEFAULTS.format`/`GROK_CLI_MODEL`/Grok gate extraction. Unknown forms
fail `file:line:column` diagnostics. Require
sorted unique sourceFiles/provider keys, 100 providers, 468 LLM records, and
excluded image 60/stt 21/embedding 33/tts 27/video 3.

Run: `bun test tests/extract-9router-llm-catalog.test.ts`

Expected: PASS.

- [ ] **Step 4: Oracle review and commit**

Run: `bun test tests/extract-9router-llm-catalog.test.ts && bun test && bun run build && git diff --check`

After Oracle approval:

```bash
git add package.json scripts/extract-9router-llm-catalog.ts tests/extract-9router-llm-catalog.test.ts tests/fixtures/9router-extractor/
git commit -m "feat: add bounded 9router catalog extractor"
```

## Task 3: Reviewed full static LLM snapshot

**Files:** Create `src/generated/9router-llm-catalog.ts`,
`docs/upstream/9router-llm-catalog-manifest.md`; modify
`tests/llm-catalog.test.ts`.

- [ ] **Step 0: Oracle task gate**

Ask Oracle to approve candidate comparison, reviewed literal snapshot, manifest,
counts, sourceFiles, tests, commands, Task 2 evidence, and old route maps until
Task 5.

- [ ] **Step 1: Write red snapshot tests**

Test candidate and checked-in literal snapshot match after review; validator,
exact SHA, sorted unique sourceFiles including picker/capability paths, sorted
provider keys, 100 providers, 468 LLM models, excluded totals, dynamic IDs,
Codex flattening, and Sol canonical/picker goldens.

- [ ] **Step 2: Confirm red state**

Run: `bun test tests/llm-catalog.test.ts`

Expected: FAIL; reviewed snapshot absent.

- [ ] **Step 3: Review candidate and add snapshot/manifest**

Follow exact order: (1) generate candidate to temporary path, (2) manually
review candidate, (3) copy candidate unchanged to
`src/generated/9router-llm-catalog.ts`, (4) generate fresh temporary candidate,
(5) `cmp` fresh candidate with checked-in snapshot. Commands:

```bash
bun run extract:9router-catalog --source-dir .slim/clonedeps/repos/decolua__9router --output /tmp/9router-llm-catalog.candidate.ts
cp /tmp/9router-llm-catalog.candidate.ts src/generated/9router-llm-catalog.ts
bun run extract:9router-catalog --source-dir .slim/clonedeps/repos/decolua__9router --output /tmp/9router-llm-catalog.fresh.ts
cmp /tmp/9router-llm-catalog.fresh.ts src/generated/9router-llm-catalog.ts
```

Extractor output is candidate. Manual edits require extractor fix and rerun.
Manifest records sourceFiles, importer/fact inventory, every provider
row with registry path/LLM/excluded counts/dynamic flags, totals, approved
flattening, and exclusions `pricing` matcher not copied, `config/providers`
output not copied, `shared` transport/auth-only. Any diagnostic, conflict, or
candidate mismatch aborts without replacement.

- [ ] **Step 4: Pass and Oracle review/commit**

Run: `bun test tests/llm-catalog.test.ts && bun test && bun run build && git diff --check`

After Oracle approval, commit snapshot, manifest, and tests.

## Task 4: Source-authoritative reasoning variants

**Files:** Modify `src/capability-resolver.ts`, `tests/capability-resolver.test.ts`.

- [ ] **Step 0: Oracle task gate**

Ask Oracle to approve picker API replacement, `minimal`/`max` policy, test
matrix, and unchanged runtime integration until Task 5.

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

## Task 5: Runtime/catalog/models.dev composition

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

## Task 6: Detector and documentation boundary

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
open-sse/config/grokCli.js
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

- Tasks run catalog contract, bounded extractor, reviewed snapshot, picker, runtime composition, then detector/docs.
- Each task has Oracle approval before work and Oracle completion review before commit.
- No task executes 9router source, fetches GitHub at runtime, adds non-LLM models, or auto-applies upstream changes.
- For this spec/plan amendment only, stage exactly
  `docs/superpowers/specs/2026-07-28-9router-static-catalog-design.md` and
  `docs/superpowers/plans/2026-07-28-9router-static-catalog.md`; leave `.slim/`
  unstaged. Verify with `git status --short` before Oracle review.
