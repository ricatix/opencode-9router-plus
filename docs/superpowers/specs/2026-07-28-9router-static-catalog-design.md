# 9router Static LLM Catalog and Reasoning Snapshot

## Status and replacement

This specification supersedes the reasoning-policy portions of
`2026-07-28-9router-reasoning-variants-design.md`.

The older design treated `/v1/models` capability fields as the reasoning-picker
authority and prohibited `max`. That is wrong for 9router routes: the effective
picker rules live in the 9router source tree and can differ from public runtime
capabilities. Keep the earlier document as history; implement this document for
the new behavior.

## Goal

Build a reviewed, vendored static catalog of every 9router **LLM** route that
can be extracted as static data from one pinned source commit, and their
reasoning-picker rules. At runtime, intersect that catalog with the user's
`/v1/models` response, enrich matching routes from models.dev, then inject only
the runtime-available routes into OpenCode.

Scope is this plugin only. Do not modify OpenCode or 9router. Do not execute
9router source, fetch GitHub at plugin runtime, or send inference probes.

## User-facing result

OpenCode lists only models exposed by the configured 9router server. A model
with a source-backed discrete picker gets the same discrete variants as 9router.

For example, current `cx/gpt-5.6-sol` should expose:

```text
default
none
minimal
low
medium
high
xhigh
max
```

`default` remains unforced: it sends no model-level reasoning option and is the
OpenCode equivalent of 9router `auto`.

If 9router's picker exposes `max`, OpenCode exposes `max` too. The plugin does
not relabel or suppress it even if 9router later normalizes its wire request to
`xhigh`; the picker mirrors the selected 9router UI contract.

Routes with only non-discrete controls (`auto`, `on`, `off`, or `thinking`) get
no synthetic OpenCode variants. `default` remains their automatic mode.

## Source authority and precedence

Each source owns one fact. Do not use a source outside its authority.

| Fact | Authority | Rule |
| --- | --- | --- |
| Route exists for this user/server | 9router `GET /v1/models` | Final inclusion filter. Never add snapshot-only models. |
| Static route catalog, aliases, kinds, upstream IDs, picker/capability rules | Vendored 9router snapshot | Source-backed upper bound for static route semantics. |
| Display metadata, limits, modalities, costs, canonical model facts | models.dev | Enrichment only. Never invent a route or remove a source-backed picker level. |
| Unknown runtime route | Runtime discovery | Inject a minimal template entry; do not guess route metadata or picker variants. |

`thinkingFormat` remains a request-wire family, not canonical provider identity.
It must never be used alone to select a models.dev provider.

## Static LLM catalog snapshot

Add a generated-data module such as:

```text
src/generated/9router-llm-catalog.ts
```

It is a reviewed data artifact with `sourceCommit` and source-file provenance.
It contains only extracted static literals needed for OpenCode LLM model
injection:

```ts
type NineRouterLlmCatalog = {
  sourceCommit: string
  sourceFiles: readonly string[]
  providers: Readonly<Record<string, {
    id: string
    catalogKey: string // 9router `alias || id`
    aliases: readonly string[]
    models: readonly {
      id: string
      name?: string
      kind: "llm"
      upstreamModelId?: string
      reasoning?: {
        enabled?: boolean
        thinkingFormat?: string
        canDisable?: boolean
        thinkingRange?: readonly string[]
      }
    }[]
    modelsFetcher?: true
    passthroughModels?: true
  }>>
  reasoningPicker: {
    formatLevels: Readonly<Record<string, readonly string[]>>
    patternLevels: readonly { pattern: string; levels: readonly string[] }[]
  }
}
```

Exact final TypeScript names may differ, but data boundaries must not.

Snapshot source is the static 9router catalog contract:

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

`open-sse/providers/index.js` imports `PROVIDER_DEFAULTS.format` from
`open-sse/providers/schema.js`; both schema paths are provenance inputs.
`open-sse/providers/models/helpers.js` supplies derived static Codex review
models and is manually flattened into the snapshot. Excluded dependencies:
`open-sse/providers/pricing.js` matcher behavior is copied as source literal/
pattern and Task 3 has its own `*` matcher; `open-sse/config/providers.js`
output is not copied; `open-sse/providers/shared.js` is transport/auth-only.
`open-sse/config/grokCli.js` supplies `GROK_CLI_MODEL` and its reasoning-effort
gate; both are manually flattened facts.

