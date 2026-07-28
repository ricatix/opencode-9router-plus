import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setCacheDirForTest } from "../src/cache.js";
import { createModelsDevLookup, lookupModel, resetModelsDevCatalogsForTest } from "../src/models-dev.js";
import { apiCatalog, modelCatalog } from "./fixtures/models-dev.js";

const lookup = createModelsDevLookup(apiCatalog, modelCatalog);

describe("models.dev lookup", () => {
  test("uses canonical provider entry before model-only metadata", () => {
    expect(lookup.lookup("openai", "gpt-5.6-sol").providerModel?.reasoning_options).toEqual([
      { type: "effort", values: ["none", "low", "medium", "high", "xhigh", "max"] },
    ]);
  });

  test("keeps provider collisions isolated", () => {
    expect(lookup.lookup("provider-a", "shared-model").providerModel?.name).toBe("Provider A Shared");
    expect(lookup.lookup("provider-b", "shared-model").providerModel?.name).toBe("Provider B Shared");
    expect(lookup.lookup(undefined, "shared-model").providerModel).toBeNull();
  });

  test("uses model-only catalog only for canonical model key", () => {
    expect(lookup.lookup(undefined, "openai/gpt-5.6-sol").modelOnly?.id).toBe("openai/gpt-5.6-sol");
    expect(lookup.lookup(undefined, "gpt-5.6-sol").modelOnly).toBeNull();
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

  test("does not normalize past direct ambiguous ID", async () => {
    mockApiCatalog({
      "provider-a": { id: "provider-a", name: "Provider A", models: { "gpt5.5": { id: "gpt5.5", name: "Provider A GPT 5.5" } } },
      "provider-b": { id: "provider-b", name: "Provider B", models: { "gpt5.5": { id: "gpt5.5", name: "Provider B GPT 5.5" } } },
      only: { id: "only", name: "Only", models: { "gpt-5-5": { id: "gpt-5-5", name: "GPT 5.5" } } },
    });
    expect(await lookupModel("gpt5.5")).toBeNull();
  });
});
