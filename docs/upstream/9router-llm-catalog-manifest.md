# 9router LLM catalog manifest

## Pin dan batas keselamatan

- Upstream: `decolua/9router`
- Commit pin: `1855aa44473e88feac9d3f131b9c0c5fc9706b68`
- Target pin sama dengan `origin/master` (`# v0.5.119`) saat audit dan checkout bersih.
- Registry: 145 import default, 145 export, tanpa binding hilang atau duplikat.
- Tool ini bounded transcription, bukan semantic verifier.
- Tidak menjalankan upstream, network, eval, atau install. Review JSON hanya sementara di temp root task lalu dibersihkan.

## Reproduksibilitas

| Artefak               | SHA-256                                                            | Hasil                             |
| --------------------- | ------------------------------------------------------------------ | --------------------------------- |
| candidate             | `8adccc11ac15f9de8306187cddda6105c1d90b28994ff1fa1c5d29ee0ad33e09` | cocok expected SHA                |
| snapshot              | `8adccc11ac15f9de8306187cddda6105c1d90b28994ff1fa1c5d29ee0ad33e09` | candidate disalin tanpa perubahan |
| fresh                 | `8adccc11ac15f9de8306187cddda6105c1d90b28994ff1fa1c5d29ee0ad33e09` | `cmp -s` dengan snapshot lulus    |
| generated catalog     | `8adccc11ac15f9de8306187cddda6105c1d90b28994ff1fa1c5d29ee0ad33e09` | `cmp -s` dengan candidate lulus   |
| review JSON sementara | `0a7f45f95b05fb1eac204a085637d36fb3c0d1a1b34df5178d6c34ebbf2f13bb` | metadata review baru              |

## Source files terurut

