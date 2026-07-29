import { describe, expect, test } from "bun:test";
import { matchLlmCatalogRoute, validateLlmCatalog } from "../src/llm-catalog.js";
import { CATALOG_FIXTURE } from "./fixtures/9router-llm-catalog.js";

describe("LLM catalog", () => {
  test("requires immutable whitelisted nonempty unique provenance and LLM models", () => {
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, sourceCommit: "master" })).toThrow();
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, sourceFiles: undefined })).toThrow();
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, sourceFiles: [] })).toThrow();
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, sourceFiles: "open-sse/providers/registry/index.js" })).toThrow();
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, sourceFiles: ["bad.js"] })).toThrow();
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, sourceFiles: ["open-sse/providers/registry/index.js", "open-sse/providers/registry/index.js"] })).toThrow();
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, sourceFiles: ["open-sse/providers/schema.js", "open-sse/providers/models/schema.js", "open-sse/providers/models/helpers.js", "open-sse/config/grokCli.js"] })).not.toThrow();
    for (const file of ["open-sse/providers/pricing.js", "open-sse/config/providers.js", "open-sse/providers/shared.js"]) expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, sourceFiles: [file] })).toThrow();
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, providers: { bad: { id: "bad", catalogKey: "bad", aliases: [], models: [{ id: "image", kind: "image" }] } } })).toThrow();
  });

  test("validates provider, route, and model identity uniqueness", () => {
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, providers: { wrong: CATALOG_FIXTURE.providers.codex } })).toThrow();
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, providers: { one: { ...CATALOG_FIXTURE.providers.codex, id: "one" }, two: { ...CATALOG_FIXTURE.providers["grok-cli"], id: "two", catalogKey: "cx" } } })).toThrow();
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, providers: { one: { ...CATALOG_FIXTURE.providers.codex, id: "one" }, two: { ...CATALOG_FIXTURE.providers["grok-cli"], id: "two", aliases: ["cx"] } } })).toThrow();
    expect(() => validateLlmCatalog({ ...CATALOG_FIXTURE, providers: { codex: { ...CATALOG_FIXTURE.providers.codex, models: [{ id: "same", kind: "llm" }, { id: "same", kind: "llm" }] } } })).toThrow();
  });

  test("matches exact static route and preserves entry identity", () => {
    const match = matchLlmCatalogRoute("gb/grok-4.5-high", CATALOG_FIXTURE);
    expect(match).toMatchObject({ providerId: "grok-cli", catalogKey: "gcli", modelId: "grok-4.5-high" });
    expect(match?.provider).toBe(CATALOG_FIXTURE.providers["grok-cli"]);
    expect(match?.model).toBe(CATALOG_FIXTURE.providers["grok-cli"].models[0]);
    expect(matchLlmCatalogRoute("cx/gpt-5.6-sol/extra", CATALOG_FIXTURE)).toBeNull();
    expect(matchLlmCatalogRoute("unknown/grok-4.5-high", CATALOG_FIXTURE)).toBeNull();
    expect(matchLlmCatalogRoute("gcli", CATALOG_FIXTURE)).toBeNull();
    expect(matchLlmCatalogRoute("gcli/grok-4.5-HIGH", CATALOG_FIXTURE)).toBeNull();
    expect(matchLlmCatalogRoute("cx/GPT 5.6 Sol", CATALOG_FIXTURE)).toBeNull();
  });
});
