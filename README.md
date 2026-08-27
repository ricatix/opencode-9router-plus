# Opencode 9Router Plus

![Preview plugin](https://unpkg.com/opencode-9router-plus@latest/assets/images/cover-3.png)

Dynamic 9router provider plugin for [opencode](https://opencode.ai/).

It discovers available models from your 9router endpoint at startup and injects them into opencode automatically, so model lists do not need to be hardcoded in `opencode.json`.

## Features

- Discovers models dynamically from `OPENCODE_9ROUTER_URL` (default: `http://localhost:20128/v1`)
- Registers provider `9router` using `@ai-sdk/openai-compatible`
- Sends `OPENCODE_9ROUTER_API_KEY` as Bearer auth when discovering models
- Injects dynamically discovered models into opencode config at runtime
- Accepts every valid live model ID; `kind` is optional and ignored during discovery
- Preserves valid live metadata for model name, reasoning, tools, vision, PDF support, and token limits
- Uses reviewed static catalog lookup and reasoning variants for known LLM routes
- Uses `models.dev` for non-capability metadata and limit fallback only; mapper failures use a safe model template without stopping other models
- Does not write opencode config from the runtime plugin
- Includes an explicit installer/check CLI for safer setup and troubleshooting

## Recommended Install

Use opencode's native plugin installer:

```bash
opencode plugin opencode-9router-plus
```

Then set your API key and restart opencode.

Windows (cmd):

```bat
setx OPENCODE_9ROUTER_API_KEY "sk-..."
```

macOS/Linux:

```bash
export OPENCODE_9ROUTER_API_KEY="sk-..."
```

If your 9router endpoint is not the default local URL, also set:

```bash
export OPENCODE_9ROUTER_URL="http://localhost:20128/v1"
```

Windows (cmd):

```bat
setx OPENCODE_9ROUTER_URL "http://localhost:20128/v1"
```

Restart opencode, then verify:

```bash
opencode models 9router
```

## Fallback Installer

If the native installer is unavailable, use the package CLI:

```bash
npx opencode-9router-plus install
```

The CLI first tries `opencode plugin opencode-9router-plus`. If that fails, it falls back to safe config editing.

Useful options:

```bash
npx opencode-9router-plus install --global
npx opencode-9router-plus install --project
npx opencode-9router-plus install --config ./opencode.json
npx opencode-9router-plus install --dry-run
npx opencode-9router-plus install --yes
npx opencode-9router-plus install --manual
```

The fallback editor:

- detects `OPENCODE_CONFIG` and warns about `OPENCODE_CONFIG_CONTENT`
- supports global and project config targets
- creates backups before writing existing files
- writes atomically through a temp file and rename
- avoids duplicate plugin entries, including tuple entries like `["opencode-9router-plus", {}]`
- refuses to edit JSONC files with comments because preserving comments safely is not guaranteed

## Check Setup

Run diagnostics:

```bash
npx opencode-9router-plus check
```

It checks:

- target config path
- whether config parses successfully
- whether plugin entry is present
- whether `OPENCODE_9ROUTER_API_KEY` is set
- whether `opencode models 9router` returns models

## Uninstall

Use opencode's native plugin management if available. Otherwise:

```bash
npx opencode-9router-plus uninstall --global
```

or:

```bash
npx opencode-9router-plus uninstall --project
```

## Manual Config

If you prefer to edit config manually, add the package name to `plugin`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-9router-plus"]
}
```

Do not hardcode model lists. The plugin lists them dynamically from the live `/v1/models` endpoint at startup.

## Environment Variables

- `OPENCODE_9ROUTER_URL` (optional): 9router base URL. Default `http://localhost:20128/v1`
- `OPENCODE_9ROUTER_API_KEY` (recommended): API key used by provider options and model discovery requests
- `OPENCODE_9ROUTER_TIMEOUT_MS` (optional): fetch timeout in ms. Default `5000`

## Discovery and Live Metadata

Runtime discovery accepts first occurrence of every explicit, valid model `id` from a root array or a `models` or `data` array. `kind` is ignored, so routes that are not LLMs may appear when exposed by endpoint. Invalid, control-character, whitespace-padded, and dangerous object-key IDs remain rejected.

Discovery reads own data properties only; inherited properties and accessors are ignored. Each endpoint response is capped at 5 MiB, listing is capped at 2,000 records, and records or capability objects with more than 32 own keys retain only valid ID with empty live metadata. Empty, malformed, or oversized responses try compatible fallback endpoints: `/models`, `/model`, then base URL.

Valid live metadata has final authority: name; reasoning; tools; vision/PDF attachment support; and complete token-limit pairs. Boolean values accept only `true`, `false`, `"true"`, or `"false"`; invalid values are ignored. `false` reasoning remains false and removes reasoning variants. Vision or PDF enables attachments; tools enables tool calling; temperature remains disabled.

Limits are atomic: capability pair first, then top-level live pair, then `models.dev`. Pairs never combine values from different sources.

## Development

```bash
bun install
bun run check
bun run typecheck
bun run lint
bun run format:check
bun run format
bun run knip
bun run test:deterministic
bun run build
bun run clean
bun run prepublishOnly
```

`prepublishOnly` intentionally uses npm lifecycle commands internally: `npm run clean && npm run build`.

`bun run check` runs Prettier format check, Biome lint, unused-code, typecheck, and deterministic tests. `bun run format` writes Prettier formatting for tracked source, config, and docs files, excluding lockfiles and `dist/`. Pull requests and pushes to `main` run this same gate. Release tags run it before npm publish. Run `bun run build` to produce `dist/`. Run opt-in live smoke only against a reachable 9router endpoint with an API key:

```bash
OPENCODE_9ROUTER_API_KEY="sk-..." bun run test:live
```

`test:live` requires `OPENCODE_9ROUTER_API_KEY`; it is not part of `check` and has no claimed pass result here.

## Upstream Catalog Review

`/v1/models` controls runtime listing by valid ID, regardless of `kind`. Reviewed static catalog provides canonical metadata lookup, fallback reasoning, and supported reasoning variants for known LLM routes. Variants appear only when final reasoning is true.

`models.dev` enriches non-capability fields such as family, release date, cost, modalities, and complete token-limit pairs when live limits are unavailable. It never controls reasoning, attachments, tools, or temperature. For non-catalog routes, metadata applies only when exactly one global catalog key has an exact, case-sensitive final path segment matching route final path segment; no provider guessing, normalization, or route-ID rewrite occurs. Dynamic, unmatched, or unexpectedly failing models receive a safe template while remaining models continue loading.

Scheduled upstream watch reports only whitelisted catalog-input paths. It never runs upstream source, applies detector output, refreshes catalog, publishes, tags, or releases.

Manual catalog refresh is offline and audited: use explicit 40 lowercase hexadecimal upstream SHA, review changes in separate refresh PR, then run local tooling against approved inputs.

Project notes:

- Source lives in `src/`; generated output goes to `dist/`.
- Tests run with `bun test`, including catalog extraction and upstream watch behavior.
- `AGENTS.md` tracks project facts for coding agents; keep it aligned with README changes.

## Troubleshooting

- Restart opencode after changing config or installing plugins.
- If `/model` does not show 9router models, run `npx opencode-9router-plus check`.
- If models are empty, verify that your 9router endpoint is running and `/models` is reachable.
- If one model has malformed metadata or mapping fails, it is registered with conservative defaults; check endpoint data if its name or capabilities look incomplete.
- If you see `Missing API Key`, set `OPENCODE_9ROUTER_API_KEY` and restart opencode.
- If plugin loads twice, remove duplicate `opencode-9router-plus` entries from your OpenCode config before restarting.

## Github Repository

https://github.com/ricatix/opencode-9router-plus

## Credits

Forked from the original [opencode-9router-plugin](https://github.com/mdhb2/opencode-9router-plugin) by [mdhb2](https://github.com/mdhb2).
