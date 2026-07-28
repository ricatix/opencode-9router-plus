import { describe, expect, test } from "bun:test";
import { resolveModel } from "../src/model-mapper.js";

describe("resolveModel", () => {
  test("uses canonical provider lookup and raw ID/name", async () => {
    const calls: unknown[][] = [];
    const routeCalls: string[] = [];
    const entry = await resolveModel("cx/gpt-5.6-sol", { id: "cx/gpt-5.6-sol", capabilities: { reasoning: true } }, {
      lookupModelsDev: async (...args) => { calls.push(args); return { providerModel: { id: "gpt-5.6-sol", name: "Provider", reasoning_options: [{ type: "effort", values: ["low", "high"] }] }, modelOnly: null }; },
      resolveRouteModel: (id) => { routeCalls.push(id); return { routeAlias: "cx", routeModelId: "gpt-5.6-sol", canonicalProvider: "openai", canonicalModelId: "gpt-5.6-sol" }; },
    });
    expect(routeCalls).toEqual(["cx/gpt-5.6-sol"]);
    expect(calls).toEqual([["openai", "openai/gpt-5.6-sol"]]);
    expect(entry.id).toBe("cx/gpt-5.6-sol");
    expect(entry.name).toBe("cx/gpt-5.6-sol");
    expect(entry.variants).toEqual({ low: { reasoningEffort: "low" }, high: { reasoningEffort: "high" } });
  });

  test("prefers provider metadata over model-only metadata", async () => {
    const entry = await resolveModel("openai/gpt-5.6-sol", { id: "openai/gpt-5.6-sol", capabilities: { reasoning: true } }, {
      lookupModelsDev: async () => ({ providerModel: { id: "x", name: "x", family: "provider", reasoning_options: [{ type: "effort", values: ["high"] }] }, modelOnly: { id: "x", name: "x", family: "model", reasoning_options: [{ type: "effort", values: ["low"] }] } }),
    });
    expect(entry.family).toBe("provider");
    expect(entry.variants).toEqual({ high: { reasoningEffort: "high" } });
  });

  test("uses model-only fallback", async () => {
    const entry = await resolveModel("openai/gpt-5.6-sol", undefined, { lookupModelsDev: async () => ({ providerModel: null, modelOnly: { id: "x", name: "x", family: "model" } }) });
    expect(entry.family).toBe("model");
  });

  test("does not lookup opaque IDs or mutate discovery", async () => {
    const discovery = { id: "openai-compatible-team/private-model", capabilities: { reasoning: true, thinkingFormat: "openai" } };
    let called = false;
    const entry = await resolveModel(discovery.id, discovery, {
      lookupModelsDev: async () => { called = true; return { providerModel: null, modelOnly: null }; },
      resolveRouteModel: () => ({ routeAlias: "openai-compatible-team", routeModelId: "private-model" }),
    });
    expect(called).toBe(false);
    expect(discovery).toEqual({ id: "openai-compatible-team/private-model", capabilities: { reasoning: true, thinkingFormat: "openai" } });
    expect(entry.variants).toEqual({ low: { reasoningEffort: "low" }, medium: { reasoningEffort: "medium" }, high: { reasoningEffort: "high" } });
    expect(entry.variants).not.toHaveProperty("max");
    expect(entry.variants).not.toHaveProperty("default");
    expect(entry).not.toHaveProperty("options.reasoningEffort");
    expect(entry).toMatchObject({ id: discovery.id, name: discovery.id, attachment: false, reasoning: false, temperature: true, tool_call: true });
  });

  test("omits variants for nonreasoning models", async () => {
    const entry = await resolveModel("openai-compatible-team/private-model", { id: "openai-compatible-team/private-model", capabilities: { reasoning: false } });
    expect(entry.variants).toBeUndefined();
  });
});
