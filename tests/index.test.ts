import { describe, expect, test } from "bun:test";
import {
  acceptDiscoveryEntries,
  createPlugin,
  pickDefaultModel,
} from "../src/index.js";

describe("discovery", () => {
  test("accepts root arrays, valid IDs regardless of kind, and first exact ID", () => {
    expect(
      acceptDiscoveryEntries({
        models: [
          { id: "private/model", kind: "llm", name: "lie" },
          { id: "private/model", kind: "llm" },
          { id: "ok", kind: "image" },
          { id: "constructor", kind: "llm" },
        ],
      }),
    ).toEqual([
      { id: "private/model", kind: "llm" },
      { id: "ok", kind: "llm" },
    ]);
    expect(acceptDiscoveryEntries([{ id: "data/id", kind: "llm" }])).toEqual([
      { id: "data/id", kind: "llm" },
    ]);
    expect(
      acceptDiscoveryEntries({ data: [{ id: "x", kind: "llm" }] }),
    ).toEqual([{ id: "x", kind: "llm" }]);
  });
  test("rejects singleton, malformed, and danger IDs", () => {
    expect(acceptDiscoveryEntries({ id: "x", kind: "llm" })).toEqual([]);
    expect(
      acceptDiscoveryEntries({
        models: [
          { id: " x", kind: "llm" },
          { id: "x\n", kind: "llm" },
          { id: "__proto__", kind: "llm" },
          { id: "x" },
          null,
        ],
      }),
    ).toEqual([{ id: "x", kind: "llm" }]);
  });
});

test("factory preserves own user entries and never resolves them", async () => {
  let calls = 0;
  const plugin = createPlugin({
    env: {},
    listModels: async () => [{ id: "fresh", kind: "llm" }],
    modelsDevClient: {
      lookupCanonical: async () => ({ providerModel: null, modelOnly: null }),
      lookupExact: async () => null,
    },
    resolveModel: async (id) => {
      calls++;
      return { id };
    },
  });
  const hooks = await plugin({} as never);
  const cfg: any = {
    model: "keep",
    provider: { "9router": { models: { fresh: { id: "user" } } } },
  };
  await hooks.config?.(cfg);
  expect(calls).toBe(0);
  expect(cfg.provider["9router"].models.fresh).toEqual({ id: "user" });
  expect(cfg.model).toBe("keep");
  expect(pickDefaultModel([{ id: "cx/gpt", kind: "llm" }])).toBe("cx/gpt");
});

test("factory preserves user model reference without reading getters", async () => {
  const user = { id: "user" };
  const models: any = {};
  Object.defineProperty(models, "fresh", {
    enumerable: true,
    get() {
      throw new Error("getter");
    },
  });
  const plugin = createPlugin({
    env: {},
    listModels: async () => [{ id: "fresh", kind: "llm" }],
    modelsDevClient: {
      lookupCanonical: async () => ({ providerModel: null, modelOnly: null }),
      lookupExact: async () => null,
    },
    resolveModel: async () => {
      throw new Error("resolver");
    },
  });
  const hooks = await plugin({} as never);
  await hooks.config?.({ provider: { "9router": { models } } } as any);
  expect(Object.getOwnPropertyDescriptor(models, "fresh")?.get).toBeDefined();
  expect(user).toEqual({ id: "user" });
});

test("reject matrix and valid-ID default", async () => {
  const inherited = Object.create({ id: "inherited", kind: "llm" });
  expect(
    acceptDiscoveryEntries({
      models: [
        { id: "x".repeat(513), kind: "llm" },
        { id: "x\x7f", kind: "llm" },
        { id: "__proto__", kind: "llm" },
        { id: "prototype", kind: "llm" },
        { id: "constructor", kind: "llm" },
        { id: "x", kind: "image" },
        { id: "x", kind: "tts" },
        { id: "x", kind: "stt" },
        { id: "x", kind: "embedding" },
        { id: "x", kind: "web" },
        { id: "x" },
        inherited,
      ],
    }),
  ).toEqual([{ id: "x", kind: "llm" }]);
  expect(acceptDiscoveryEntries("scalar")).toEqual([]);
  expect(acceptDiscoveryEntries({ id: "one", kind: "llm" })).toEqual([]);
  const plugin = createPlugin({
    env: {},
    listModels: async () => [
      { id: "image", kind: "image" } as any,
      { id: "later/gpt", kind: "llm" },
    ],
    modelsDevClient: {
      lookupCanonical: async () => ({ providerModel: null, modelOnly: null }),
      lookupExact: async () => null,
    },
    resolveModel: async (id) => ({ id }),
  });
  const hooks = await plugin({} as never);
  const cfg: any = {};
  await hooks.config?.(cfg);
  expect(Object.getPrototypeOf(cfg.provider["9router"].models)).toBeNull();
  expect(cfg.model).toBe("9router/later/gpt");
});

test("truthy non-object models fails safely", async () => {
  const plugin = createPlugin({
    env: {},
    listModels: async () => [{ id: "x", kind: "llm" }],
    modelsDevClient: {
      lookupCanonical: async () => ({ providerModel: null, modelOnly: null }),
      lookupExact: async () => null,
    },
    resolveModel: async () => ({}),
  });
  const hooks = await plugin({} as never);
  await expect(
    hooks.config?.({ provider: { "9router": { models: [] } } } as any),
  ).rejects.toThrow();
});

test("intake accepts exact 512 and ignores remaining kind cases", () => {
  const id = "x".repeat(512);
  const inheritedKind = Object.create({ kind: "llm" });
  inheritedKind.id = "inherited-kind";
  expect(
    acceptDiscoveryEntries({
      data: [
        { id, kind: "llm" },
        { id: "unknown", kind: "unknown" },
        { id: "image-to-text", kind: "image-to-text" },
        { id: "video", kind: "video" },
        [],
        inheritedKind,
      ],
    }),
  ).toEqual([
    { id, kind: "llm" },
    { id: "unknown", kind: "llm" },
    { id: "image-to-text", kind: "llm" },
    { id: "video", kind: "llm" },
    { id: "inherited-kind", kind: "llm" },
  ]);
});
