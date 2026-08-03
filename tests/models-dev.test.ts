import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setCacheDirForTest } from "../src/cache.js";
import { resolveModel } from "../src/model-mapper.js";
import { createModelsDevLookup, lookupModel, resetModelsDevCatalogsForTest } from "../src/models-dev.js";
import { apiCatalog, modelCatalog } from "./fixtures/models-dev.js";

const lookup = createModelsDevLookup(apiCatalog, modelCatalog);

describe("models.dev lookup", () => {
  test("uses canonical provider entry before model-only metadata", () => {
    expect(lookup.lookup("codex", "gpt-5.6-sol").providerModel?.reasoning_options).toEqual([
      { type: "effort", values: ["none", "low", "medium", "high", "xhigh", "max"] },
    ]);
  });

  test("keeps provider collisions isolated", () => {
    expect(lookup.lookup("provider-a", "shared-model").providerModel?.name).toBe("Provider A Shared");
    expect(lookup.lookup("provider-b", "shared-model").providerModel?.name).toBe("Provider B Shared");
    expect(lookup.lookup(undefined, "shared-model").providerModel).toBeNull();
  });

  test("uses exact canonical model key before fallback", () => {
    expect(lookup.lookup(undefined, "codex/gpt-5.6-sol").modelOnly?.id).toBe("codex/gpt-5.6-sol");
    expect(lookup.lookup(undefined, "gpt-5.6-sol").modelOnly?.id).toBe("codex/gpt-5.6-sol");
  });

  test("finds unique model-only metadata by exact key leaf", () => {
    const terra = { id: "openai/gpt-5.6-terra", name: "OpenAI Terra" };
    const fallbackLookup = createModelsDevLookup({}, { "openai/gpt-5.6-terra": terra });

    expect(fallbackLookup.lookup(undefined, "codex/gpt-5.6-terra").modelOnly).toBe(terra);
  });

  test("prefers exact model-only key over leaf fallback", () => {
    const exact = { id: "codex/gpt-5.6-terra", name: "Codex Terra" };
    const fallback = { id: "openai/gpt-5.6-terra", name: "OpenAI Terra" };
    const fallbackLookup = createModelsDevLookup({}, {
      "codex/gpt-5.6-terra": exact,
      "openai/gpt-5.6-terra": fallback,
    });

    expect(fallbackLookup.lookup(undefined, "codex/gpt-5.6-terra").modelOnly).toBe(exact);
  });

  test("rejects ambiguous distinct model-only leaf matches", () => {
    const fallbackLookup = createModelsDevLookup({}, {
      "openai/gpt-5.6-terra": { id: "openai/gpt-5.6-terra", name: "OpenAI Terra" },
      "anthropic/gpt-5.6-terra": { id: "anthropic/gpt-5.6-terra", name: "Anthropic Terra" },
    });

    expect(fallbackLookup.lookup(undefined, "codex/gpt-5.6-terra").modelOnly).toBeNull();
  });

  test("returns provider exact and unique model-only leaf metadata", () => {
    const provider = { id: "gpt-5.6-terra", name: "Codex Terra" };
    const global = { id: "openai/gpt-5.6-terra", name: "OpenAI Terra" };
    const fallbackLookup = createModelsDevLookup(
      { codex: { id: "codex", name: "Codex", models: { "gpt-5.6-terra": provider } } },
      { "openai/gpt-5.6-terra": global },
    );

    expect(fallbackLookup.lookup("codex", "codex/gpt-5.6-terra")).toEqual({ providerModel: provider, modelOnly: global });
  });

  test("keeps provider exact metadata when model-only leaf matches are ambiguous", () => {
    const provider = { id: "gpt-5.6-terra", name: "Codex Terra" };
    const fallbackLookup = createModelsDevLookup(
      { codex: { id: "codex", name: "Codex", models: { "gpt-5.6-terra": provider } } },
      {
        "openai/gpt-5.6-terra": { id: "openai/gpt-5.6-terra", name: "OpenAI Terra" },
        "anthropic/gpt-5.6-terra": { id: "anthropic/gpt-5.6-terra", name: "Anthropic Terra" },
      },
    );

    expect(fallbackLookup.lookup("codex", "codex/gpt-5.6-terra")).toEqual({ providerModel: provider, modelOnly: null });
  });

  test("does not normalize model-only leaf fallback", () => {
    const fallbackLookup = createModelsDevLookup({}, {
      "openai/gpt-5-6-terra": { id: "openai/gpt-5-6-terra", name: "OpenAI Terra" },
    });

    expect(fallbackLookup.lookup(undefined, "codex/gpt-5.6-terra").modelOnly).toBeNull();
  });
});

