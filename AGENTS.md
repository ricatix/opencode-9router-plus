# PROJECT KNOWLEDGE BASE

**Maintained manually:** current behavior
**Commit:** 566d896
**Branch:** main

## OVERVIEW

TypeScript ESM plugin for OpenCode. Runtime accepts explicit valid live 9router IDs, regardless of optional `kind`, and injects provider/model config without hardcoded lists in `opencode.json`. Non-LLM routes may appear. Reviewed static catalog supplies canonical identity, reasoning, and variants. `models.dev` enriches allowlisted metadata only. Unmatched models use conservative fallback.

## STRUCTURE

```text
opencode-9router-plus/
├── src/
│   ├── index.ts                         # runtime discovery and provider injection
│   ├── cli.ts                           # install/check/uninstall CLI
│   ├── model-mapper.ts                  # catalog, enrichment, safe fallback
│   ├── llm-catalog.ts                   # catalog validation and route matching
│   ├── capability-resolver.ts           # reasoning variant resolver
│   ├── generated/9router-llm-catalog.ts # generated reviewed catalog
│   ├── models-dev.ts                    # models.dev metadata enrichment
│   └── cache.ts                         # 24h models.dev cache
├── scripts/extract-9router-llm-catalog.ts # audited catalog extractor
├── scripts/render-9router-upstream-report.sh # upstream-watch report renderer
├── tests/                               # Bun tests
├── assets/images/                       # README images
├── dist/                                # generated; ignored
├── package.json                         # ESM package and scripts
└── tsconfig.json                        # strict NodeNext TypeScript
```

## WHERE TO LOOK

| Task                                   | Location                                 | Notes                                                                                        |
| -------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| Runtime provider injection and listing | `src/index.ts`                           | Uses live `${baseUrl}/models`; default base URL ends in `/v1`, with compatibility fallbacks. |
| Model entry mapping                    | `src/model-mapper.ts`                    | Applies catalog capabilities, optional metadata enrichment, safe fallback.                   |
| Catalog route matching                 | `src/llm-catalog.ts`                     | Validates catalog and matches runtime route IDs.                                             |
| Reasoning variants                     | `src/capability-resolver.ts`             | Resolves allowed static catalog variants.                                                    |
| Generated catalog                      | `src/generated/9router-llm-catalog.ts`   | Reviewed static catalog output.                                                              |
| Catalog extraction                     | `scripts/extract-9router-llm-catalog.ts` | Extracts only audited upstream inputs.                                                       |
| Upstream watch                         | renderer and workflow                    | Watch renders reports; audited refresh is separate.                                          |
| Metadata enrichment                    | `src/models-dev.ts`, `src/cache.ts`      | `models.dev` metadata only; cache TTL 24h.                                                   |
| Config CLI                             | `src/cli.ts`                             | Safe install, check, uninstall, JSONC refusal.                                               |
| Tests                                  | `tests/`                                 | Run with `bun test`.                                                                         |
| Public docs                            | `README.md`                              | Install, env, catalog, diagnostics, uninstall.                                               |

## CODE MAP

| Symbol                                   | Location                     | Role                                                       |
| ---------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| `plugin`                                 | `src/index.ts`               | OpenCode plugin factory and live model listing.            |
| `resolveModel`                           | `src/model-mapper.ts`        | Builds entries from catalog, enrichment, or safe template. |
| `matchLlmCatalogRoute`                   | `src/llm-catalog.ts`         | Matches runtime ID to reviewed route.                      |
| `resolveCatalogVariants`                 | `src/capability-resolver.ts` | Creates reasoning variants.                                |
| `lookupModelsDev`                        | `src/models-dev.ts`          | Builds metadata index.                                     |
| `readCache`, `writeCache`, `getCacheAge` | `src/cache.ts`               | Manages models.dev cache and diagnostics.                  |

## CONVENTIONS

- ESM package: local TypeScript imports use `.js` suffix.
- TypeScript: ES2022, NodeNext, declarations, strict mode, unused local and parameter checks.
- Runtime env: `OPENCODE_9ROUTER_URL`, `OPENCODE_9ROUTER_API_KEY`, `OPENCODE_9ROUTER_TIMEOUT_MS`.
- Live discovery trusts only explicit valid `id`; `kind` is optional and ignored. Static reviewed catalog decides canonical identity, reasoning, and variants.
- `models.dev` uses exact canonical/provider metadata lookup only. Reviewed Codex routes canonicalize to `openai` for metadata. Non-catalog routes may use global metadata only when exactly one key shares its exact case-sensitive final path segment. It does not decide listing, capabilities, route ownership, reasoning, or variants. Unmatched models use all-false conservative fallback.
- CLI config writes back up existing files and write atomically. Commented `.jsonc` fallback edits are refused.
- Prefer `bun run check` for Prettier format check, Biome lint, unused-code, typecheck, and deterministic tests. `bun run format` writes source, config, and docs formatting without lockfiles or `dist/`. `bun run build` creates `dist/`. Use `bun run test:live` only with `OPENCODE_9ROUTER_API_KEY`. Release runs `bun run check` before `npm publish`; `prepublishOnly` retains `npm run clean && npm run build`.

## ANTI-PATTERNS

- Do not hardcode 9router model lists in `opencode.json`.
- Do not treat `models.dev` as capability authority.
- Do not refresh catalog from unreviewed upstream changes. Watch reports first; audited refresh PR later.
- Do not add fields violating `https://opencode.ai/config.json`.
- Do not write API keys to docs, config examples, logs, or this file.
- Do not treat `dist/` as source.
- Do not commit or push `docs/superpowers/`; local-only and ignored. Tracked legacy docs need separate `git rm --cached` later.

## NOTES

- Catalog route matching runs before models.dev enrichment. Provider metadata is preferred field-by-field; global metadata fills missing fields. Exact lookup rejects ambiguity. Models without unambiguous metadata retain conservative fallback.
- Catalog extractor, upstream watch renderer, runtime, and mapping are covered by Bun tests.
- Upstream watch workflow reports changes only. It does not refresh catalog, publish, tag, or release.
- `models.dev` cache: `~/.cache/opencode-9router-plus/models-dev-api.json` (5 MiB cap) and `~/.cache/opencode-9router-plus/models-dev-models.json` (1 MiB cap).
- Both `bun.lock` and `package-lock.json` exist. Avoid dependency edits unless lockfile policy is explicit.

## COMMANDS

```bash
bun install
bun test
bun run check
bun run typecheck
bun run lint
bun run format:check
bun run format
bun run knip
bun run build
bun run clean
bun run prepublishOnly
opencode plugin opencode-9router-plus
npx opencode-9router-plus check
```
