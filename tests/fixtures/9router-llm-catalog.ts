import type { NineRouterLlmCatalog } from "../../src/route-types.js";

export const CATALOG_FIXTURE: NineRouterLlmCatalog = {
  sourceCommit: "0123456789abcdef0123456789abcdef01234567",
  sourceFiles: ["open-sse/providers/registry/index.js"],
  providers: {
    codex: { id: "codex", catalogKey: "cx", aliases: [], models: [{ id: "gpt-5.6-sol", name: "GPT 5.6 Sol", kind: "llm" }] },
    "grok-cli": { id: "grok-cli", catalogKey: "gcli", aliases: ["gb"], models: [{ id: "grok-4.5-high", kind: "llm", canonicalProvider: "xai", canonicalModelId: "grok-4.5" }] },
  },
  reasoningPicker: { formatLevels: {}, patternLevels: [] },
};