function mockApiCatalog(catalog: typeof apiCatalog): void {
  globalThis.fetch = async () => new Response(JSON.stringify(catalog), { status: 200 });
}

describe("legacy models.dev lookup", () => {
  const originalFetch = globalThis.fetch;
  let cacheDir: string;

  beforeEach(async () => {
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "models-dev-test-"));
    setCacheDirForTest(cacheDir);
    resetModelsDevCatalogsForTest();
  });

  afterEach(async () => {
    resetModelsDevCatalogsForTest();
    setCacheDirForTest();
    globalThis.fetch = originalFetch;
    await fs.rm(cacheDir, { recursive: true, force: true });
  });

  test("returns null for two-provider ID collision", async () => {
    mockApiCatalog(apiCatalog);
    expect(await lookupModel("shared-model")).toBeNull();
  });

  test("keeps unique model metadata", async () => {
    mockApiCatalog(apiCatalog);
    expect((await lookupModel("gpt-5.6-sol"))?.name).toBe("GPT 5.6 Sol");
  });

  test("keeps collision tombstoned after third provider", async () => {
    mockApiCatalog({
      ...apiCatalog,
      "provider-c": { id: "provider-c", name: "Provider C", models: { "shared-model": { id: "shared-model", name: "Provider C Shared" } } },
    });
    expect(await lookupModel("shared-model")).toBeNull();
  });

  test("returns null for collision in reversed provider order", async () => {
    mockApiCatalog({ "provider-b": apiCatalog["provider-b"], "provider-a": apiCatalog["provider-a"] });
    expect(await lookupModel("shared-model")).toBeNull();
  });

  test("keeps dash and dot normalization", async () => {
    mockApiCatalog({ only: { id: "only", name: "Only", models: { "gpt-5-5": { id: "gpt-5-5", name: "GPT 5.5" } } } });
    expect((await lookupModel("gpt5.5"))?.name).toBe("GPT 5.5");
  });

  test("rejects normalized alias collisions", async () => {
    mockApiCatalog({
      dashed: { id: "dashed", name: "Dashed", models: { "gpt-5-5": { id: "gpt-5-5", name: "GPT 5-5" } } },
      dotted: { id: "dotted", name: "Dotted", models: { "gpt-5.5": { id: "gpt-5.5", name: "GPT 5.5" } } },
    });
    expect(await lookupModel("gpt5.5")).toBeNull();
    const entry = await resolveModel("private-provider/gpt5.5", undefined);
    expect(entry).toMatchObject({
      id: "private-provider/gpt5.5",
      name: "private-provider/gpt5.5",
      attachment: false,
      reasoning: false,
      temperature: true,
      tool_call: true,
    });
    expect(entry.limit).toBeUndefined();
    expect(entry.modalities).toBeUndefined();
  });

  test("does not normalize past direct ambiguous ID", async () => {
    mockApiCatalog({
      "provider-a": { id: "provider-a", name: "Provider A", models: { "gpt5.5": { id: "gpt5.5", name: "Provider A GPT 5.5" } } },
      "provider-b": { id: "provider-b", name: "Provider B", models: { "gpt5.5": { id: "gpt5.5", name: "Provider B GPT 5.5" } } },
      only: { id: "only", name: "Only", models: { "gpt-5-5": { id: "gpt-5-5", name: "GPT 5.5" } } },
    });
    expect(await lookupModel("gpt5.5")).toBeNull();
  });
});
