import type { RouteMapSnapshot } from "../route-types.js";

export const ROUTE_MAP_SNAPSHOT: RouteMapSnapshot = {
  sourceCommit: "79918c7830695bbca4a45c9fea4a42c3e9fd73d1",
  directProviders: ["openai", "openrouter", "anthropic", "google", "azure", "mistral", "deepseek", "zai", "zhipuai", "xai", "groq", "cohere", "perplexity", "minimax", "stepfun", "hunyuan", "nvidia", "togetherai", "deepinfra", "cerebras", "featherless", "chutes"],
  aliases: { cx: "codex", gcli: "grok-cli", gb: "grok-cli", bb: "blackbox" },
  providerRules: { codex: "openai", "grok-cli": "xai" },
  suffixRules: { codex: ["-review"], "grok-cli": ["-high", "-medium", "-low"], deepseek: ["-none", "-max"] },
  wrapperRules: { blackbox: { prefix: "blackboxai/", providerAliases: { "x-ai": "xai" } } },
  prefixRules: { "deepseek-": "deepseek", "kimi-": "moonshot", qwen: "qwen", "glm-": "zhipuai", "minimax-": "minimax" },
  upstreamModels: {},
};