The snapshot must retain:

- provider `id`, `alias`, additional aliases, and `catalogKey`;
- static LLM model `id`, optional display name, and `upstreamModelId`;
- static dynamic-catalog flags: `modelsFetcher` and `passthroughModels`;
- reasoning-related capability facts only;
- `FORMAT_LEVELS` and `PATTERN_THINKING` literal picker rules.

Do not include image, TTS, STT, embedding, or other non-LLM model entries.
“Full static catalog” means every statically declared LLM entry reachable from
the pinned registry import list. It explicitly excludes account-scoped,
fetched, passthrough, and synthetic runtime routes. `modelsFetcher` and
`passthroughModels` flags document that boundary.

## Snapshot extraction safety

The snapshot is created outside plugin runtime, from one pinned 9router commit.
Fetched source is untrusted input.

- Never import, evaluate, require, spawn, or execute fetched JavaScript.
- Extract only explicitly supported literal data shapes.
- Reject or report computed expressions, dynamic model construction, spread
  expressions, calls, template literals, and conflicting duplicate facts.
- Preserve unknown/dynamic providers as flags, not fabricated models.
- Produce deterministic data order and retain the source commit.
- A failed extraction never replaces the committed snapshot.

`sourceCommit` must be one immutable lowercase 40-hex Git SHA. Every source
file must be fetched from that exact SHA. The snapshot validator rejects a
missing/malformed SHA, a file outside the exact whitelist, or mismatched
provenance. The extractor parses only approved data paths; unsupported syntax
outside those paths is ignored. Unsupported syntax inside an authoritative
catalog/picker/capability field fails with file path and location.

The implementation may use a constrained parser or a checked-in manually
reviewed snapshot refresh process. It must not claim full semantic recreation
of 9router JavaScript.

## Runtime catalog intersection

Existing `/v1/models` discovery remains the final route list.

For every runtime LLM route:

1. Preserve raw route ID and runtime model object.
2. Match it against the snapshot by catalog key/alias and static model ID.
3. If matched, annotate it with static route, canonical/upstream, and picker
   facts. Static facts never create an additional runtime route.
4. If unmatched, create the existing minimal template entry with raw `id` and
   `name`; do not hide it and do not guess aliases, upstream identity, or
   reasoning variants.
5. If a matched snapshot entry is LLM, retain it even when runtime kind is
   absent or conflicts. Exclude a runtime entry only when its own explicit
   `kind` is one of known non-LLM values (`image`, `tts`, `stt`, `embedding`,
   `image-to-text`, or `web`) and no matched snapshot LLM entry exists.

The static snapshot is not a replacement for `/v1/models`. This preserves live,
account-scoped, synthetic, and passthrough routes such as Kiro/OpenRouter-like
catalogs without pretending they were statically known.

## models.dev enrichment

Continue independent cached fetches of `api.json` and `models.json`.

Use models.dev only after snapshot-backed route normalization establishes a
canonical provider/model identity. Provider-specific metadata wins over
model-only metadata. Keep current provider-boundary and ambiguity protections.

models.dev may enrich:

- name/family/release date;
- limits, modalities, costs, and tool/attachment fields;
- canonical model metadata.

models.dev does not decide route existence, alias identity, or 9router picker
levels. It must not intersect away a 9router source-backed discrete level.

## Reasoning picker resolution

The snapshot, not public `thinkingRange`, determines source-backed discrete
picker levels.

For a runtime route matched to snapshot data:

1. For a matched route, require snapshot reasoning capability. Runtime
   capabilities never add or widen matched-route picker levels. If snapshot
   does not prove reasoning, emit no reasoning variants.
2. Apply `PATTERN_THINKING` in stored array order to the raw runtime model ID
   after the first `/`; comparison is case-sensitive and uses 9router glob
   semantics where `*` matches any sequence. Do not also match aliases,
   canonical IDs, or display names. First matching rule wins.
3. Otherwise use `FORMAT_LEVELS[thinkingFormat]`.
4. Remove `none` when source-backed capability says thinking cannot be disabled.
5. Retain only discrete effort values OpenCode can transmit:
   `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`.
6. Emit every retained value as:

   ```ts
   { reasoningEffort: value }
   ```

