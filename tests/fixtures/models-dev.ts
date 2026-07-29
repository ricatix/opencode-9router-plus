import type { ModelsDevModel, ModelsDevProvider } from "../../src/models-dev.js";

export const apiCatalog: Record<string, ModelsDevProvider> = {
  codex: { id: "codex", name: "Codex", models: { "gpt-5.6-sol": { id: "gpt-5.6-sol", name: "GPT 5.6 Sol", family: "metadata-only", reasoning_options: [{ type: "effort", values: ["none", "low", "medium", "high", "xhigh", "max"] }] } } },
  openrouter: { id: "openrouter", name: "OpenRouter", models: { "openai/gpt-5.6-sol": { id: "openai/gpt-5.6-sol", name: "OpenRouter GPT" } } },
  "provider-a": { id: "provider-a", name: "Provider A", models: { "shared-model": { id: "shared-model", name: "Provider A Shared" } } },
  "provider-b": { id: "provider-b", name: "Provider B", models: { "shared-model": { id: "shared-model", name: "Provider B Shared" } } },
};

export const modelCatalog: Record<string, ModelsDevModel> = {
  "codex/gpt-5.6-sol": { id: "codex/gpt-5.6-sol", name: "Model-only GPT" },
};
