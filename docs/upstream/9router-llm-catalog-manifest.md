# 9router LLM catalog manifest

## Pin dan batas keselamatan

- Upstream: `decolua/9router`
- Commit pin: `79918c7830695bbca4a45c9fea4a42c3e9fd73d1`
- Tool ini bounded transcription, bukan semantic verifier.
- Tidak menjalankan upstream, network, eval, atau install. Review JSON hanya sementara: `/var/folders/60/_ldv6xgj6tn846fmqk8_mx_r0000gn/T/opencode/9router-llm-catalog.review.json`.

## Reproduksibilitas

| Artefak               | SHA-256                                                            | Hasil                             |
| --------------------- | ------------------------------------------------------------------ | --------------------------------- |
| candidate             | `016aafddda2d321f470e5c00d2d2ebc89d88d8ecd4f4cfff1b582de9f36f823c` | cocok expected SHA                |
| snapshot              | `016aafddda2d321f470e5c00d2d2ebc89d88d8ecd4f4cfff1b582de9f36f823c` | candidate disalin tanpa perubahan |
| fresh                 | `016aafddda2d321f470e5c00d2d2ebc89d88d8ecd4f4cfff1b582de9f36f823c` | `cmp -s` dengan snapshot lulus    |
| review JSON sementara | `04e812ac51554ef939f20ad0540291df2d9c5e77c783db12576d4e8cb42b685a` | metadata review baru              |

## Source files terurut

- `open-sse/config/grokCli.js`
- `open-sse/config/providerModels.js`
- `open-sse/providers/capabilities.js`
- `open-sse/providers/index.js`
- `open-sse/providers/models/helpers.js`
- `open-sse/providers/models/schema.js`
- `open-sse/providers/registry/alicode-intl.js`
- `open-sse/providers/registry/alicode.js`
- `open-sse/providers/registry/alims-intl.js`
- `open-sse/providers/registry/anthropic.js`
- `open-sse/providers/registry/antigravity.js`
- `open-sse/providers/registry/assemblyai.js`
- `open-sse/providers/registry/aws-polly.js`
- `open-sse/providers/registry/azure.js`
- `open-sse/providers/registry/black-forest-labs.js`
- `open-sse/providers/registry/blackbox.js`
- `open-sse/providers/registry/brave-search.js`
- `open-sse/providers/registry/byteplus.js`
- `open-sse/providers/registry/cartesia.js`
- `open-sse/providers/registry/cerebras.js`
- `open-sse/providers/registry/chutes.js`
- `open-sse/providers/registry/claude.js`
- `open-sse/providers/registry/cline.js`
- `open-sse/providers/registry/clinepass.js`
- `open-sse/providers/registry/cloudflare-ai.js`
- `open-sse/providers/registry/codebuddy-cn.js`
- `open-sse/providers/registry/codex.js`
- `open-sse/providers/registry/cohere.js`
- `open-sse/providers/registry/comfyui.js`
- `open-sse/providers/registry/commandcode.js`
- `open-sse/providers/registry/coqui.js`
- `open-sse/providers/registry/cursor.js`
- `open-sse/providers/registry/deepgram.js`
- `open-sse/providers/registry/deepseek.js`
- `open-sse/providers/registry/edge-tts.js`
- `open-sse/providers/registry/elevenlabs.js`
- `open-sse/providers/registry/exa.js`
- `open-sse/providers/registry/fal-ai.js`
- `open-sse/providers/registry/featherless.js`
- `open-sse/providers/registry/firecrawl.js`
- `open-sse/providers/registry/fireworks.js`
- `open-sse/providers/registry/gemini-cli.js`
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
- `open-sse/providers/registry/kilocode.js`
- `open-sse/providers/registry/kimchi.js`
- `open-sse/providers/registry/kimi.js`
- `open-sse/providers/registry/kiro.js`
- `open-sse/providers/registry/linkup.js`
- `open-sse/providers/registry/local-device.js`
- `open-sse/providers/registry/mimo-free.js`
- `open-sse/providers/registry/minimax-cn.js`
- `open-sse/providers/registry/minimax.js`
- `open-sse/providers/registry/mistral.js`
- `open-sse/providers/registry/mmf.js`
- `open-sse/providers/registry/nanobanana.js`
- `open-sse/providers/registry/nebius.js`
- `open-sse/providers/registry/nvidia.js`
- `open-sse/providers/registry/ollama-local.js`
- `open-sse/providers/registry/ollama.js`
- `open-sse/providers/registry/openai.js`
- `open-sse/providers/registry/opencode-go.js`
- `open-sse/providers/registry/opencode.js`
- `open-sse/providers/registry/openrouter.js`
- `open-sse/providers/registry/perplexity-agent.js`
- `open-sse/providers/registry/perplexity-web.js`
- `open-sse/providers/registry/perplexity.js`
- `open-sse/providers/registry/playht.js`
- `open-sse/providers/registry/qoder.js`
- `open-sse/providers/registry/qwen.js`
- `open-sse/providers/registry/recraft.js`
- `open-sse/providers/registry/runwayml.js`
- `open-sse/providers/registry/sdwebui.js`
- `open-sse/providers/registry/searchapi.js`
- `open-sse/providers/registry/searxng.js`
- `open-sse/providers/registry/serper.js`
- `open-sse/providers/registry/siliconflow.js`
- `open-sse/providers/registry/stability-ai.js`
- `open-sse/providers/registry/tavily.js`
- `open-sse/providers/registry/together.js`
- `open-sse/providers/registry/topaz.js`
- `open-sse/providers/registry/tortoise.js`
- `open-sse/providers/registry/venice.js`
- `open-sse/providers/registry/vercel-ai-gateway.js`
- `open-sse/providers/registry/vertex-partner.js`
- `open-sse/providers/registry/vertex.js`
- `open-sse/providers/registry/volcengine-ark.js`
- `open-sse/providers/registry/voyage-ai.js`
- `open-sse/providers/registry/xai.js`
- `open-sse/providers/registry/xiaomi-mimo.js`
- `open-sse/providers/registry/xiaomi-tokenplan.js`
- `open-sse/providers/registry/youcom.js`
- `open-sse/providers/schema.js`
- `open-sse/providers/thinkingLevels.js`

