import { describe, expect, test } from "bun:test";
import { resolveModel } from "../src/model-mapper.js";

describe("resolveModel", () => {
  test("uses catalog variants despite runtime range and raw ID/name", async () => {
    const calls: unknown[][] = [];
    const discovery = { id: "cx/gpt-5.6-sol", capabilities: { reasoning: true, thinkingRange: ["low"] } };
    const entry = await resolveModel(discovery.id, discovery, {
      lookupModelsDev: async (...args) => { calls.push(args); return { providerModel: { id: "gpt-5.6-sol", name: "Provider", family: "provider", reasoning_options: [{ type: "effort", values: ["low"] }] }, modelOnly: null }; },
    });
    expect(calls).toEqual([["codex", "codex/gpt-5.6-sol"]]);
    expect(entry.id).toBe("cx/gpt-5.6-sol");
    expect(entry.name).toBe("Provider");
    expect(entry.variants).toEqual({ none: { reasoningEffort: "none" }, minimal: { reasoningEffort: "minimal" }, low: { reasoningEffort: "low" }, medium: { reasoningEffort: "medium" }, high: { reasoningEffort: "high" }, xhigh: { reasoningEffort: "xhigh" }, max: { reasoningEffort: "max" } });
  });

  test("prefers provider metadata over model-only metadata", async () => {
    const entry = await resolveModel("cx/gpt-5.6-sol", { id: "cx/gpt-5.6-sol", capabilities: { reasoning: true } }, {
      lookupModelsDev: async () => ({ providerModel: { id: "x", name: "x", family: "provider", reasoning_options: [{ type: "effort", values: ["high"] }] }, modelOnly: { id: "x", name: "x", family: "model", reasoning_options: [{ type: "effort", values: ["low"] }] } }),
    });
    expect(entry.family).toBe("provider");
    expect(entry.variants).toEqual({ none: { reasoningEffort: "none" }, minimal: { reasoningEffort: "minimal" }, low: { reasoningEffort: "low" }, medium: { reasoningEffort: "medium" }, high: { reasoningEffort: "high" }, xhigh: { reasoningEffort: "xhigh" }, max: { reasoningEffort: "max" } });
  });

  test("merges provider and model-only metadata field by field", async () => {
    const entry = await resolveModel("cx/gpt-5.6-sol", undefined, {
      lookupModelsDev: async () => ({
        providerModel: {
          id: "x",
          name: "Provider Name",
          family: "provider-family",
          limit: { context: 200000, output: 10000 },
        },
        modelOnly: {
          id: "x",
          name: "Global Name",
          family: "global-family",
          attachment: true,
          reasoning: true,
          temperature: false,
          tool_call: false,
          release_date: "2025-01-01",
          cost: { input: 1, output: 2 },
          modalities: { input: ["text", "image"], output: ["text"] },
          limit: { context: 100000, output: 5000 },
        },
      }),
    });
    expect(entry).toMatchObject({
      id: "cx/gpt-5.6-sol",
      name: "Provider Name",
      family: "provider-family",
      attachment: true,
      reasoning: true,
      temperature: false,
      tool_call: false,
      release_date: "2025-01-01",
      cost: { input: 1, output: 2 },
      modalities: { input: ["text", "image"], output: ["text"] },
      limit: { context: 200000, output: 10000 },
    });
  });

  test("uses model-only fallback", async () => {
    const entry = await resolveModel("cx/gpt-5.6-sol", undefined, { lookupModelsDev: async () => ({ providerModel: null, modelOnly: { id: "x", name: "x", family: "model" } }) });
    expect(entry.family).toBe("model");
  });

  test("uses ambiguity-safe legacy metadata only to restore limits for uncatalogued provider/model IDs", async () => {
    const entry = await resolveModel("private-provider/private-model", undefined, {
      lookupModel: async (id) => id === "private-model"
        ? {
            id,
            name: "Private Model",
            family: "private",
            attachment: true,
            reasoning: true,
            temperature: false,
            tool_call: false,
            cost: { input: 1, output: 2 },
            modalities: { input: ["image"], output: ["audio"] },
            limit: { context: 131072, output: 8192 },
          }
        : null,
    });
    expect(entry).toEqual({
      id: "private-provider/private-model",
      name: "private-provider/private-model",
      attachment: false,
      reasoning: false,
      temperature: true,
      tool_call: true,
      limit: { context: 131072, output: 8192 },
    });
  });

  test("uses legacy lookup for uncatalogued slash IDs without mutating discovery", async () => {
    const discovery = { id: "openai-compatible-team/private-model", capabilities: { reasoning: true, thinkingFormat: "openai" } };
    let called = false;
    const entry = await resolveModel(discovery.id, discovery, {
      lookupModel: async (id) => { called = id === "private-model"; return null; },
    });
    expect(called).toBe(true);
    expect(discovery).toEqual({ id: "openai-compatible-team/private-model", capabilities: { reasoning: true, thinkingFormat: "openai" } });
    expect(entry.variants).toEqual({});
    expect(entry).not.toHaveProperty("options.reasoningEffort");
    expect(entry).toMatchObject({ id: discovery.id, name: discovery.id, attachment: false, reasoning: false, temperature: true, tool_call: true });
  });

  test("does not use legacy lookup for opaque IDs", async () => {
    let called = false;
    await resolveModel("opaque", undefined, {
      lookupModel: async () => { called = true; return null; },
    });
    expect(called).toBe(false);
  });

  test("does not restore incomplete legacy limits", async () => {
    const entry = await resolveModel("private-provider/private-model", undefined, {
      lookupModel: async () => ({ id: "private-model", name: "Private Model", limit: { context: 131072 } }),
    });
    expect(entry.limit).toBeUndefined();
  });

  test("catalogued routes use canonical lookup only", async () => {
    let legacyCalled = false;
    const entry = await resolveModel("cx/gpt-5.6-sol", undefined, {
      lookupModelsDev: async () => ({ providerModel: null, modelOnly: null }),
      lookupModel: async () => { legacyCalled = true; return null; },
    });
    expect(legacyCalled).toBe(false);
    expect(entry.limit).toBeUndefined();
  });

  test("omits variants for nonreasoning models", async () => {
    const entry = await resolveModel("openai-compatible-team/private-model", { id: "openai-compatible-team/private-model", capabilities: { reasoning: false } });
    expect(entry.variants).toBeUndefined();
  });

  test("matched nonreasoning source ignores runtime reasoning; unmatched falls back safely", async () => {
    const matched = await resolveModel("ag/gemini-pro-agent", { id: "ag/gemini-pro-agent", capabilities: { reasoning: true } });
    const unmatched = await resolveModel("opaque", { id: "opaque", capabilities: { reasoning: true } });
    expect(matched.variants).toBeUndefined();
    expect(unmatched).toMatchObject({ id: "opaque", name: "opaque", attachment: false, reasoning: false, temperature: true, tool_call: true, variants: {} });
  });
});