7. Never emit `auto`. OpenCode `default` remains no forced effort.
8. If source result is only `auto`, `on`, `off`, or `thinking`, emit no
   variants.

Current source example: `*gpt-5.6-sol*` has a literal 9router rule including
`none`, `minimal`, `low`, `medium`, `high`, `xhigh`, and `max`. It must no
longer be narrowed because runtime `/v1/models` reports `thinkingRange: null`.

For every reasoning-capable route with no discrete source levels—matched
non-discrete-only and unmatched alike—set `variants: {}` explicitly. This
prevents OpenCode's built-in fallback transform from inventing variants such as
`max`. A non-reasoning unmatched route may omit `variants`.

An unmatched route template is exactly existing safe template metadata plus raw
`id` and `name`. It has no canonical-provider guess, no models.dev enrichment,
and no synthetic picker. Its `variants` is `{}` only when explicit runtime
`capabilities.reasoning === true`; otherwise variants is omitted.

Never set model-level `options.reasoningEffort`; only a selected variant sends
an effort.

## Update process

Initial snapshot uses latest `decolua/9router` `master` at implementation time.

Existing daily/manual workflow remains detector-only:

```text
9router master changes
→ report PR with commit/file summary
→ human review
→ separate manual snapshot-refresh PR when appropriate
```

The detector runs on daily schedule and `workflow_dispatch`. If the upstream
SHA is unchanged, it exits without a PR. If changed, it opens or updates one
report-only PR containing prior/current SHA and changed files in the exact
snapshot whitelist. It modifies no snapshot file. It has only permissions
needed to create that report PR. The detector must never auto-generate,
auto-merge, or directly push a catalog snapshot. It must never fetch source
blobs for plugin runtime, change a release tag, or publish npm.

The report flags changes in the snapshot source-file whitelist, especially
catalog, alias, capability, and picker-rule files. A separate manual snapshot
refresh PR receives an explicit immutable commit SHA and runs parser/data
validation, golden fixtures, `bun test`, and `bun run build`.

## Failure behavior

- `/v1/models` unavailable: preserve current discovery failure behavior; do not
  inject snapshot-only models.
- models.dev unavailable/stale: use snapshot/runtime metadata or template.
- snapshot lookup ambiguous: preserve runtime route as template; do not guess.
- snapshot extraction failure: keep last committed snapshot.
- static provider has `modelsFetcher`/`passthroughModels`: runtime discovery is
  authoritative; absent static entry remains template.
- source has a non-discrete-only picker: preserve OpenCode `default` only.

## Verification

Use Bun built-in tests.

Fixture and unit coverage must include:

- static provider catalog, aliases, `catalogKey`, `upstreamModelId`, and LLM
  filtering;
- dynamic/passthrough provider flags without fabricated static models;
- runtime-only model retained as template;
- snapshot-only model excluded when absent from `/v1/models`;
- source-backed `cx/gpt-5.6-sol` picker equals, in order,
  `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`; `xhigh` and
  `max` remain distinct and serialize respectively to
  `{ reasoningEffort: "xhigh" }` and `{ reasoningEffort: "max" }`;
- `default` has no forced effort and `auto` has no emitted variant;
- matched and unmatched reasoning routes without discrete source levels use
  explicit `variants: {}`; non-discrete-only source rules therefore emit no
  variants and cannot trigger OpenCode fallback;
- unmatched reasoning route uses explicit `{}` variants and therefore blocks
  OpenCode fallback variants;
- models.dev enriches only snapshot-resolved canonical identities and does not
  narrow source-backed picker levels;
- parser/extraction rejects unsupported dynamic syntax and conflicting facts;
- snapshot provenance, deterministic render, and stale snapshot retention.

Run:

```bash
bun test
bun run build
```

Manual runtime validation remains metadata-only:

```bash
curl "$OPENCODE_9ROUTER_URL/models"
opencode models 9router --verbose
```

Do not automate inference requests.

## Non-goals

- Modifying OpenCode or 9router.
- Listing non-LLM kinds through this OpenCode-compatible chat provider.
- Replacing runtime `/v1/models` with the static catalog.
- Runtime GitHub/source fetches.
- Executing or semantically recreating arbitrary 9router JavaScript.
- Auto-applying upstream changes or auto-publishing npm.
