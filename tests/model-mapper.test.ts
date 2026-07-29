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
    expect(entry.name).toBe("cx/gpt-5.6-sol");
    expect(entry.variants).toEqual({ none: { reasoningEffort: "none" }, minimal: { reasoningEffort: "minimal" }, low: { reasoningEffort: "low" }, medium: { reasoningEffort: "medium" }, high: { reasoningEffort: "high" }, xhigh: { reasoningEffort: "xhigh" }, max: { reasoningEffort: "max" } });
  });

  test("prefers provider metadata over model-only metadata", async () => {
    const entry = await resolveModel("cx/gpt-5.6-sol", { id: "cx/gpt-5.6-sol", capabilities: { reasoning: true } }, {
      lookupModelsDev: async () => ({ providerModel: { id: "x", name: "x", family: "provider", reasoning_options: [{ type: "effort", values: ["high"] }] }, modelOnly: { id: "x", name: "x", family: "model", reasoning_options: [{ type: "effort", values: ["low"] }] } }),
    });
    expect(entry.family).toBe("provider");
    expect(entry.variants).toEqual({ none: { reasoningEffort: "none" }, minimal: { reasoningEffort: "minimal" }, low: { reasoningEffort: "low" }, medium: { reasoningEffort: "medium" }, high: { reasoningEffort: "high" }, xhigh: { reasoningEffort: "xhigh" }, max: { reasoningEffort: "max" } });
  });

  test("uses model-only fallback", async () => {
    const entry = await resolveModel("cx/gpt-5.6-sol", undefined, { lookupModelsDev: async () => ({ providerModel: null, modelOnly: { id: "x", name: "x", family: "model" } }) });
    expect(entry.family).toBe("model");
  });

  test("does not lookup opaque IDs or mutate discovery", async () => {
    const discovery = { id: "openai-compatible-team/private-model", capabilities: { reasoning: true, thinkingFormat: "openai" } };
    let called = false;
    const entry = await resolveModel(discovery.id, discovery, {
      lookupModelsDev: async () => { called = true; return { providerModel: null, modelOnly: null }; },
    });
    expect(called).toBe(false);
    expect(discovery).toEqual({ id: "openai-compatible-team/private-model", capabilities: { reasoning: true, thinkingFormat: "openai" } });
    expect(entry.variants).toEqual({});
    expect(entry).not.toHaveProperty("options.reasoningEffort");
    expect(entry).toMatchObject({ id: discovery.id, name: discovery.id, attachment: false, reasoning: false, temperature: true, tool_call: true });
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
