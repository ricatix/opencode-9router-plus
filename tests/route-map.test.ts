import { describe, expect, test } from "bun:test";
import { resolveRouteModel, validateRouteMapSnapshot } from "../src/route-map.js";
import { ROUTE_MAP_SNAPSHOT } from "../src/generated/9router-route-map.js";

describe("resolveRouteModel", () => {
  test("normalizes Codex review alias", () => {
    expect(resolveRouteModel("cx/gpt-5.6-sol-review", ROUTE_MAP_SNAPSHOT)).toEqual({
      routeAlias: "cx",
      routeModelId: "gpt-5.6-sol-review",
      canonicalProvider: "openai",
      canonicalModelId: "gpt-5.6-sol",
    });
  });

  test("normalizes Grok quality alias", () => {
    expect(resolveRouteModel("gcli/grok-4.5-high", ROUTE_MAP_SNAPSHOT)).toMatchObject({
      canonicalProvider: "xai",
      canonicalModelId: "grok-4.5",
    });
  });

  test("does not guess opaque routes", () => {
    expect(
      resolveRouteModel("openai-compatible-team/private-model", ROUTE_MAP_SNAPSHOT),
    ).toEqual({
      routeAlias: "openai-compatible-team",
      routeModelId: "private-model",
    });
  });

  test("preserves route ID without route", () => {
    expect(resolveRouteModel("model-without-route", ROUTE_MAP_SNAPSHOT)).toEqual({
      routeAlias: "",
      routeModelId: "model-without-route",
    });
  });

  test("preserves route ID with missing alias", () => {
    expect(resolveRouteModel("/missing-alias", ROUTE_MAP_SNAPSHOT)).toEqual({
      routeAlias: "",
      routeModelId: "/missing-alias",
    });
  });

  test("preserves route ID with empty alias", () => {
    expect(resolveRouteModel("alias/", ROUTE_MAP_SNAPSHOT)).toEqual({
      routeAlias: "",
      routeModelId: "alias/",
    });
  });
});

describe("validateRouteMapSnapshot", () => {
  test("rejects empty snapshots", () => {
    expect(() => validateRouteMapSnapshot({ sourceCommit: "", directProviders: [] })).toThrow();
  });

  test("rejects malformed snapshots", () => {
    expect(() => validateRouteMapSnapshot({ sourceCommit: "abc", directProviders: ["openai"] })).toThrow();
  });
});
