# 9router Reasoning Variants

## Goal

Expose safe reasoning-effort variants in OpenCode model picker for models discovered through 9router.

Scope is this plugin only. Do not change OpenCode or 9router. Preserve `default`: no reasoning effort is forced unless user chooses a variant.

## User-facing result

A reasoning-capable model may expose:

```text
default
none
low
medium
high
xhigh
```

`max` must never be exposed. Current 9router OpenAI/Codex routes can normalize `max` to `xhigh`.

The actual list is route- and model-specific. The plugin must not claim an effort that 9router or model metadata cannot support safely.

## Runtime inputs

### 9router discovery

Use existing `GET /v1/models` discovery. Retain each model object rather than reducing it to an ID. Relevant optional fields:

```ts
type NineRouterCapabilities = {
  reasoning?: boolean
  thinkingFormat?: string | null
  thinkingCanDisable?: boolean
  thinkingRange?: unknown
}
```

The live server tested during design returned `capabilities` for 25 of 32 models and `reasoning: true` for 16 models. Its `thinkingRange` can be null and is not required for discrete effort variants.

`GET /v1/models/info` is out of runtime scope. It returned only route identity for tested models, sometimes returned `404`, and creates no value proportional to N+1 requests.

### models.dev

Continue cached models.dev metadata fetches. Use `https://models.dev/api.json` for provider-specific entries and `https://models.dev/models.json` for provider-agnostic entries. Cache each payload independently under the existing cache namespace. Extend parsed metadata with `reasoning_options`.

Use provider-specific metadata when route-to-provider resolution is confident. Otherwise use provider-agnostic model metadata only. Never flatten provider entries into one last-write-wins map for reasoning options.

`thinkingFormat` is a request-wire-format family, not an upstream provider identity. Never map `thinkingFormat: "openai"` to provider `openai` by itself.

## Route mapping snapshot

Add generated file:

```text
src/generated/9router-route-map.ts
```

It contains a compact, reviewed mapping snapshot, not copied 9router source. Include source commit provenance, route-class rules, and generated explicit `upstreamModelId` entries only when class rules cannot resolve a route alias:

```ts
type RouteMapSnapshot = {
  sourceCommit: string
  directProviders: readonly string[]
  aliases: Readonly<Record<string, string>>
  suffixRules: Readonly<Record<string, readonly string[]>>
  wrapperRules: Readonly<Record<string, unknown>>
  prefixRules: Readonly<Record<string, string>>
  upstreamModels: Readonly<Record<string, string>>
}
```

Resolution precedence:

1. Direct provider route: route provider is a known models.dev provider; use it as serving provider.
2. Route-class alias/wrapper rule: normalize local aliases or scoped upstream paths.
3. Strong model-family prefix rule for known mixed catalogs.
4. Provider-agnostic model metadata.
5. No models.dev enrichment if model identity is still ambiguous.

Examples:

```text
cx/gpt-5.6-sol-review       -> openai / gpt-5.6-sol
gcli/grok-4.5-high          -> xai / grok-4.5
deepseek/deepseek-v4-pro-max -> deepseek / deepseek-v4-pro
blackbox/gpt-5.5            -> parse scoped upstream route identity when snapshot has it
clinepass/kimi-k2.7-code    -> moonshot only when strong prefix rule applies
```

Custom `openai-compatible-*`, `anthropic-compatible-*`, local/passthrough routes, and opaque aliases must not receive guessed provider-specific metadata.

The snapshot is temporary compatibility data. It can be simplified or removed once 9router exposes canonical upstream identity publicly. Tracking issue: https://github.com/decolua/9router/issues/2872.

## Provider-aware models.dev lookup

Keep route identity distinct from canonical model identity:

```ts
type RouteModelResolution = {
  routeAlias: string
  routeModelId: string
  canonicalProvider?: string
  canonicalModelId?: string
}
```

For a known canonical provider, try provider model keys in this order:

1. local key, e.g. `gpt-5.6-sol`
2. scoped canonical key, e.g. `openai/gpt-5.6-sol`

Then use model-only metadata as fallback. Provider-specific metadata wins only for that resolved serving provider.

## Capability resolver

Add a small pure resolver. Inputs:

1. 9router route/model/capabilities from `/v1/models`.
2. Route-map resolution.
3. Provider-specific or model-only `models.dev` reasoning options.