## Metadata proyeksi

- `projectionVersion: 1`.
- Proyeksi: `codex-review-v1`, `grok-cli-reasoning-v1`, `capability-resolution-v1`, `models-fetcher-marker-v1`, `route-owner-v1`
- Dynamic IDs: `grok-web`, `kilocode`, `kimchi`, `mimo-free`, `opencode`, `openrouter`, `perplexity-agent`, `venice`, `vercel-ai-gateway`
- Collision: `{mmf:[mimo-free,mmf]}`; owner: `mmf`.
- Flags `modelsFetcher`/`passthroughModels` dan `catalogKey` tiap provider cocok candidate. Collision route key cocok candidate; sole collision `{ mmf: ["mimo-free", "mmf"] }`, owner `mmf`. Urutan source `mimo-free` mendahului `mmf`.
- Golden Sol: route `cx/gpt-5.6-sol`; model `gpt-5.6-sol`, reasoning `{ reasoning: true, thinkingFormat: "openai" }`; review `gpt-5.6-sol-review` memakai `upstreamModelId: "gpt-5.6-sol"` dan reasoning sama; level terurut `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`.
- Golden Grok positif: `gcli/grok-4.5-high` punya reasoning `{ reasoning: true, thinkingFormat: "openai" }`. Batas proyeksi negatif: ini menguji predicate extractor untuk model Grok CLI yang diproyeksikan, bukan mengklaim kapabilitas upstream lain tidak ada.
- Golden ZAI: `glm/glm-5.2` bernama `GLM 5.2`, reasoning `{ reasoning: true, thinkingFormat: "zai", thinkingCanDisable: true, thinkingRange: null }`; `reasoningPicker.formatLevels.zai` tepat `[none, thinking]`. `thinkingRange: null` fakta terpisah, bukan bukti perilaku non-discrete.

## Eksklusi dependensi dan fakta

- `open-sse/providers/pricing.js`: matcher implementation tidak dieksekusi; reviewed local projection dipakai.
- `open-sse/config/providers.js`: output tidak disalin.
- `open-sse/providers/shared.js`: transport/auth-only.
- unsupported authoritative syntax: none.
- conflicting unresolved facts: none.

## Matriks review (100 baris)

