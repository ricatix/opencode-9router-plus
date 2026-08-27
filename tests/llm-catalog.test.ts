import { describe, expect, test } from "bun:test";
import { renderCatalogModule } from "../scripts/extract-9router-llm-catalog.js";
import { NINE_ROUTER_LLM_CATALOG } from "../src/generated/9router-llm-catalog.js";
import {
  matchLlmCatalogRoute,
  validateLlmCatalog,
} from "../src/llm-catalog.js";
import { CATALOG_FIXTURE } from "./fixtures/9router-llm-catalog.js";

describe("LLM catalog", () => {
  test("reviews pinned static snapshot gate", () => {
    validateLlmCatalog(NINE_ROUTER_LLM_CATALOG);
    expect(NINE_ROUTER_LLM_CATALOG.sourceCommit).toBe(
      "79918c7830695bbca4a45c9fea4a42c3e9fd73d1",
    );
    expect(NINE_ROUTER_LLM_CATALOG.sourceFiles).toEqual(
      [...NINE_ROUTER_LLM_CATALOG.sourceFiles].sort(),
    );
    expect(new Set(NINE_ROUTER_LLM_CATALOG.sourceFiles).size).toBe(
      NINE_ROUTER_LLM_CATALOG.sourceFiles.length,
    );
    expect(NINE_ROUTER_LLM_CATALOG.sourceFiles).toEqual(
      expect.arrayContaining([
        "open-sse/providers/registry/index.js",
        "open-sse/providers/index.js",
        "open-sse/providers/schema.js",
        "open-sse/providers/models/schema.js",
        "open-sse/providers/models/helpers.js",
        "open-sse/config/providerModels.js",
        "open-sse/config/grokCli.js",
        "open-sse/providers/thinkingLevels.js",
        "open-sse/providers/capabilities.js",
      ]),
    );
    expect(Object.keys(NINE_ROUTER_LLM_CATALOG.providers)).toEqual(
      [...Object.keys(NINE_ROUTER_LLM_CATALOG.providers)].sort(),
    );
    expect(Object.keys(NINE_ROUTER_LLM_CATALOG.providers)).toHaveLength(100);
    expect(
      Object.values(NINE_ROUTER_LLM_CATALOG.providers).flatMap(
        (provider) => provider.models,
      ),
    ).toHaveLength(468);
    expect(
      Object.values(NINE_ROUTER_LLM_CATALOG.providers)
        .flatMap((provider) => provider.models)
        .every((model) => model.kind === "llm"),
    ).toBeTrue();
    expect(
      Object.entries(NINE_ROUTER_LLM_CATALOG.providers)
        .filter(
          ([, provider]) =>
            provider.modelsFetcher || provider.passthroughModels,
        )
        .map(([id]) => id),
    ).toEqual([
      "grok-web",
      "kilocode",
      "kimchi",
      "mimo-free",
      "opencode",
      "openrouter",
      "perplexity-agent",
      "venice",
      "vercel-ai-gateway",
    ]);
    expect(NINE_ROUTER_LLM_CATALOG.providers["mimo-free"].catalogKey).toBe(
      "mmf",
    );
    expect(NINE_ROUTER_LLM_CATALOG.providers.mmf.catalogKey).toBe("mmf");
    const routeKeyDeclarers = Object.entries(NINE_ROUTER_LLM_CATALOG.providers)
      .flatMap(([providerId, provider]) =>
        [provider.catalogKey, ...provider.aliases].map(
          (key) => [key, providerId] as const,
        ),
      )
      .reduce(
        (groups, [key, providerId]) => {
          (groups[key] ??= []).push(providerId);
          return groups;
        },
        {} as Record<string, string[]>,
      );
    const collisions = Object.fromEntries(
      Object.entries(routeKeyDeclarers).filter(
        ([, providerIds]) => providerIds.length > 1,
      ),
    );
    expect(collisions).toEqual({ mmf: ["mimo-free", "mmf"] });
    expect(NINE_ROUTER_LLM_CATALOG.routeOwners.mmf).toBe("mmf");
    const sol = matchLlmCatalogRoute("cx/gpt-5.6-sol", NINE_ROUTER_LLM_CATALOG);
    expect(sol).toMatchObject({
      providerId: "codex",
      modelId: "gpt-5.6-sol",
      model: {
        id: "gpt-5.6-sol",
        name: "GPT 5.6 Sol",
        reasoning: { reasoning: true, thinkingFormat: "openai" },
      },
    });
    expect(
      matchLlmCatalogRoute("cx/gpt-5.6-sol-review", NINE_ROUTER_LLM_CATALOG)
        ?.model.upstreamModelId,
    ).toBe("gpt-5.6-sol");
    expect(
      matchLlmCatalogRoute("cx/gpt-5.6-terra", NINE_ROUTER_LLM_CATALOG)?.model,
    ).toMatchObject({
      canonicalProvider: "openai",
      canonicalModelId: "gpt-5.6-terra",
    });
    expect(
      matchLlmCatalogRoute("cx/gpt-5.6-terra-review", NINE_ROUTER_LLM_CATALOG)
        ?.model,
    ).toMatchObject({
      canonicalProvider: "openai",
      canonicalModelId: "gpt-5.6-terra",
    });
    expect(
      matchLlmCatalogRoute("cx/gpt-5.6-sol-review", NINE_ROUTER_LLM_CATALOG)
        ?.model.reasoning,
    ).toMatchObject({ reasoning: true, thinkingFormat: "openai" });
    expect(
      NINE_ROUTER_LLM_CATALOG.reasoningPicker.patternLevels.find(
        (rule) => rule.pattern === "*gpt-5.6-sol*",
      )?.levels,
    ).toEqual(["none", "minimal", "low", "medium", "high", "xhigh", "max"]);
    expect(
      matchLlmCatalogRoute("gcli/grok-4.5-high", NINE_ROUTER_LLM_CATALOG)?.model
        .reasoning,
    ).toMatchObject({ reasoning: true, thinkingFormat: "openai" });
    expect(
      matchLlmCatalogRoute("glm/glm-5.2", NINE_ROUTER_LLM_CATALOG)?.model
        .reasoning,
    ).toMatchObject({
      reasoning: true,
      thinkingFormat: "zai",
      thinkingRange: null,
    });
    expect(NINE_ROUTER_LLM_CATALOG.reasoningPicker.formatLevels.zai).toEqual([
      "none",
      "thinking",
    ]);
    const rendered = renderCatalogModule({
      catalog: NINE_ROUTER_LLM_CATALOG,
    } as Parameters<typeof renderCatalogModule>[0]);
    expect(rendered).not.toMatch(/\d{4}-\d{2}-\d{2}T|\/tmp\/|\/var\/folders\//);
    expect(rendered).not.toContain('modelsFetcher": {');
  });
  test("requires immutable whitelisted nonempty unique provenance and LLM models", () => {
    expect(() =>
      validateLlmCatalog({ ...CATALOG_FIXTURE, sourceCommit: "master" }),
    ).toThrow();
    expect(() =>
      validateLlmCatalog({ ...CATALOG_FIXTURE, sourceFiles: undefined }),
    ).toThrow();
    expect(() =>
      validateLlmCatalog({ ...CATALOG_FIXTURE, sourceFiles: [] }),
    ).toThrow();
    expect(() =>
      validateLlmCatalog({
        ...CATALOG_FIXTURE,
        sourceFiles: "open-sse/providers/registry/index.js",
      }),
    ).toThrow();
    expect(() =>
      validateLlmCatalog({ ...CATALOG_FIXTURE, sourceFiles: ["bad.js"] }),
    ).toThrow();
    expect(() =>
      validateLlmCatalog({
        ...CATALOG_FIXTURE,
        sourceFiles: [
          "open-sse/providers/registry/index.js",
          "open-sse/providers/registry/index.js",
        ],
      }),
    ).toThrow();
    expect(() =>
      validateLlmCatalog({
        ...CATALOG_FIXTURE,
        sourceFiles: [
          "open-sse/providers/schema.js",
          "open-sse/providers/models/schema.js",
          "open-sse/providers/models/helpers.js",
          "open-sse/config/grokCli.js",
        ],
      }),
    ).not.toThrow();
    for (const file of [
      "open-sse/providers/pricing.js",
      "open-sse/config/providers.js",
      "open-sse/providers/shared.js",
    ])
      expect(() =>
        validateLlmCatalog({ ...CATALOG_FIXTURE, sourceFiles: [file] }),
      ).toThrow();
    expect(() =>
      validateLlmCatalog({
        ...CATALOG_FIXTURE,
        providers: {
          bad: {
            id: "bad",
            catalogKey: "bad",
            aliases: [],
            models: [{ id: "image", kind: "image" }],
          },
        },
      }),
    ).toThrow();
  });

  test("validates provider, route, and model identity uniqueness", () => {
    expect(() =>
      validateLlmCatalog({
        ...CATALOG_FIXTURE,
        providers: { wrong: CATALOG_FIXTURE.providers.codex },
      }),
    ).toThrow();
    expect(() =>
      validateLlmCatalog({
        ...CATALOG_FIXTURE,
        providers: {
          one: { ...CATALOG_FIXTURE.providers.codex, id: "one" },
          two: {
            ...CATALOG_FIXTURE.providers["grok-cli"],
            id: "two",
            catalogKey: "cx",
          },
        },
      }),
    ).toThrow();
    expect(() =>
      validateLlmCatalog({
        ...CATALOG_FIXTURE,
        providers: {
          one: { ...CATALOG_FIXTURE.providers.codex, id: "one" },
          two: {
            ...CATALOG_FIXTURE.providers["grok-cli"],
            id: "two",
            aliases: ["cx"],
          },
        },
      }),
    ).toThrow();
    expect(() =>
      validateLlmCatalog({
        ...CATALOG_FIXTURE,
        providers: {
          codex: {
            ...CATALOG_FIXTURE.providers.codex,
            models: [
              { id: "same", kind: "llm" },
              { id: "same", kind: "llm" },
            ],
          },
        },
      }),
    ).toThrow();
    expect(() =>
      validateLlmCatalog({
        ...CATALOG_FIXTURE,
        providers: {
          codex: { ...CATALOG_FIXTURE.providers.codex, aliases: ["cx"] },
          "grok-cli": CATALOG_FIXTURE.providers["grok-cli"],
        },
      }),
    ).toThrow();
  });

  test("rejects malformed mapper and resolver catalog fields", () => {
    const model = (patch: Record<string, unknown>) => ({
      ...CATALOG_FIXTURE,
      providers: {
        ...CATALOG_FIXTURE.providers,
        codex: {
          ...CATALOG_FIXTURE.providers.codex,
          models: [{ id: "gpt-5.6-sol", kind: "llm", ...patch }],
        },
      },
    });
    const rejects = [
      model({ canonicalProvider: "" }),
      model({ canonicalModelId: "x\n" }),
      model({ upstreamModelId: 1 }),
      model({ canonicalProvider: "x".repeat(513) }),
      model({ reasoning: true }),
      model({ reasoning: { reasoning: "true" } }),
      model({ reasoning: { reasoning: true, thinkingFormat: 1 } }),
      model({ reasoning: { reasoning: true, thinkingFormat: "" } }),
      model({ reasoning: { reasoning: true, thinkingFormat: "x".repeat(65) } }),
      model({ reasoning: { reasoning: true, thinkingCanDisable: "false" } }),
      model({ reasoning: { reasoning: true, thinkingRange: "low" } }),
      model({ reasoning: { reasoning: true, thinkingRange: [] } }),
      model({ reasoning: { reasoning: true, thinkingRange: ["low", "low"] } }),
      model({ reasoning: { reasoning: true, thinkingRange: ["unknown"] } }),
      model({
        reasoning: { reasoning: true, thinkingRange: Array(8).fill("low") },
      }),
      model({
        reasoning: { reasoning: true, thinkingRange: { values: "low" } },
      }),
      model({
        reasoning: {
          reasoning: true,
          thinkingRange: { values: ["low", "low"] },
        },
      }),
      model({
        reasoning: { reasoning: true, thinkingRange: { min: 1.5, max: 2 } },
      }),
      model({
        reasoning: { reasoning: true, thinkingRange: { min: 2, max: 1 } },
      }),
      model({
        reasoning: {
          reasoning: true,
          thinkingRange: { min: 0, max: 1_000_001 },
        },
      }),
      model({
        reasoning: {
          reasoning: true,
          thinkingRange: { min: 0, max: 1, extra: 2 },
        },
      }),
      model({
        reasoning: {
          reasoning: true,
          extra: true,
          one: true,
          two: true,
          three: true,
        },
      }),
    ];
    for (const catalog of rejects)
      expect(() => validateLlmCatalog(catalog)).toThrow();
  });

  test("rejects malformed and unbounded reasoning pickers", () => {
    const picker = (patch: Record<string, unknown>) => ({
      ...CATALOG_FIXTURE,
      reasoningPicker: { ...CATALOG_FIXTURE.reasoningPicker, ...patch },
    });
    const rejects = [
      picker({ formatLevels: { fmt: [] } }),
      picker({ formatLevels: { fmt: ["low", "low"] } }),
      picker({ formatLevels: { fmt: ["unknown"] } }),
      picker({ formatLevels: { fmt: Array(8).fill("low") } }),
      picker({ formatLevels: { ["x".repeat(65)]: ["low"] } }),
      picker({
        formatLevels: Object.fromEntries(
          Array.from({ length: 33 }, (_, i) => [`f${i}`, ["low"]]),
        ),
      }),
      picker({ patternLevels: [{ pattern: "", levels: ["low"] }] }),
      picker({
        patternLevels: [{ pattern: "x".repeat(513), levels: ["low"] }],
      }),
      picker({ patternLevels: [{ pattern: "*", levels: ["low", "low"] }] }),
      picker({ patternLevels: [{ pattern: "*", levels: ["unknown"] }] }),
      picker({
        patternLevels: [{ pattern: "*", levels: Array(8).fill("low") }],
      }),
      picker({
        patternLevels: [
          { pattern: "*", levels: ["low"] },
          { pattern: "*", levels: ["high"] },
        ],
      }),
      picker({
        patternLevels: Array.from({ length: 33 }, (_, i) => ({
          pattern: `p${i}`,
          levels: ["low"],
        })),
      }),
    ];
    for (const catalog of rejects)
      expect(() => validateLlmCatalog(catalog)).toThrow();
  });

  test("matches exact static route and preserves entry identity", () => {
    const match = matchLlmCatalogRoute("gb/grok-4.5-high", CATALOG_FIXTURE);
    expect(match).toMatchObject({
      providerId: "grok-cli",
      catalogKey: "gcli",
      modelId: "grok-4.5-high",
    });
    expect(match?.provider).toBe(CATALOG_FIXTURE.providers["grok-cli"]);
    expect(match?.model).toBe(CATALOG_FIXTURE.providers["grok-cli"].models[0]);
    expect(
      matchLlmCatalogRoute("cx/gpt-5.6-sol/extra", CATALOG_FIXTURE),
    ).toBeNull();
    expect(
      matchLlmCatalogRoute("unknown/grok-4.5-high", CATALOG_FIXTURE),
    ).toBeNull();
    expect(matchLlmCatalogRoute("gcli", CATALOG_FIXTURE)).toBeNull();
    expect(
      matchLlmCatalogRoute("gcli/grok-4.5-HIGH", CATALOG_FIXTURE),
    ).toBeNull();
    expect(matchLlmCatalogRoute("cx/GPT 5.6 Sol", CATALOG_FIXTURE)).toBeNull();
  });

  test("uses source-order route owner for catalog key collisions", () => {
    const providers = {
      "mimo-free": {
        id: "mimo-free",
        catalogKey: "mmf",
        aliases: [],
        models: [{ id: "first", kind: "llm" as const }],
      },
      mmf: {
        id: "mmf",
        catalogKey: "mmf",
        aliases: [],
        models: [{ id: "last", kind: "llm" as const }],
      },
    };
    const catalog = {
      ...CATALOG_FIXTURE,
      providers,
      routeOwners: { mmf: "mmf" },
    };
    validateLlmCatalog(catalog);
    expect(matchLlmCatalogRoute("mmf/last", catalog)?.providerId).toBe("mmf");
    expect(matchLlmCatalogRoute("mmf/first", catalog)).toBeNull();
  });
});