- `open-sse/config/grokCli.js`
- `open-sse/config/kiroConstants.js`
- `open-sse/config/providerModels.js`
- `open-sse/providers/capabilities.js`
- `open-sse/providers/index.js`
- `open-sse/providers/models/helpers.js`
- `open-sse/providers/models/schema.js`
- `open-sse/providers/registry/agnes.js`
- `open-sse/providers/registry/alicode-intl.js`
- `open-sse/providers/registry/alicode.js`
- `open-sse/providers/registry/alims-intl.js`
- `open-sse/providers/registry/alitp-intl.js`
- `open-sse/providers/registry/anthropic.js`
- `open-sse/providers/registry/antigravity.js`
- `open-sse/providers/registry/api-airforce.js`
- `open-sse/providers/registry/assemblyai.js`
- `open-sse/providers/registry/atria.js`
- `open-sse/providers/registry/aws-polly.js`
- `open-sse/providers/registry/azure.js`
- `open-sse/providers/registry/bai.js`
- `open-sse/providers/registry/baidu.js`
- `open-sse/providers/registry/bazaarlink.js`
- `open-sse/providers/registry/bedrock-xai.js`
- `open-sse/providers/registry/bedrock.js`
- `open-sse/providers/registry/black-forest-labs.js`
- `open-sse/providers/registry/blackbox.js`
- `open-sse/providers/registry/bluesminds.js`
- `open-sse/providers/registry/brave-search.js`
- `open-sse/providers/registry/byteplus.js`
- `open-sse/providers/registry/cartesia.js`
- `open-sse/providers/registry/cerebras.js`
- `open-sse/providers/registry/chatgpt-web.js`
- `open-sse/providers/registry/chutes.js`
- `open-sse/providers/registry/claude.js`
- `open-sse/providers/registry/cline.js`
- `open-sse/providers/registry/clinepass.js`
- `open-sse/providers/registry/cloudflare-ai.js`
- `open-sse/providers/registry/codebuddy-cn.js`
- `open-sse/providers/registry/codebuddy-intl.js`
- `open-sse/providers/registry/codex.js`
- `open-sse/providers/registry/cohere.js`
- `open-sse/providers/registry/comfyui.js`
- `open-sse/providers/registry/commandcode.js`
- `open-sse/providers/registry/coqui.js`
- `open-sse/providers/registry/cursor.js`
- `open-sse/providers/registry/dahl.js`
- `open-sse/providers/registry/deepgram.js`
- `open-sse/providers/registry/deepseek-web.js`
- `open-sse/providers/registry/deepseek.js`
- `open-sse/providers/registry/edge-tts.js`
- `open-sse/providers/registry/elevenlabs.js`
- `open-sse/providers/registry/exa.js`
- `open-sse/providers/registry/fal-ai.js`
- `open-sse/providers/registry/featherless.js`
- `open-sse/providers/registry/firecrawl.js`
- `open-sse/providers/registry/fireworks.js`
- `open-sse/providers/registry/fish-audio.js`
- `open-sse/providers/registry/gemini-cli.js`
- `open-sse/providers/registry/gemini-web.js`
- `open-sse/providers/registry/gemini.js`
- `open-sse/providers/registry/github.js`
- `open-sse/providers/registry/gitlab.js`
- `open-sse/providers/registry/glm-cn.js`
- `open-sse/providers/registry/glm.js`
- `open-sse/providers/registry/google-pse.js`
- `open-sse/providers/registry/google-tts.js`
- `open-sse/providers/registry/grok-cli.js`
- `open-sse/providers/registry/grok-web.js`
- `open-sse/providers/registry/groq.js`
- `open-sse/providers/registry/huggingface.js`
- `open-sse/providers/registry/hyperbolic.js`
- `open-sse/providers/registry/iflow.js`
- `open-sse/providers/registry/index.js`
- `open-sse/providers/registry/inworld.js`
- `open-sse/providers/registry/jina-ai.js`
- `open-sse/providers/registry/jina-reader.js`
- `open-sse/providers/registry/kilo-gateway.js`
- `open-sse/providers/registry/kilocode.js`
- `open-sse/providers/registry/kimchi.js`
- `open-sse/providers/registry/kimi.js`
- `open-sse/providers/registry/kiro.js`
- `open-sse/providers/registry/linkup.js`
- `open-sse/providers/registry/llm7.js`
- `open-sse/providers/registry/local-device.js`
- `open-sse/providers/registry/mimo-free.js`
- `open-sse/providers/registry/minimax-cn.js`
- `open-sse/providers/registry/minimax-code-global.js`
- `open-sse/providers/registry/minimax-code.js`
- `open-sse/providers/registry/minimax.js`
- `open-sse/providers/registry/mistral.js`
- `open-sse/providers/registry/mmf.js`
- `open-sse/providers/registry/morph.js`
- `open-sse/providers/registry/muse-web.js`
- `open-sse/providers/registry/muse.js`
- `open-sse/providers/registry/nace.js`
- `open-sse/providers/registry/nanobanana.js`
- `open-sse/providers/registry/nebius.js`
- `open-sse/providers/registry/nous.js`
- `open-sse/providers/registry/nvidia.js`
- `open-sse/providers/registry/ollama-local.js`
- `open-sse/providers/registry/ollama-search.js`
- `open-sse/providers/registry/ollama.js`
- `open-sse/providers/registry/openai.js`
- `open-sse/providers/registry/opencode-go.js`
- `open-sse/providers/registry/opencode-zen.js`
- `open-sse/providers/registry/opencode.js`
- `open-sse/providers/registry/openrouter.js`
- `open-sse/providers/registry/perplexity-agent.js`
- `open-sse/providers/registry/perplexity-web.js`
- `open-sse/providers/registry/perplexity.js`
- `open-sse/providers/registry/playht.js`
- `open-sse/providers/registry/poolside.js`
- `open-sse/providers/registry/qoder-cn.js`
- `open-sse/providers/registry/qoder.js`
- `open-sse/providers/registry/recraft.js`
- `open-sse/providers/registry/runcrate.js`
- `open-sse/providers/registry/runwayml.js`
- `open-sse/providers/registry/sambanova.js`
- `open-sse/providers/registry/sdwebui.js`
- `open-sse/providers/registry/searchapi.js`
- `open-sse/providers/registry/searxng.js`
- `open-sse/providers/registry/selfhosted-embedding.js`
- `open-sse/providers/registry/selfhosted-stt.js`
- `open-sse/providers/registry/selfhosted-tts.js`
- `open-sse/providers/registry/sensenova-intl.js`
- `open-sse/providers/registry/sensenova.js`
- `open-sse/providers/registry/serper.js`
- `open-sse/providers/registry/siliconflow.js`
- `open-sse/providers/registry/stability-ai.js`
- `open-sse/providers/registry/synthetic.js`
- `open-sse/providers/registry/tavily.js`
- `open-sse/providers/registry/tencent.js`
- `open-sse/providers/registry/tinyfish.js`
- `open-sse/providers/registry/together.js`
- `open-sse/providers/registry/tokenharbor.js`
- `open-sse/providers/registry/tokenrouter.js`
- `open-sse/providers/registry/topaz.js`
- `open-sse/providers/registry/tortoise.js`
- `open-sse/providers/registry/uc-web.js`
- `open-sse/providers/registry/v1m.js`
- `open-sse/providers/registry/venice.js`
- `open-sse/providers/registry/veoaifree-web.js`
- `open-sse/providers/registry/vercel-ai-gateway.js`
- `open-sse/providers/registry/vertex-partner.js`
- `open-sse/providers/registry/vertex.js`
- `open-sse/providers/registry/volcengine-ark.js`
- `open-sse/providers/registry/voyage-ai.js`
- `open-sse/providers/registry/xai.js`
- `open-sse/providers/registry/xiaomi-mimo.js`
- `open-sse/providers/registry/xiaomi-tokenplan.js`
- `open-sse/providers/registry/xquik.js`
- `open-sse/providers/registry/youcom.js`
- `open-sse/providers/registry/zed.js`
- `open-sse/providers/schema.js`
- `open-sse/providers/thinkingLevels.js`
- `open-sse/translator/concerns/thinkingUnified.js`