| providerId        | sourceFile                                       | catalogKey        | staticLlmCount | image | stt | embedding | tts | video | modelsFetcher | passthroughModels |
| ----------------- | ------------------------------------------------ | ----------------- | -------------: | ----: | --: | --------: | --: | ----: | ------------- | ----------------- |
| alicode-intl      | open-sse/providers/registry/alicode-intl.js      | alicode-intl      |              7 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| alicode           | open-sse/providers/registry/alicode.js           | alicode           |              8 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| anthropic         | open-sse/providers/registry/anthropic.js         | anthropic         |              3 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| antigravity       | open-sse/providers/registry/antigravity.js       | ag                |              9 |     1 |   0 |         0 |   0 |     0 | false         | false             |
| assemblyai        | open-sse/providers/registry/assemblyai.js        | assemblyai        |              0 |     0 |   4 |         0 |   0 |     0 | false         | false             |
| aws-polly         | open-sse/providers/registry/aws-polly.js         | polly             |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| azure             | open-sse/providers/registry/azure.js             | azure             |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| black-forest-labs | open-sse/providers/registry/black-forest-labs.js | black-forest-labs |              0 |     6 |   0 |         0 |   0 |     0 | false         | false             |
| blackbox          | open-sse/providers/registry/blackbox.js          | blackbox          |             10 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| brave-search      | open-sse/providers/registry/brave-search.js      | brave             |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| byteplus          | open-sse/providers/registry/byteplus.js          | byteplus          |              7 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| cartesia          | open-sse/providers/registry/cartesia.js          | cartesia          |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| cerebras          | open-sse/providers/registry/cerebras.js          | cerebras          |              6 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| chutes            | open-sse/providers/registry/chutes.js            | chutes            |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| claude            | open-sse/providers/registry/claude.js            | cc                |              5 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| cline             | open-sse/providers/registry/cline.js             | cl                |              8 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| clinepass         | open-sse/providers/registry/clinepass.js         | clinepass         |             10 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| cloudflare-ai     | open-sse/providers/registry/cloudflare-ai.js     | cloudflare-ai     |             13 |    11 |   0 |         0 |   0 |     0 | false         | false             |
| codebuddy-cn      | open-sse/providers/registry/codebuddy-cn.js      | cbcn              |             15 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| codex             | open-sse/providers/registry/codex.js             | cx                |             14 |     3 |   0 |         0 |   0 |     0 | false         | false             |
| cohere            | open-sse/providers/registry/cohere.js            | cohere            |              3 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| comfyui           | open-sse/providers/registry/comfyui.js           | comfyui           |              0 |     2 |   0 |         0 |   0 |     0 | false         | false             |
| commandcode       | open-sse/providers/registry/commandcode.js       | commandcode       |             11 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| coqui             | open-sse/providers/registry/coqui.js             | coqui             |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| cursor            | open-sse/providers/registry/cursor.js            | cu                |             14 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| deepgram          | open-sse/providers/registry/deepgram.js          | deepgram          |              0 |     0 |   4 |         0 |   0 |     0 | false         | false             |
| deepseek          | open-sse/providers/registry/deepseek.js          | deepseek          |              6 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| edge-tts          | open-sse/providers/registry/edge-tts.js          | edge-tts          |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| elevenlabs        | open-sse/providers/registry/elevenlabs.js        | el                |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| exa               | open-sse/providers/registry/exa.js               | exa               |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| fal-ai            | open-sse/providers/registry/fal-ai.js            | fal-ai            |              0 |     7 |   0 |         0 |   0 |     0 | false         | false             |
| featherless       | open-sse/providers/registry/featherless.js       | featherless       |              7 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| firecrawl         | open-sse/providers/registry/firecrawl.js         | firecrawl         |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| fireworks         | open-sse/providers/registry/fireworks.js         | fireworks         |              3 |     0 |   0 |         1 |   0 |     0 | false         | false             |
| gemini-cli        | open-sse/providers/registry/gemini-cli.js        | gc                |              7 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| gemini            | open-sse/providers/registry/gemini.js            | gemini            |              7 |     3 |   4 |         5 |   3 |     0 | false         | false             |
| github            | open-sse/providers/registry/github.js            | gh                |             17 |     0 |   0 |         2 |   0 |     0 | false         | false             |
| gitlab            | open-sse/providers/registry/gitlab.js            | gitlab            |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| glm-cn            | open-sse/providers/registry/glm-cn.js            | glm-cn            |              6 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| glm               | open-sse/providers/registry/glm.js               | glm               |              5 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| google-pse        | open-sse/providers/registry/google-pse.js        | gpse              |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| google-tts        | open-sse/providers/registry/google-tts.js        | google-tts        |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| grok-cli          | open-sse/providers/registry/grok-cli.js          | gcli              |              5 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| grok-web          | open-sse/providers/registry/grok-web.js          | grok-web          |             12 |     0 |   0 |         0 |   0 |     0 | false         | true              |
| groq              | open-sse/providers/registry/groq.js              | groq              |              4 |     0 |   3 |         0 |   0 |     0 | false         | false             |
| huggingface       | open-sse/providers/registry/huggingface.js       | huggingface       |              0 |     2 |   2 |         0 |   0 |     0 | false         | false             |
| hyperbolic        | open-sse/providers/registry/hyperbolic.js        | hyperbolic        |              8 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| iflow             | open-sse/providers/registry/iflow.js             | if                |             15 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| inworld           | open-sse/providers/registry/inworld.js           | inworld           |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| jina-ai           | open-sse/providers/registry/jina-ai.js           | jina              |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| jina-reader       | open-sse/providers/registry/jina-reader.js       | jina-reader       |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| kilocode          | open-sse/providers/registry/kilocode.js          | kc                |              8 |     0 |   0 |         0 |   0 |     0 | true          | true              |
| kimchi            | open-sse/providers/registry/kimchi.js            | kimchi            |              8 |     0 |   0 |         0 |   0 |     0 | false         | true              |
| kimi              | open-sse/providers/registry/kimi.js              | kimi              |             10 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| kiro              | open-sse/providers/registry/kiro.js              | kr                |             40 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| linkup            | open-sse/providers/registry/linkup.js            | linkup            |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| local-device      | open-sse/providers/registry/local-device.js      | local-device      |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| mimo-free         | open-sse/providers/registry/mimo-free.js         | mmf               |              1 |     0 |   0 |         0 |   0 |     0 | true          | true              |
| minimax-cn        | open-sse/providers/registry/minimax-cn.js        | minimax-cn        |              4 |     0 |   0 |         0 |   8 |     0 | false         | false             |
| minimax           | open-sse/providers/registry/minimax.js           | minimax           |              4 |     1 |   0 |         0 |   8 |     0 | false         | false             |
| mistral           | open-sse/providers/registry/mistral.js           | mistral           |              3 |     0 |   0 |         1 |   0 |     0 | false         | false             |
| mmf               | open-sse/providers/registry/mmf.js               | mmf               |              1 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| nanobanana        | open-sse/providers/registry/nanobanana.js        | nanobanana        |              0 |     2 |   0 |         0 |   0 |     0 | false         | false             |
| nebius            | open-sse/providers/registry/nebius.js            | nebius            |              1 |     0 |   0 |         1 |   0 |     0 | false         | false             |
| nvidia            | open-sse/providers/registry/nvidia.js            | nvidia            |              7 |     0 |   1 |         1 |   2 |     0 | false         | false             |
| ollama-local      | open-sse/providers/registry/ollama-local.js      | ollama-local      |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| ollama            | open-sse/providers/registry/ollama.js            | ollama            |              7 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| openai            | open-sse/providers/registry/openai.js            | openai            |             20 |     3 |   3 |         3 |   3 |     0 | false         | false             |
| opencode-go       | open-sse/providers/registry/opencode-go.js       | opencode-go       |             14 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| opencode          | open-sse/providers/registry/opencode.js          | oc                |              0 |     0 |   0 |         0 |   0 |     0 | true          | true              |
| openrouter        | open-sse/providers/registry/openrouter.js        | openrouter        |              0 |     4 |   0 |         7 |   3 |     0 | true          | true              |
| perplexity-web    | open-sse/providers/registry/perplexity-web.js    | perplexity-web    |              7 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| perplexity        | open-sse/providers/registry/perplexity.js        | perplexity        |              2 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| perplexity-agent  | open-sse/providers/registry/perplexity-agent.js  | perplexity-agent  |             11 |     0 |   0 |         0 |   0 |     0 | true          | true              |
| playht            | open-sse/providers/registry/playht.js            | playht            |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| qoder             | open-sse/providers/registry/qoder.js             | qd                |              1 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| qwen              | open-sse/providers/registry/qwen.js              | qw                |              4 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| recraft           | open-sse/providers/registry/recraft.js           | recraft           |              0 |     2 |   0 |         0 |   0 |     0 | false         | false             |
| runwayml          | open-sse/providers/registry/runwayml.js          | runwayml          |              0 |     2 |   0 |         0 |   0 |     2 | false         | false             |
| sdwebui           | open-sse/providers/registry/sdwebui.js           | sdwebui           |              0 |     2 |   0 |         0 |   0 |     0 | false         | false             |
| searchapi         | open-sse/providers/registry/searchapi.js         | searchapi         |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| searxng           | open-sse/providers/registry/searxng.js           | searxng           |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| serper            | open-sse/providers/registry/serper.js            | serper            |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| siliconflow       | open-sse/providers/registry/siliconflow.js       | siliconflow       |             16 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| stability-ai      | open-sse/providers/registry/stability-ai.js      | stability-ai      |              0 |     5 |   0 |         0 |   0 |     0 | false         | false             |
| tavily            | open-sse/providers/registry/tavily.js            | tavily            |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| together          | open-sse/providers/registry/together.js          | together          |              4 |     0 |   0 |         2 |   0 |     0 | false         | false             |
| topaz             | open-sse/providers/registry/topaz.js             | topaz             |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| tortoise          | open-sse/providers/registry/tortoise.js          | tortoise          |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| venice            | open-sse/providers/registry/venice.js            | venice            |              9 |     3 |   0 |         3 |   0 |     0 | true          | true              |
| vercel-ai-gateway | open-sse/providers/registry/vercel-ai-gateway.js | vercel-ai-gateway |              0 |     0 |   0 |         0 |   0 |     0 | true          | true              |
| vertex-partner    | open-sse/providers/registry/vertex-partner.js    | vertex-partner    |              4 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| vertex            | open-sse/providers/registry/vertex.js            | vertex            |              4 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| volcengine-ark    | open-sse/providers/registry/volcengine-ark.js    | volcengine-ark    |              9 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| voyage-ai         | open-sse/providers/registry/voyage-ai.js         | voyage-ai         |              0 |     0 |   0 |         7 |   0 |     0 | false         | false             |
| xai               | open-sse/providers/registry/xai.js               | xai               |              4 |     1 |   0 |         0 |   0 |     1 | false         | false             |
| xiaomi-mimo       | open-sse/providers/registry/xiaomi-mimo.js       | xiaomi-mimo       |              4 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| xiaomi-tokenplan  | open-sse/providers/registry/xiaomi-tokenplan.js  | xiaomi-tokenplan  |              9 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| youcom            | open-sse/providers/registry/youcom.js            | youcom            |              0 |     0 |   0 |         0 |   0 |     0 | false         | false             |
| alims-intl        | open-sse/providers/registry/alims-intl.js        | alims-intl        |              7 |     0 |   0 |         0 |   0 |     0 | false         | false             |