Output is OpenCode model variants:

```ts
type ModelVariants = Record<string, { reasoningEffort: string }>
```

Algorithm:

1. If `capabilities.reasoning !== true`, return no reasoning variants.
2. Identify route wire-format class from `thinkingFormat`.
3. Derive only safe discrete effort candidates for that class.
4. If models.dev has explicit effort options, intersect candidates with them.
5. Emit variants for remaining values. Never emit `max`.
6. Do not set a default `reasoningEffort` on the model.

Safe baseline:

| Route capability | Variants |
| --- | --- |
| `reasoning !== true` | none |
| OpenAI format with disable | `none`, `low`, `medium`, `high` |
| OpenAI format without confirmed disable | `low`, `medium`, `high` |
| Gemini format | `low`, `medium`, `high`; add `none` only when disable is confirmed |
| DeepSeek format | only non-lossy levels confirmed by route/model metadata |
| adaptive/on-off route | no discrete effort picker |
| unknown format, `reasoning === true` | `low`, `medium`, `high` |

Add `xhigh` only if both metadata and route evidence show it is native/non-lossy. Do not use `thinkingRange` as a prerequisite.

## Integration points

- `src/index.ts`: retain complete 9router discovery entries and pass route capability with each model to mapper.
- `src/models-dev.ts`: preserve provider boundary; parse `reasoning_options`; provide provider-aware and model-only lookups.
- `src/model-mapper.ts`: accept route context, invoke resolver, inject `variants` into model config.
- New small modules: route-map resolver, capability resolver, generated map.

Keep CLI install/uninstall behavior unchanged. Keep existing atomic cache behavior for models.dev unchanged. No runtime fetch to GitHub or 9router source. No inference probes.

## Mapping snapshot refresh

Add GitHub Actions workflow with:

```text
schedule daily
workflow_dispatch
```

Workflow:

1. Check whitelisted 9router source revisions with conditional GitHub API requests (`ETag` / `If-None-Match`).
2. If unchanged from snapshot `sourceCommit`, stop.
3. Fetch sources at one revision.
4. Parse source as text or AST only. Never execute fetched JavaScript.
5. Generate compact snapshot.
6. Run parser, golden, invariant tests, then `bun run build`.
7. If output changed and all checks pass, create or update one bot PR named `chore: refresh 9router route mapping`.
8. On any failure, retain old snapshot and fail workflow. Never update `main` directly.

Whitelist:

```text
open-sse/providers/registry/*.js
open-sse/config/providerModels.js
src/shared/constants/providers.js
```

Do not couple this workflow to models.dev runtime cache. A merged mapping PR does not create a tag, publish npm, or trigger `.github/workflows/release.yml`; release remains tag-driven and manual.

## Failure behavior

- 9router `/v1/models` fails: preserve current discovery failure behavior; do not add variants from unavailable route capability.
- Capability absent: no provider-specific claim; use conservative result only when `reasoning === true` is explicit.
- models.dev unavailable/stale: use 9router conservative route result; do not add `xhigh` without explicit route evidence.
- Route mapping ambiguous: use model-only enrichment if safe, otherwise no enrichment.
- Snapshot generation/fetch fails: plugin uses last committed snapshot.

## Verification

Use Bun built-in test runner. Add test script if absent.

Unit fixtures cover:

- direct provider route
- Codex review alias
- Grok quality alias
- scoped wrapper route
- mixed-provider strong prefix route
- unknown/opaque route
- non-reasoning model
- OpenAI, Gemini, DeepSeek, adaptive, and unknown thinking formats

Assertions:

- provider-specific lookup preserves provider boundaries
- ambiguous routes do not guess a provider
- `default` has no forced effort
- every emitted variant has `{ reasoningEffort: value }`
- `max` never appears
- `none` and `xhigh` require evidence
- generated snapshot parser rejects invalid/empty/suspiciously shrunken output

Run:

```bash
bun test
bun run build
```

Manual runtime check remains metadata-only:

```bash
curl "$OPENCODE_9ROUTER_URL/models"
```

Do not send automatic inference requests.

## Non-goals

- Modifying OpenCode or 9router.
- Making `/v1/models/info` runtime-critical.
- Exposing `max`.
- Runtime GitHub/source fetching.
- A per-model manual mapping table.
- Automatic npm publishing after map refresh.
