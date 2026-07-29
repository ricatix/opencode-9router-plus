# PROJECT KNOWLEDGE BASE

**Maintained manually:** current behavior
**Commit:** 83479b7
**Branch:** master

## OVERVIEW
TypeScript ESM plugin for OpenCode. Runtime lists models from live 9router `/v1/models` and injects provider/model config without hardcoded lists in `opencode.json`. Reviewed static catalog supplies LLM capabilities and reasoning variants. `models.dev` enriches metadata only. Unmatched models use safe template.

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
| Task | Location | Notes |
|------|----------|-------|
| Runtime provider injection and listing | `src/index.ts` | Uses live `${baseUrl}/models`; default base URL ends in `/v1`, with compatibility fallbacks. |
| Model entry mapping | `src/model-mapper.ts` | Applies catalog capabilities, optional metadata enrichment, safe fallback. |
| Catalog route matching | `src/llm-catalog.ts` | Validates catalog and matches runtime route IDs. |
| Reasoning variants | `src/capability-resolver.ts` | Resolves allowed static catalog variants. |
| Generated catalog | `src/generated/9router-llm-catalog.ts` | Reviewed static catalog output. |
| Catalog extraction | `scripts/extract-9router-llm-catalog.ts` | Extracts only audited upstream inputs. |
| Upstream watch | renderer and workflow | Watch renders reports; audited refresh is separate. |
| Metadata enrichment | `src/models-dev.ts`, `src/cache.ts` | `models.dev` metadata only; cache TTL 24h. |
| Config CLI | `src/cli.ts` | Safe install, check, uninstall, JSONC refusal. |
| Tests | `tests/` | Run with `bun test`. |
| Public docs | `README.md` | Install, env, catalog, diagnostics, uninstall. |

## CODE MAP
| Symbol | Location | Role |
|--------|----------|------|
| `plugin` | `src/index.ts` | OpenCode plugin factory and live model listing. |
| `resolveModel` | `src/model-mapper.ts` | Builds entries from catalog, enrichment, or safe template. |
| `matchLlmCatalogRoute` | `src/llm-catalog.ts` | Matches runtime ID to reviewed route. |
| `resolveCatalogVariants` | `src/capability-resolver.ts` | Creates reasoning variants. |
| `lookupModelsDev` | `src/models-dev.ts` | Builds metadata index. |
| `readCache`, `writeCache`, `getCacheAge` | `src/cache.ts` | Manages models.dev cache and diagnostics. |

## CONVENTIONS
- ESM package: local TypeScript imports use `.js` suffix.
- TypeScript: ES2022, NodeNext, declarations, strict mode.
- Runtime env: `OPENCODE_9ROUTER_URL`, `OPENCODE_9ROUTER_API_KEY`, `OPENCODE_9ROUTER_TIMEOUT_MS`.
- Live discovery decides listed models. Static reviewed catalog decides known-route capabilities and reasoning variants.
- `models.dev` enriches matched canonical metadata. It does not decide listing or capabilities.
- CLI config writes back up existing files and write atomically. Commented `.jsonc` fallback edits are refused.
- Prefer `bun test` and `bun run build`. Publish lifecycle retains `npm run clean && npm run build`.

## ANTI-PATTERNS
- Do not hardcode 9router model lists in `opencode.json`.
- Do not treat `models.dev` as capability authority.
- Do not refresh catalog from unreviewed upstream changes. Watch reports first; audited refresh PR later.
- Do not add fields violating `https://opencode.ai/config.json`.
- Do not write API keys to docs, config examples, logs, or this file.
- Do not treat `dist/` as source.
- Do not commit or push `docs/superpowers/`; local-only and ignored. Tracked legacy docs need separate `git rm --cached` later.

## NOTES
- Catalog route matching runs before models.dev enrichment. Unmatched runtime models receive safe template.
- Catalog extractor, upstream watch renderer, runtime, and mapping are covered by Bun tests.
- Upstream watch workflow reports changes only. It does not refresh catalog, publish, tag, or release.
- `models.dev` cache: `~/.cache/opencode-9router-plus/models.dev.json`.
- Both `bun.lock` and `package-lock.json` exist. Avoid dependency edits unless lockfile policy is explicit.

## COMMANDS
```bash
bun install
bun test
bun run build
bun run clean
bun run prepublishOnly
opencode plugin opencode-9router-plus
npx opencode-9router-plus check
```
