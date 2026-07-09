import { describe, expect, test } from "bun:test";
import { getModelsDevLookupName } from "../src/model-mapper.js";

describe("getModelsDevLookupName", () => {
  test("uses the basename for nested provider model IDs", () => {
    expect(getModelsDevLookupName("clinepass/cline-pass/glm-5.2")).toBe(
      "glm-5.2",
    );
  });

  test("keeps single-segment model IDs unchanged", () => {
    expect(getModelsDevLookupName("combo-model")).toBe("combo-model");
  });
});
