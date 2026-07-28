import { describe, expect, test } from "bun:test";
import { createModelsDevLookup } from "../src/models-dev.js";
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