## Total

- Providers: 100
- Static LLM: 468
- Excluded kind counts: image 60, stt 21, embedding 33, tts 27, video 3; total 144.
- Mechanical crosschecks PASS: 100 review rows dan provider total; jumlah row LLM 468; 144 exclusions dan seluruh jumlah per-kind; flags/catalog keys cocok candidate; collision dan owner cocok candidate; `mimo-free` mendahului `mmf`.

## Commands dan hasil

```sh
bun run extract:9router-catalog -- --source-dir .slim/clonedeps/repos/decolua__9router --output /var/folders/60/_ldv6xgj6tn846fmqk8_mx_r0000gn/T/opencode/9router-llm-catalog.candidate.ts
# {"providers":100,"llm":468,"excluded":144,"image":60,"stt":21,"embedding":33,"tts":27,"video":3}
shasum -a 256 /var/folders/60/_ldv6xgj6tn846fmqk8_mx_r0000gn/T/opencode/9router-llm-catalog.candidate.ts
# 016aafddda2d321f470e5c00d2d2ebc89d88d8ecd4f4cfff1b582de9f36f823c
bun -e 'import { extractCatalog, renderReviewMetadata } from "./scripts/extract-9router-llm-catalog.ts"; const result = await extractCatalog({ sourceDir: ".slim/clonedeps/repos/decolua__9router" }); await Bun.write("/var/folders/60/_ldv6xgj6tn846fmqk8_mx_r0000gn/T/opencode/9router-llm-catalog.review.json", renderReviewMetadata(result));'
shasum -a 256 /var/folders/60/_ldv6xgj6tn846fmqk8_mx_r0000gn/T/opencode/9router-llm-catalog.review.json
# 04e812ac51554ef939f20ad0540291df2d9c5e77c783db12576d4e8cb42b685a
bun run extract:9router-catalog -- --source-dir .slim/clonedeps/repos/decolua__9router --output /var/folders/60/_ldv6xgj6tn846fmqk8_mx_r0000gn/T/opencode/9router-llm-catalog.fresh.ts
cmp -s src/generated/9router-llm-catalog.ts /var/folders/60/_ldv6xgj6tn846fmqk8_mx_r0000gn/T/opencode/9router-llm-catalog.fresh.ts
# lulus
```
