import { expect, test } from "bun:test";
import { createPlugin } from "../src/index.js";
import { createModelsDevClient } from "../src/models-dev.js";

const cache = { read: async () => null, write: async () => {} };
const contract = (
  entry: Record<string, unknown>,
  keys: string[],
  toolCall = false,
  attachment = false,
) => {
  expect(Object.keys(entry).sort()).toEqual(keys.sort());
  expect(entry.id).toEqual(expect.any(String));
  expect(entry.attachment).toBe(attachment);
  expect(entry.temperature).toBeFalse();
  expect(entry.tool_call).toBe(toolCall);
  if (entry.cost)
    expect(entry.cost).toEqual({
      input: expect.any(Number),
      output: expect.any(Number),
    });
  if (entry.limit)
    expect(entry.limit).toEqual({
      context: expect.any(Number),
      output: expect.any(Number),
    });
  if (entry.modalities)
    expect(entry.modalities).toEqual({ input: ["text"], output: ["text"] });
  if (entry.variants) {
    expect(entry.reasoning).toBeTrue();
    expect(
      Object.keys(entry.variants as Record<string, unknown>).sort(),
    ).toEqual(["high", "low", "max", "medium", "minimal", "none", "xhigh"]);
    for (const [name, variant] of Object.entries(
      entry.variants as Record<string, unknown>,
    ))
      expect(variant).toEqual({ reasoningEffort: name });
  }
};

test("local E2E translates accepted discovery through reviewed and models.dev sources", async () => {
  const requests: string[] = [];
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const url = new URL(request.url);
      requests.push(url.href);
      if (url.pathname === "/v1/models")
        return Response.json({
          data: [
            {
              id: "cx/gpt-5.6-sol",
              kind: "llm",
              name: "LIVE_LIE",
              capabilities: {
                reasoning: false,
                tools: true,
                vision: true,
                pdf: true,
                contextWindow: "101",
                maxOutput: "21",
              },
              context_length: "100",
              max_completion_tokens: "20",
            },
            { id: "private/nested/exact-meta" },
            { id: "private/default-only", kind: "image" },
            { id: "private/nested/exact-meta", kind: "llm" },
            { id: "accepted/image", kind: "image" },
            { id: "accepted/missing-kind" },
            { id: "constructor", kind: "llm" },
          ],
        });
      if (url.pathname === "/api.json")
        return Response.json({
          openai: {
            models: {
              "gpt-5.6-sol": {
                id: "provider-lie",
                name: "PROVIDER_SENTINEL",
                family: "provider-family",
                cost: { input: 1, output: 2 },
                attachment: true,
                reasoning: false,
                temperature: true,
                tool_call: true,
              },
            },
          },
        });
      if (url.pathname === "/models.json")
        return Response.json({
          "openai/gpt-5.6-sol": {
            id: "global-lie",
            name: "GLOBAL_CONFLICT",
            family: "global-family",
            cost: { input: 9, output: 9 },
            limit: { context: 100, output: 20 },
            modalities: { input: ["text"], output: ["text"] },
            attachment: true,
            reasoning: false,
            temperature: true,
            tool_call: true,
          },
          "global/exact-meta": {
            id: "global/exact-meta",
            name: "EXACT_SENTINEL",
            family: "exact-family",
            release_date: "2026-01-01",
            cost: { input: 3, output: 4 },
            limit: { context: 200, output: 30 },
            modalities: { input: ["text"], output: ["text"] },
            attachment: true,
            reasoning: true,
            temperature: true,
            tool_call: true,
          },
        });
      return new Response("unexpected", { status: 404 });
    },
  });
  try {
    const baseUrl = `${server.url}v1`;
    const modelsDevClient = createModelsDevClient({
      fetch: globalThis.fetch,
      apiUrl: `${server.url}api.json`,
      modelsUrl: `${server.url}models.json`,
      cache,
    });
    const plugin = createPlugin({
      env: {
        OPENCODE_9ROUTER_URL: baseUrl,
        OPENCODE_9ROUTER_API_KEY: "local-key",
      },
      modelsDevClient,
    });
    const hooks = await plugin({} as never);
    const config: any = {};
    await hooks.config?.(config);

    expect(requests.sort()).toEqual(
      [
        `${baseUrl}/models`,
        `${server.url}api.json`,
        `${server.url}models.json`,
      ].sort(),
    );
    expect(config.model).toBe("9router/cx/gpt-5.6-sol");
    const models = config.provider["9router"].models;
    expect(Object.keys(models)).toEqual([
      "cx/gpt-5.6-sol",
      "private/nested/exact-meta",
      "private/default-only",
      "accepted/image",
      "accepted/missing-kind",
    ]);
    expect(models["cx/gpt-5.6-sol"]).toMatchObject({
      id: "cx/gpt-5.6-sol",
      name: "LIVE_LIE",
      family: "provider-family",
      cost: { input: 1, output: 2 },
      limit: { context: 101, output: 21 },
      modalities: { input: ["text"], output: ["text"] },
      attachment: true,
      reasoning: false,
      temperature: false,
      tool_call: true,
    });
    expect(models["cx/gpt-5.6-sol"].variants).toBeUndefined();
    expect(models["private/nested/exact-meta"]).toMatchObject({
      id: "private/nested/exact-meta",
      name: "EXACT_SENTINEL",
      family: "exact-family",
      reasoning: false,
    });
    expect(models["private/default-only"]).toEqual({
      id: "private/default-only",
      name: "private/default-only",
      attachment: false,
      reasoning: false,
      temperature: false,
      tool_call: false,
    });
    expect(models["accepted/image"]).toMatchObject({
      id: "accepted/image",
      reasoning: false,
    });
    expect(models["accepted/missing-kind"]).toMatchObject({
      id: "accepted/missing-kind",
      reasoning: false,
    });
    contract(
      models["cx/gpt-5.6-sol"],
      [
        "id",
        "name",
        "family",
        "cost",
        "limit",
        "modalities",
        "attachment",
        "reasoning",
        "temperature",
        "tool_call",
      ],
      true,
      true,
    );
    contract(models["private/nested/exact-meta"], [
      "id",
      "name",
      "family",
      "release_date",
      "cost",
      "limit",
      "modalities",
      "attachment",
      "reasoning",
      "temperature",
      "tool_call",
    ]);
    contract(models["private/default-only"], [
      "id",
      "name",
      "attachment",
      "reasoning",
      "temperature",
      "tool_call",
    ]);
    contract(models["accepted/image"], [
      "id",
      "name",
      "attachment",
      "reasoning",
      "temperature",
      "tool_call",
    ]);
    contract(models["accepted/missing-kind"], [
      "id",
      "name",
      "attachment",
      "reasoning",
      "temperature",
      "tool_call",
    ]);
  } finally {
    server.stop(true);
  }
});

