import { afterEach, describe, expect, test } from "bun:test";
import plugin, { extractDiscoveryEntries, listModels, pickDefaultModel } from "../src/index.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe("discovery", () => {
  test("preserves entry fields and name fallback", () => {
    expect(extractDiscoveryEntries({ models: [{ id: " raw/id ", name: "Display", capabilities: { reasoning: true }, extra: 1 }, { name: "fallback" }] })).toEqual([
      { id: " raw/id ", name: "Display", capabilities: { reasoning: true } }, { id: "fallback", name: "fallback" },
    ]);
  });

  test("handles scalars and ignores invalid values", () => {
    expect(extractDiscoveryEntries(["x", 12, false, null, [], {}, { id: "" }, { id: {} }])).toEqual([{ id: "x" }, { id: "12" }, { id: "false" }]);
  });

  test("falls back across endpoints", async () => {
    const urls: string[] = [];
    globalThis.fetch = (async (url: string) => { urls.push(url); return new Response(JSON.stringify(url.endsWith("/model") ? { data: [{ id: "x" }] } : [])); }) as typeof fetch;
    expect(await listModels("https://router/v1", 50, "key")).toEqual([{ id: "x" }]);
    expect(urls).toEqual(["https://router/v1/models", "https://router/v1/model"]);
  });
});

test("config preserves existing model/default and configures raw IDs with variants", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ models: [{ id: "openai-compatible-team/private-model", capabilities: { reasoning: true } }] }))) as typeof fetch;
  const hooks = await plugin({} as never);
  const cfg: any = {};
  await hooks.config!(cfg);
  expect(cfg.provider["9router"].models["openai-compatible-team/private-model"].variants.high).toEqual({ reasoningEffort: "high" });
  expect(cfg.provider["9router"].models["openai-compatible-team/private-model"].variants.default).toBeUndefined();
  expect(cfg.model).toBe("9router/openai-compatible-team/private-model");
  const existing: any = { model: "other/model", provider: { "9router": { models: { "openai-compatible-team/private-model": { id: "keep" } } } } };
  await hooks.config!(existing);
  expect(existing.model).toBe("other/model");
  expect(existing.provider["9router"].models["openai-compatible-team/private-model"]).toEqual({ id: "keep" });
  expect(pickDefaultModel([{ id: "raw/suffix " }])).toBe("raw/suffix ");
});

test("default model returns raw ID, prioritizes gpt, and handles empty discovery", () => {
  expect(pickDefaultModel([])).toBeNull();
  expect(pickDefaultModel([{ id: "anthropic/claude-4" }, { id: "cx/gpt-5.6-sol" }])).toBe("cx/gpt-5.6-sol");
});
