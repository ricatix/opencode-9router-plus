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
  globalThis.fetch = (async () => new Response(JSON.stringify({ models: [{ id: "cx/gpt-5.6-sol", capabilities: { reasoning: true } }, { id: "cx/gpt-5.6-terra", kind: "image" }, { id: "image/model", kind: "image" }, { id: "opaque", kind: "unknown" }] }))) as typeof fetch;
  const hooks = await plugin({} as never);
  const cfg: any = {};
  await hooks.config!(cfg);
  expect(cfg.provider["9router"].models["cx/gpt-5.6-sol"].variants).toEqual({ none: { reasoningEffort: "none" }, minimal: { reasoningEffort: "minimal" }, low: { reasoningEffort: "low" }, medium: { reasoningEffort: "medium" }, high: { reasoningEffort: "high" }, xhigh: { reasoningEffort: "xhigh" }, max: { reasoningEffort: "max" } });
  expect(cfg.provider["9router"].models["cx/gpt-5.6-terra"]).toBeDefined();
  expect(cfg.provider["9router"].models["image/model"]).toBeUndefined();
  expect(cfg.provider["9router"].models.opaque).toBeDefined();
  expect(cfg.model).toBe("9router/cx/gpt-5.6-sol");
  const existing: any = { model: "other/model", provider: { "9router": { models: { "cx/gpt-5.6-sol": { id: "keep" } } } } };
  await hooks.config!(existing);
  expect(existing.model).toBe("other/model");
  expect(existing.provider["9router"].models["cx/gpt-5.6-sol"]).toEqual({ id: "keep" });
  expect(pickDefaultModel([{ id: "raw/suffix " }])).toBe("raw/suffix ");
});

test("default model returns raw ID, prioritizes gpt, and handles empty discovery", () => {
  expect(pickDefaultModel([])).toBeNull();
  expect(pickDefaultModel([{ id: "anthropic/claude-4" }, { id: "cx/gpt-5.6-sol" }])).toBe("cx/gpt-5.6-sol");
});

test("config excludes unmatched known non-LLM kinds and defaults to eligible runtime ID", async () => {
  const nonLlmKinds = ["image", "tts", "stt", "embedding", "image-to-text", "web"];
  const models = [
    ...nonLlmKinds.map((kind) => ({ id: `unmatched/${kind}`, kind })),
    { id: "later/eligible" },
  ];
  globalThis.fetch = (async () => new Response(JSON.stringify({ models }))) as typeof fetch;
  const hooks = await plugin({} as never);
  const cfg: any = {};
  await hooks.config!(cfg);
  for (const kind of nonLlmKinds) expect(cfg.provider["9router"].models[`unmatched/${kind}`]).toBeUndefined();
  expect(cfg.provider["9router"].models["later/eligible"]).toBeDefined();
  expect(cfg.model).toBe("9router/later/eligible");
});