## Metadata proyeksi

- `projectionVersion: 1`.
- Proyeksi: `codex-review-v1`, `grok-cli-reasoning-v1`, `capability-resolution-v1`, `models-fetcher-marker-v1`, `route-owner-v1`, `transport-reasoning-v1`.
- Dynamic IDs: `agnes`, `api-airforce`, `atria`, `bai`, `bedrock`, `bedrock-xai`, `commandcode`, `dahl`, `grok-web`, `kilocode`, `kimchi`, `llm7`, `mimo-free`, `minimax-code`, `minimax-code-global`, `muse`, `nous`, `opencode`, `opencode-go`, `opencode-zen`, `openrouter`, `perplexity-agent`, `synthetic`, `tokenharbor`, `tokenrouter`, `uc-web`, `venice`, `vercel-ai-gateway`, `zed`.
- Collision: `{mmf:[mimo-free,mmf]}`; owner: `mmf`.
- Flags `modelsFetcher`/`passthroughModels` dan `catalogKey` tiap provider cocok candidate. Collision route key cocok candidate; sole collision `{ mmf: ["mimo-free", "mmf"] }`, owner `mmf`. Urutan source `mimo-free` mendahului `mmf`.
- Golden Sol: route `cx/gpt-5.6-sol`; model `gpt-5.6-sol`, reasoning `{ reasoning: true, thinkingFormat: "openai" }`; review `gpt-5.6-sol-review` memakai `upstreamModelId: "gpt-5.6-sol"` dan reasoning sama; level terurut `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, `ultra`.
- Golden Grok positif: `gcli/grok-4.5-high` punya reasoning `{ reasoning: true, thinkingFormat: "openai" }`. Batas proyeksi negatif: ini menguji predicate extractor untuk model Grok CLI yang diproyeksikan, bukan mengklaim kapabilitas upstream lain tidak ada.
- Golden ZAI: `opencode-zen/glm-5.2` bernama `GLM 5.2`, reasoning `{ reasoning: true, thinkingFormat: "zai", thinkingCanDisable: false, thinkingRange: null, thinkingEffortSupported: true }`; `reasoningPicker.formatLevels.zai` tepat `[none, thinking]`. `thinkingRange: null` fakta terpisah, bukan bukti perilaku non-discrete.

## Eksklusi dependensi, sintaks, dan fakta

- `open-sse/providers/pricing.js`: matcher implementation tidak dieksekusi; reviewed local projection dipakai.
- `open-sse/config/providers.js`: output tidak disalin.
- `open-sse/providers/shared.js`: transport/auth-only.
- `nous.js` mengekspor identifier `nous` dari const object literal; extractor me-resolve hanya identifier const object literal dan menolak pemakaian identifier tambahan.
- `modelsFetcher.url` nous berupa konstanta `NOUS_MODELS_URL`; extractor menerima identifier statis dan tidak menyalin nilainya ke catalog.
- `PROVIDER_CAPABILITIES` literal assignment `qoder` dan `sensenova-intl` dibaca sebagai tabel kapabilitas; assignment duplikat, computed key, call, dan nilai executable ditolak.
- Digest helper: `getCapabilitiesForModel`, `resolveKiroEffortPath`, dan `parseClaudeVersion` tidak berubah. `resolveFormat` berubah ke `e5d969fc27c946c0ab2bcbc86b609a2ca60b35ea4a542ffafbcfe7ca62b2b4b9` setelah audit transport-level thinking format precedence dan pemindahan special-case Muse ke config transport.
- unsupported authoritative syntax: none.
- conflicting unresolved facts: none.

## Matriks review (145 baris)

| providerId | sourceFile | catalogKey | staticLlmCount | image | stt | embedding | tts | video | modelsFetcher | passthroughModels |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| alicode-intl | open-sse/providers/registry/alicode-intl.js | alicode-intl | 7 | 0 | 0 | 0 | 0 | 0 | false | false |
| alicode | open-sse/providers/registry/alicode.js | alicode | 8 | 0 | 0 | 0 | 0 | 0 | false | false |
| anthropic | open-sse/providers/registry/anthropic.js | anthropic | 3 | 0 | 0 | 0 | 0 | 0 | false | false |
| antigravity | open-sse/providers/registry/antigravity.js | ag | 31 | 1 | 0 | 0 | 0 | 0 | false | false |
| assemblyai | open-sse/providers/registry/assemblyai.js | assemblyai | 0 | 0 | 4 | 0 | 0 | 0 | false | false |
| aws-polly | open-sse/providers/registry/aws-polly.js | polly | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| azure | open-sse/providers/registry/azure.js | azure | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| black-forest-labs | open-sse/providers/registry/black-forest-labs.js | black-forest-labs | 0 | 6 | 0 | 0 | 0 | 0 | false | false |
| blackbox | open-sse/providers/registry/blackbox.js | blackbox | 10 | 0 | 0 | 0 | 0 | 0 | false | false |
| brave-search | open-sse/providers/registry/brave-search.js | brave | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| byteplus | open-sse/providers/registry/byteplus.js | byteplus | 7 | 0 | 0 | 0 | 0 | 0 | false | false |
| cartesia | open-sse/providers/registry/cartesia.js | cartesia | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| cerebras | open-sse/providers/registry/cerebras.js | cerebras | 6 | 0 | 0 | 0 | 0 | 0 | false | false |
| chutes | open-sse/providers/registry/chutes.js | chutes | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| claude | open-sse/providers/registry/claude.js | cc | 8 | 0 | 0 | 0 | 0 | 0 | false | false |
| cline | open-sse/providers/registry/cline.js | cl | 8 | 0 | 0 | 0 | 0 | 0 | false | false |
| clinepass | open-sse/providers/registry/clinepass.js | clinepass | 10 | 0 | 0 | 0 | 0 | 0 | false | false |
| cloudflare-ai | open-sse/providers/registry/cloudflare-ai.js | cloudflare-ai | 13 | 11 | 0 | 0 | 0 | 0 | false | false |
| codebuddy-cn | open-sse/providers/registry/codebuddy-cn.js | cbcn | 11 | 0 | 0 | 0 | 0 | 0 | false | false |
| codex | open-sse/providers/registry/codex.js | cx | 20 | 8 | 1 | 0 | 0 | 0 | false | false |
| cohere | open-sse/providers/registry/cohere.js | cohere | 3 | 0 | 0 | 0 | 0 | 0 | false | false |
| comfyui | open-sse/providers/registry/comfyui.js | comfyui | 0 | 2 | 0 | 0 | 0 | 0 | false | false |
| commandcode | open-sse/providers/registry/commandcode.js | commandcode | 25 | 0 | 0 | 0 | 0 | 0 | false | true |
| coqui | open-sse/providers/registry/coqui.js | coqui | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| cursor | open-sse/providers/registry/cursor.js | cu | 14 | 0 | 0 | 0 | 0 | 0 | false | false |
| deepgram | open-sse/providers/registry/deepgram.js | deepgram | 0 | 0 | 4 | 0 | 0 | 0 | false | false |
| deepseek | open-sse/providers/registry/deepseek.js | deepseek | 8 | 0 | 0 | 0 | 0 | 0 | false | false |
| edge-tts | open-sse/providers/registry/edge-tts.js | edge-tts | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| elevenlabs | open-sse/providers/registry/elevenlabs.js | el | 0 | 0 | 2 | 0 | 0 | 0 | false | false |
| exa | open-sse/providers/registry/exa.js | exa | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| fal-ai | open-sse/providers/registry/fal-ai.js | fal-ai | 0 | 7 | 0 | 0 | 0 | 0 | false | false |
| featherless | open-sse/providers/registry/featherless.js | featherless | 7 | 0 | 0 | 0 | 0 | 0 | false | false |
| firecrawl | open-sse/providers/registry/firecrawl.js | firecrawl | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| fireworks | open-sse/providers/registry/fireworks.js | fireworks | 3 | 0 | 0 | 1 | 0 | 0 | false | false |
| gemini-cli | open-sse/providers/registry/gemini-cli.js | gc | 7 | 0 | 0 | 0 | 0 | 0 | false | false |
| gemini | open-sse/providers/registry/gemini.js | gemini | 12 | 3 | 5 | 5 | 3 | 0 | false | false |
| github | open-sse/providers/registry/github.js | gh | 27 | 0 | 0 | 2 | 0 | 0 | false | false |
| gitlab | open-sse/providers/registry/gitlab.js | gitlab | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| glm-cn | open-sse/providers/registry/glm-cn.js | glm-cn | 10 | 0 | 0 | 0 | 0 | 0 | false | false |
| glm | open-sse/providers/registry/glm.js | glm | 8 | 0 | 0 | 0 | 0 | 0 | false | false |
| google-pse | open-sse/providers/registry/google-pse.js | gpse | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| google-tts | open-sse/providers/registry/google-tts.js | google-tts | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| grok-cli | open-sse/providers/registry/grok-cli.js | gcli | 6 | 0 | 0 | 0 | 0 | 0 | false | false |
| grok-web | open-sse/providers/registry/grok-web.js | grok-web | 12 | 1 | 0 | 0 | 0 | 1 | false | true |
| groq | open-sse/providers/registry/groq.js | groq | 4 | 0 | 3 | 0 | 0 | 0 | false | false |
| huggingface | open-sse/providers/registry/huggingface.js | huggingface | 0 | 23 | 2 | 0 | 0 | 0 | false | false |
| hyperbolic | open-sse/providers/registry/hyperbolic.js | hyperbolic | 8 | 0 | 0 | 0 | 0 | 0 | false | false |
| iflow | open-sse/providers/registry/iflow.js | if | 15 | 0 | 0 | 0 | 0 | 0 | false | false |
| inworld | open-sse/providers/registry/inworld.js | inworld | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| jina-ai | open-sse/providers/registry/jina-ai.js | jina | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| jina-reader | open-sse/providers/registry/jina-reader.js | jina-reader | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| kilocode | open-sse/providers/registry/kilocode.js | kc | 8 | 0 | 0 | 0 | 0 | 0 | true | true |
| kimchi | open-sse/providers/registry/kimchi.js | kimchi | 8 | 0 | 0 | 0 | 0 | 0 | false | true |
| kimi | open-sse/providers/registry/kimi.js | kimi | 10 | 0 | 0 | 0 | 0 | 0 | false | false |
| kiro | open-sse/providers/registry/kiro.js | kr | 48 | 0 | 0 | 0 | 0 | 0 | false | false |
| linkup | open-sse/providers/registry/linkup.js | linkup | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| local-device | open-sse/providers/registry/local-device.js | local-device | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| mimo-free | open-sse/providers/registry/mimo-free.js | mmf | 1 | 0 | 0 | 0 | 0 | 0 | true | true |
| minimax-cn | open-sse/providers/registry/minimax-cn.js | minimax-cn | 4 | 0 | 0 | 0 | 8 | 0 | false | false |
| minimax | open-sse/providers/registry/minimax.js | minimax | 4 | 1 | 0 | 0 | 8 | 0 | false | false |
| mistral | open-sse/providers/registry/mistral.js | mistral | 3 | 0 | 0 | 1 | 0 | 0 | false | false |
| mmf | open-sse/providers/registry/mmf.js | mmf | 1 | 0 | 0 | 0 | 0 | 0 | false | false |
| nanobanana | open-sse/providers/registry/nanobanana.js | nanobanana | 0 | 2 | 0 | 0 | 0 | 0 | false | false |
| nebius | open-sse/providers/registry/nebius.js | nebius | 1 | 0 | 0 | 1 | 0 | 0 | false | false |
| nvidia | open-sse/providers/registry/nvidia.js | nvidia | 14 | 0 | 1 | 1 | 2 | 0 | false | false |
| ollama-local | open-sse/providers/registry/ollama-local.js | ollama-local | 0 | 0 | 0 | 97 | 15 | 0 | false | false |
| ollama | open-sse/providers/registry/ollama.js | ollama | 8 | 0 | 0 | 0 | 0 | 0 | false | false |
| ollama-search | open-sse/providers/registry/ollama-search.js | ollama-search | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| qoder-cn | open-sse/providers/registry/qoder-cn.js | qdcn | 16 | 0 | 0 | 0 | 0 | 0 | false | false |
| openai | open-sse/providers/registry/openai.js | openai | 21 | 6 | 3 | 3 | 3 | 0 | false | false |
| opencode-go | open-sse/providers/registry/opencode-go.js | opencode-go | 44 | 0 | 0 | 0 | 0 | 0 | true | true |
| opencode-zen | open-sse/providers/registry/opencode-zen.js | ocz | 71 | 0 | 0 | 0 | 0 | 0 | true | true |
| opencode | open-sse/providers/registry/opencode.js | oc | 3 | 0 | 0 | 0 | 0 | 0 | true | true |
| openrouter | open-sse/providers/registry/openrouter.js | openrouter | 0 | 4 | 0 | 7 | 3 | 3 | true | true |
| perplexity-web | open-sse/providers/registry/perplexity-web.js | perplexity-web | 7 | 0 | 0 | 0 | 0 | 0 | false | false |
| perplexity | open-sse/providers/registry/perplexity.js | perplexity | 2 | 0 | 0 | 0 | 0 | 0 | false | false |
| perplexity-agent | open-sse/providers/registry/perplexity-agent.js | perplexity-agent | 11 | 0 | 0 | 0 | 0 | 0 | true | true |
| playht | open-sse/providers/registry/playht.js | playht | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| qoder | open-sse/providers/registry/qoder.js | qd | 18 | 0 | 0 | 0 | 0 | 0 | false | false |
| recraft | open-sse/providers/registry/recraft.js | recraft | 0 | 2 | 0 | 0 | 0 | 0 | false | false |
| runwayml | open-sse/providers/registry/runwayml.js | runwayml | 0 | 2 | 0 | 0 | 0 | 2 | false | false |
| sdwebui | open-sse/providers/registry/sdwebui.js | sdwebui | 0 | 2 | 0 | 0 | 0 | 0 | false | false |
| searchapi | open-sse/providers/registry/searchapi.js | searchapi | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| searxng | open-sse/providers/registry/searxng.js | searxng | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| serper | open-sse/providers/registry/serper.js | serper | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| siliconflow | open-sse/providers/registry/siliconflow.js | siliconflow | 16 | 0 | 0 | 0 | 0 | 0 | false | false |
| sensenova | open-sse/providers/registry/sensenova.js | sensenova | 7 | 2 | 0 | 0 | 0 | 0 | false | false |
| stability-ai | open-sse/providers/registry/stability-ai.js | stability-ai | 0 | 5 | 0 | 0 | 0 | 0 | false | false |
| tavily | open-sse/providers/registry/tavily.js | tavily | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| together | open-sse/providers/registry/together.js | together | 4 | 0 | 0 | 2 | 0 | 0 | false | false |
| topaz | open-sse/providers/registry/topaz.js | topaz | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| tortoise | open-sse/providers/registry/tortoise.js | tortoise | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| venice | open-sse/providers/registry/venice.js | venice | 9 | 3 | 0 | 3 | 0 | 0 | true | true |
| vercel-ai-gateway | open-sse/providers/registry/vercel-ai-gateway.js | vercel-ai-gateway | 0 | 0 | 0 | 0 | 0 | 0 | true | true |
| vertex-partner | open-sse/providers/registry/vertex-partner.js | vertex-partner | 4 | 0 | 0 | 0 | 0 | 0 | false | false |
| vertex | open-sse/providers/registry/vertex.js | vertex | 5 | 0 | 0 | 0 | 0 | 4 | false | false |
| volcengine-ark | open-sse/providers/registry/volcengine-ark.js | volcengine-ark | 9 | 0 | 0 | 0 | 0 | 0 | false | false |
| voyage-ai | open-sse/providers/registry/voyage-ai.js | voyage-ai | 0 | 0 | 0 | 7 | 0 | 0 | false | false |
| xai | open-sse/providers/registry/xai.js | xai | 7 | 1 | 0 | 0 | 0 | 1 | false | false |
| xiaomi-mimo | open-sse/providers/registry/xiaomi-mimo.js | xiaomi-mimo | 7 | 0 | 0 | 0 | 1 | 0 | false | false |
| xiaomi-tokenplan | open-sse/providers/registry/xiaomi-tokenplan.js | xiaomi-tokenplan | 2 | 0 | 1 | 0 | 3 | 0 | false | false |
| youcom | open-sse/providers/registry/youcom.js | youcom | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| alims-intl | open-sse/providers/registry/alims-intl.js | alims-intl | 7 | 0 | 0 | 0 | 0 | 0 | false | false |
| codebuddy-intl | open-sse/providers/registry/codebuddy-intl.js | cbai | 15 | 0 | 0 | 0 | 0 | 0 | false | false |
| zed | open-sse/providers/registry/zed.js | zd | 0 | 0 | 0 | 0 | 0 | 0 | false | true |
| api-airforce | open-sse/providers/registry/api-airforce.js | af | 3 | 0 | 0 | 0 | 0 | 0 | true | true |
| baidu | open-sse/providers/registry/baidu.js | qianfan | 7 | 0 | 0 | 0 | 0 | 0 | false | false |
| bazaarlink | open-sse/providers/registry/bazaarlink.js | bzl | 24 | 0 | 0 | 0 | 0 | 0 | false | false |
| bluesminds | open-sse/providers/registry/bluesminds.js | bm | 14 | 0 | 0 | 0 | 0 | 0 | false | false |
| kilo-gateway | open-sse/providers/registry/kilo-gateway.js | kgw | 6 | 0 | 0 | 0 | 0 | 0 | false | false |
| llm7 | open-sse/providers/registry/llm7.js | llm7 | 5 | 0 | 0 | 0 | 0 | 0 | false | true |
| sambanova | open-sse/providers/registry/sambanova.js | samba | 1 | 0 | 0 | 0 | 0 | 0 | false | false |
| tencent | open-sse/providers/registry/tencent.js | hunyuan | 2 | 0 | 0 | 0 | 0 | 0 | false | false |
| morph | open-sse/providers/registry/morph.js | morph | 6 | 0 | 0 | 0 | 0 | 0 | false | false |
| poolside | open-sse/providers/registry/poolside.js | poolside | 2 | 0 | 0 | 0 | 0 | 0 | false | false |
| tokenrouter | open-sse/providers/registry/tokenrouter.js | tokenrouter | 22 | 0 | 0 | 0 | 0 | 0 | true | true |
| selfhosted-stt | open-sse/providers/registry/selfhosted-stt.js | selfhosted-stt | 0 | 0 | 1 | 0 | 0 | 0 | false | false |
| selfhosted-tts | open-sse/providers/registry/selfhosted-tts.js | selfhosted-tts | 0 | 0 | 0 | 0 | 1 | 0 | false | false |
| selfhosted-embedding | open-sse/providers/registry/selfhosted-embedding.js | selfhosted-embedding | 0 | 0 | 0 | 1 | 0 | 0 | false | false |
| fish-audio | open-sse/providers/registry/fish-audio.js | fish | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| alitp-intl | open-sse/providers/registry/alitp-intl.js | alitp-intl | 6 | 0 | 0 | 0 | 0 | 0 | false | false |
| xquik | open-sse/providers/registry/xquik.js | xquik | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| tokenharbor | open-sse/providers/registry/tokenharbor.js | tokenharbor | 6 | 0 | 0 | 0 | 0 | 0 | true | true |
| dahl | open-sse/providers/registry/dahl.js | dahl | 3 | 0 | 0 | 0 | 0 | 0 | true | true |
| atria | open-sse/providers/registry/atria.js | atria | 1 | 0 | 0 | 0 | 0 | 0 | false | true |
| agnes | open-sse/providers/registry/agnes.js | agnes | 4 | 0 | 0 | 0 | 0 | 0 | false | true |
| bai | open-sse/providers/registry/bai.js | bai | 0 | 0 | 0 | 0 | 0 | 0 | true | true |
| tinyfish | open-sse/providers/registry/tinyfish.js | tinyfish | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| v1m | open-sse/providers/registry/v1m.js | v1m | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| muse | open-sse/providers/registry/muse.js | muse | 5 | 0 | 0 | 0 | 0 | 0 | false | true |
| minimax-code | open-sse/providers/registry/minimax-code.js | mm | 4 | 0 | 0 | 0 | 0 | 0 | true | false |
| minimax-code-global | open-sse/providers/registry/minimax-code-global.js | mmg | 4 | 0 | 0 | 0 | 0 | 0 | true | false |
| bedrock | open-sse/providers/registry/bedrock.js | br | 11 | 0 | 0 | 0 | 0 | 0 | false | true |
| bedrock-xai | open-sse/providers/registry/bedrock-xai.js | brx | 2 | 0 | 0 | 0 | 0 | 0 | false | true |
| nous | open-sse/providers/registry/nous.js | nous | 8 | 0 | 0 | 0 | 0 | 0 | true | true |
| deepseek-web | open-sse/providers/registry/deepseek-web.js | deepseek-web | 14 | 0 | 0 | 0 | 0 | 0 | false | false |
| gemini-web | open-sse/providers/registry/gemini-web.js | gemini-web | 3 | 1 | 0 | 0 | 0 | 0 | false | false |
| muse-web | open-sse/providers/registry/muse-web.js | muse-web | 1 | 1 | 0 | 0 | 0 | 1 | false | false |
| chatgpt-web | open-sse/providers/registry/chatgpt-web.js | chatgpt-web | 8 | 1 | 0 | 0 | 0 | 0 | false | false |
| veoaifree-web | open-sse/providers/registry/veoaifree-web.js | veo-free | 0 | 1 | 0 | 0 | 0 | 2 | false | false |
| uc-web | open-sse/providers/registry/uc-web.js | uc | 0 | 23 | 0 | 0 | 0 | 30 | false | true |
| runcrate | open-sse/providers/registry/runcrate.js | runcrate | 6 | 0 | 0 | 0 | 0 | 0 | false | false |
| nace | open-sse/providers/registry/nace.js | nace | 0 | 0 | 0 | 0 | 0 | 0 | false | false |
| sensenova-intl | open-sse/providers/registry/sensenova-intl.js | sensenova-intl | 3 | 2 | 0 | 0 | 0 | 0 | false | false |
| synthetic | open-sse/providers/registry/synthetic.js | synthetic | 9 | 0 | 0 | 0 | 0 | 0 | false | true |

## Total

- Providers: 145
- Static LLM: 896
- Excluded kind counts: image 121, stt 27, embedding 131, tts 47, video 44; total 370.
- Mechanical crosschecks PASS: 145 review rows dan provider total; jumlah row LLM 896; 370 exclusions dan seluruh jumlah per-kind; flags/catalog keys cocok candidate; collision dan owner cocok candidate; `mimo-free` mendahului `mmf`.

## Commands dan hasil

```sh
export AUD=/var/folders/60/_ldv6xgj6tn846fmqk8_mx_r0000gn/T/opencode/catalog-audit
mkdir -p "$AUD"
bun run extract:9router-catalog -- --source-dir .slim/clonedeps/repos/decolua__9router --output "$AUD/catalog.ts"
# {"providers":145,"llm":896,"excluded":370,"image":121,"stt":27,"embedding":131,"tts":47,"video":44}
shasum -a 256 "$AUD/catalog.ts"
# 8adccc11ac15f9de8306187cddda6105c1d90b28994ff1fa1c5d29ee0ad33e09
bun -e 'import { extractCatalog, renderReviewMetadata } from "./scripts/extract-9router-llm-catalog.ts"; import { writeFileSync } from "node:fs"; const r = await extractCatalog({ sourceDir: ".slim/clonedeps/repos/decolua__9router" }); writeFileSync(process.env.AUD + "/review.json", renderReviewMetadata(r));'
shasum -a 256 "$AUD/review.json"
# 0a7f45f95b05fb1eac204a085637d36fb3c0d1a1b34df5178d6c34ebbf2f13bb
bun run extract:9router-catalog -- --source-dir .slim/clonedeps/repos/decolua__9router --output "$AUD/catalog.fresh.ts"
cmp -s src/generated/9router-llm-catalog.ts "$AUD/catalog.fresh.ts"
# lulus
bun test tests/extract-9router-llm-catalog.test.ts
# 78 pass, 0 fail
```
