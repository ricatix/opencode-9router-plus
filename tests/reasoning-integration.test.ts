import { expect, test } from "bun:test";
import entry, { acceptDiscoveryEntries, createPlugin } from "../src/index.js";
import { resolveModel } from "../src/model-mapper.js";

const client = {
  lookupCanonical: async () => ({ providerModel: null, modelOnly: null }),
  lookupExact: async () => null,
  lookupUniqueLeaf: async () => null,
};
const known = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
  "thinking",
];
const disabled = Object.fromEntries(
  known.map((key) => [key, { disabled: true }]),
);

test("exposes a supported server module when package exports include helpers", () => {
  expect(entry).toMatchObject({
    id: "opencode-9router-plus",
    server: expect.any(Function),
  });
});

for (const variant of ["none", "ultra", "invalid"]) {
  test(`rejects ${variant} before accepting a user message for a plugin-owned model`, async () => {
    const hooks = await createPlugin({
      env: {},
      listModels: async () => [
        {
          id: "cmc/task6",
          kind: "llm",
          live: {
            capabilities: { reasoning: true, thinkingFormat: "commandcode" },
          },
        },
      ],
      modelsDevClient: client,
    })({} as never);
    await hooks.config?.({});
    expect(hooks["chat.message"]).toBeDefined();
    await expect(
      hooks["chat.message"]?.(
        { sessionID: "offline", variant },
        {
          message: {
            id: "offline",
            sessionID: "offline",
            role: "user",
            time: { created: 0 },
            agent: "build",
            model: { providerID: "9router", modelID: "cmc/task6" },
          },
          parts: [],
        },
      ),
    ).rejects.toThrow("Unsupported 9router variant");
  });
}

for (const [providerID, modelID, variant] of [
  ["9router", "cmc/task6", "max"],
  ["9router", "cmc/task6", undefined],
  ["9router", "manual", "custom"],
  ["other", "cmc/task6", "invalid"],
] as const) {
  test(`preserves selection ${providerID}/${modelID}/${variant ?? "unset"}`, async () => {
    const hooks = await createPlugin({
      env: {},
      listModels: async () => [
        {
          id: "cmc/task6",
          kind: "llm",
          live: {
            capabilities: { reasoning: true, thinkingFormat: "commandcode" },
          },
        },
        { id: "manual", kind: "llm" },
      ],
      modelsDevClient: client,
    })({} as never);
    const manual = {
      name: "Manual",
      variants: { custom: { reasoningEffort: "ultra" } },
    };
    const config = { provider: { "9router": { models: { manual } } } };
    await hooks.config?.(config);
    await hooks["chat.message"]?.(
      { sessionID: "offline", variant },
      {
        message: {
          id: "offline",
          sessionID: "offline",
          role: "user",
          time: { created: 0 },
          agent: "build",
          model: { providerID, modelID },
        },
        parts: [],
      },
    );
  });
}

test("uses live commandcode format when a known provider model is absent from catalog", async () => {
  const input = {
    id: "cmc/task5-new-model",
    live: { capabilities: { reasoning: true, thinkingFormat: "commandcode" } },
  };
  const entry = await resolveModel(input, client);
  expect(entry.variants).toEqual({
    ...disabled,
    low: { reasoningEffort: "low" },
    medium: { reasoningEffort: "medium" },
    high: { reasoningEffort: "high" },
    xhigh: { reasoningEffort: "xhigh" },
    max: { reasoningEffort: "max" },
  });
});

test("uses live toggle payload instead of static model efforts when format changes", async () => {
  const input = {
    id: "cx/gpt-5.6-sol",
    live: {
      capabilities: {
        reasoning: true,
        thinkingFormat: "zai",
        thinkingCanDisable: true,
      },
    },
  };
  const entry = await resolveModel(input, client);
  expect(entry.variants).toEqual({
    ...disabled,
    none: { thinking: { type: "disabled" } },
    thinking: { thinking: { type: "enabled" } },
  });
});

test("suppresses all known builtin keys when final live reasoning is false", async () => {
  const entry = await resolveModel(
    {
      id: "cx/gpt-5",
      live: { capabilities: { reasoning: false, thinkingFormat: "openai" } },
    },
    client,
  );
  expect(entry.reasoning).toBe(false);
  expect(entry.variants).toEqual(disabled);
});

test("keeps catalog fallback when discovery drops invalid thinking metadata", async () => {
  const [input] = acceptDiscoveryEntries([
    {
      id: "cx/gpt-5.6-sol",
      capabilities: {
        reasoning: "invalid",
        thinkingFormat: 42,
        thinkingCanDisable: "invalid",
      },
    },
  ]);
  expect(input).toBeDefined();
  if (!input) throw new Error("missing discovery fixture");
  const entry = await resolveModel(input, client);
  expect(entry.reasoning).toBe(true);
  expect(entry.variants).toEqual({
    ...disabled,
    none: { reasoningEffort: "none" },
    minimal: { reasoningEffort: "minimal" },
    low: { reasoningEffort: "low" },
    medium: { reasoningEffort: "medium" },
    high: { reasoningEffort: "high" },
    xhigh: { reasoningEffort: "xhigh" },
    max: { reasoningEffort: "max" },
    ultra: { reasoningEffort: "ultra" },
  });
});

test("suppresses builtin keys without changing reasoning when live format has no policy", async () => {
  const entry = await resolveModel(
    {
      id: "cx/task5-unknown",
      live: {
        capabilities: { reasoning: true, thinkingFormat: "future-format" },
      },
    },
    client,
  );
  expect(entry.reasoning).toBe(true);
  expect(entry.variants).toEqual(disabled);
});

test("leaves user custom and disabled variants byte-for-byte unchanged without mapping", async () => {
  const manual = {
    id: "user-id",
    reasoning: true,
    variants: {
      custom: { reasoningEffort: "ultra" },
      high: { disabled: true },
    },
  };
  const before = JSON.stringify(manual);
  let calls = 0;
  const plugin = createPlugin({
    env: {},
    listModels: async () => [{ id: "cx/gpt-5", kind: "llm" }],
    modelsDevClient: client,
    resolveModel: async () => {
      calls++;
      throw new Error("manual model mapped");
    },
  });
  const hooks = await plugin({} as never);
  const models = { "cx/gpt-5": manual };
  await hooks.config?.({ provider: { "9router": { models } } });
  expect(calls).toBe(0);
  expect(models["cx/gpt-5"]).toBe(manual);
  expect(JSON.stringify(manual)).toBe(before);
});

test("suppresses builtin keys when plugin mapping fails", async () => {
  const plugin = createPlugin({
    env: {},
    listModels: async () => [{ id: "cx/gpt-5", kind: "llm" }],
    modelsDevClient: client,
    resolveModel: async () => {
      throw new Error("mapper failure");
    },
  });
  const hooks = await plugin({} as never);
  const models: Record<string, { id?: string }> = {};
  await hooks.config?.({ provider: { "9router": { models } } });
  expect(models["cx/gpt-5"]).toMatchObject({
    reasoning: false,
    variants: disabled,
  });
});