test("existing config skips resolver", async () => {
  let calls = 0;
  const plugin = createPlugin({
    env: {},
    listModels: async () => [{ id: "existing", kind: "llm" }],
    modelsDevClient: {
      lookupCanonical: async () => ({ providerModel: null, modelOnly: null }),
      lookupExact: async () => null,
      lookupUniqueLeaf: async () => null,
    },
    resolveModel: async () => {
      calls++;
      throw new Error("must not run");
    },
  });
  const hooks = await plugin({} as never);
  const config: any = {
    model: "other/keep",
    provider: { "9router": { models: { existing: { id: "USER_KEEP" } } } },
  };
  await hooks.config?.(config);
  expect(calls).toBe(0);
  expect(config).toEqual({
    model: "other/keep",
    provider: {
      "9router": {
        npm: "@ai-sdk/openai-compatible",
        options: { name: "9Router", baseURL: "http://localhost:20128/v1" },
        models: { existing: { id: "USER_KEEP" } },
      },
    },
  });
});

test("live discovery fields are authority and only safe mapper output reaches config", async () => {
  const plugin = createPlugin({
    env: {},
    listModels: async () => [
      {
        id: "cx/gpt-5.6-sol",
        kind: "llm",
        live: {
          name: "LIVE_SENTINEL",
          capabilities: {
            reasoning: false,
            tools: true,
            vision: true,
            contextWindow: "321",
            maxOutput: "123",
          },
        },
      },
    ],
    modelsDevClient: {
      lookupCanonical: async () => ({ providerModel: null, modelOnly: null }),
      lookupExact: async () => null,
      lookupUniqueLeaf: async () => null,
    },
  });
  const hooks = await plugin({} as never);
  const config: any = {};
  await hooks.config?.(config);

  expect(config.provider["9router"].models["cx/gpt-5.6-sol"]).toEqual({
    id: "cx/gpt-5.6-sol",
    name: "LIVE_SENTINEL",
    attachment: true,
    reasoning: false,
    temperature: false,
    tool_call: true,
    limit: { context: 321, output: 123 },
  });
});

test("mapper safe template keeps failed model and remaining discovered models", async () => {
  const plugin = createPlugin({
    env: {},
    listModels: async () => [
      { id: "broken", kind: "llm" },
      { id: "kept", kind: "llm" },
    ],
    modelsDevClient: {
      lookupCanonical: async () => ({ providerModel: null, modelOnly: null }),
      lookupExact: async () => null,
      lookupUniqueLeaf: async () => null,
    },
    resolveModel: async ({ id }) => {
      if (id === "broken") throw new Error("broken");
      return {
        id,
        name: id,
        attachment: false,
        reasoning: false,
        temperature: false,
        tool_call: false,
      };
    },
  });
  const hooks = await plugin({} as never);
  const config: any = {};

  await hooks.config?.(config);

  expect(config.provider["9router"].models).toEqual({
    broken: {
      id: "broken",
      name: "broken",
      attachment: false,
      reasoning: false,
      temperature: false,
      tool_call: false,
    },
    kept: {
      id: "kept",
      name: "kept",
      attachment: false,
      reasoning: false,
      temperature: false,
      tool_call: false,
    },
  });
});
