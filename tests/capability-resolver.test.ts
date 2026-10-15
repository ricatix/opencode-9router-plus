import { describe, expect, test } from "bun:test";
import { resolveReasoningVariants } from "../src/capability-resolver.js";
import { NINE_ROUTER_LLM_CATALOG as catalog } from "../src/generated/9router-llm-catalog.js";

const efforts = (levels: string) =>
  Object.fromEntries(
    levels
      .split(" ")
      .filter(Boolean)
      .map((level) => [level, { reasoningEffort: level }]),
  );
const off = { thinking: { type: "disabled" } };
const on = { thinking: { type: "enabled" } };
const resolve = (routeId: string, live?: unknown, reasoning = true) =>
  resolveReasoningVariants({ routeId, reasoning, live, catalog });

describe("audited router format matrix", () => {
  const cases = [
    ["openai", "none minimal low medium high xhigh"],
    ["claude-adaptive", "none low medium high xhigh max"],
    ["claude-budget", "none low medium high xhigh max"],
    ["gemini-level", "minimal low medium high"],
    ["gemini-budget", "none low medium high"],
    ["qwen", "none low medium high"],
    ["kimi", "none low medium high max"],
    ["deepseek", "none high max"],
    ["commandcode", "low medium high xhigh max"],
    ["hunyuan", "none low medium high"],
    ["step", "low medium high"],
    ["tokenrouter", "low medium high xhigh max"],
  ];
  test.each(cases)(
    "preserves exact effort payloads when live format is %s",
    (format, levels) => {
      // Given a new model on a known transport; When resolving its live format.
      const actual = resolve("openai/new-model", { thinkingFormat: format });
      // Then no native budgets, defaults, or aliases are invented.
      expect(actual).toEqual(efforts(levels));
    },
  );
  test.each(["zai", "minimax"])(
    "uses router toggles when format is %s",
    (format) => {
      const actual = resolve("openai/new-model", { thinkingFormat: format });
      expect(actual).toEqual({ none: off, thinking: on });
    },
  );
  test.each(["zai", "minimax"])(
    "removes off when %s cannot disable",
    (format) => {
      const actual = resolve("openai/new-model", {
        thinkingFormat: format,
        thinkingCanDisable: false,
      });
      expect(actual).toEqual({ thinking: on });
    },
  );
});

describe("route-scoped precedence", () => {
  const cases = [
    ["cmc/deepseek-v4.1-flash", "low medium high xhigh max"],
    ["commandcode/deepseek-v4.1-flash", "low medium high xhigh max"],
    ["ds/deepseek-v4.1-flash", "none low medium high xhigh max"],
    ["cbcn/deepseek-v4.1-flash", "low high max"],
    ["cbcn/deepseek-v4-pro", "low high xhigh"],
    ["cbai/deepseek-v4.1-flash", "none low medium high xhigh max"],
    ["cbai/deepseek-v4-pro", "low high xhigh"],
    ["cx/gpt-6.1-sol", "low medium high xhigh max"],
    ["cx/gpt-5.6-sol", "none minimal low medium high xhigh max ultra"],
    ["cx/gpt-5.6-terra", "none minimal low medium high xhigh max ultra"],
    ["cx/gpt-5.6-luna", "none minimal low medium high xhigh max"],
    ["openai/gpt-5.6-sol", ""],
    ["cbcn/glm-5.2", "high xhigh"],
    ["cbcn/glm-5.3", "low high max"],
    ["cbcn/glm-5.3-flash", "low high max"],
    ["cbcn/kimi-k2.8-preview", "low medium high"],
    ["cbcn/hy3", "low high"],
    ["cbcn/hy4-preview", "high"],
    ["mm/MiniMax-M3", "none high"],
    ["mmg/MiniMax-M3", "none high"],
    ["mm/MiniMax-M3.1-Flash-Preview", "low medium high xhigh max"],
    ["mmg/MiniMax-M3.1-Flash-Preview", "low medium high xhigh max"],
    ["cc/claude-opus-5", "none low medium high xhigh max"],
    ["kr/claude-opus-4.5", ""],
    ["kr/claude-opus-5.5", "none low medium high xhigh max"],
    ["kr/gpt-5.6-sol", "low medium high xhigh"],
    ["kr/new-model", ""],
    ["tr/anthropic/claude-sonnet-4.6", "low medium high max"],
    ["xmtp/mimo-v2.5-pro", "low medium high xhigh"],
    ["mimo/mimo-v2.6-pro", "low medium high xhigh"],
    ["cc/claude-fable-5-1", "low medium high xhigh max"],
    ["muse/muse-spark-1.3", "minimal low medium high xhigh"],
    ["muse-ai/muse-spark-1.3", "minimal low medium high xhigh"],
  ];
  test.each(cases)(
    "selects audited levels when route is %s",
    (routeId, levels) => {
      const actual = resolve(routeId);
      expect(actual).toEqual(efforts(levels));
    },
  );
  test("does not match a pattern against the route alias", () => {
    const custom = {
      ...catalog,
      routeOwners: { ...catalog.routeOwners, "claude-4.6": "openai" },
    };
    const actual = resolveReasoningVariants({
      routeId: "claude-4.6/new",
      reasoning: true,
      live: { thinkingFormat: "openai" },
      catalog: custom,
    });
    expect(actual).toEqual(efforts("none minimal low medium high xhigh"));
  });
  test("honors an empty exact model policy instead of falling back", () => {
    const custom = structuredClone(catalog);
    Object.assign(custom.providers.codex.models[0], { thinkingLevels: [] });
    const actual = resolveReasoningVariants({
      routeId: "cx/gpt-6.1-sol",
      reasoning: true,
      catalog: custom,
    });
    expect(actual).toEqual({});
  });
  test("uses first compatible pattern rather than promoting scoped rules", () => {
    const custom = {
      ...catalog,
      reasoningPicker: {
        formatLevels: catalog.reasoningPicker.formatLevels,
        patternLevels: [
          { provider: "codex", pattern: "*", levels: ["ultra"] },
          { pattern: "*", levels: ["low"] },
          { provider: "openai", pattern: "*", levels: ["high"] },
        ],
      },
    };
    const actual = resolveReasoningVariants({
      routeId: "openai/new",
      reasoning: true,
      live: { thinkingFormat: "openai" },
      catalog: custom,
    });
    expect(actual).toEqual(efforts("low"));
  });
  test("keeps regex literals literal and glob case insensitive as router does", () => {
    const custom = {
      ...catalog,
      reasoningPicker: {
        formatLevels: {},
        patternLevels: [{ pattern: "v1.2+[x]?*", levels: ["high"] }],
      },
    };
    const actual = resolveReasoningVariants({
      routeId: "openai/V1.2+[x]?nested/id",
      reasoning: true,
      live: { thinkingFormat: "openai" },
      catalog: custom,
    });
    expect(actual).toEqual(efforts("high"));
  });
});

describe("live authority and conservative boundary", () => {
  test("discards incompatible exact model levels when live format changes", () => {
    const actual = resolve("cx/gpt-6.1-sol", { thinkingFormat: "minimax" });
    expect(actual).toEqual({ none: off, thinking: on });
  });
  test("live canDisable wins over reviewed capability", () => {
    const actual = resolve("cx/gpt-5.6-sol", { thinkingCanDisable: false });
    expect(actual).toEqual(efforts("minimal low medium high xhigh max ultra"));
  });
  test.each(["cmc/new", "tr/new"])(
    "never advertises off from transport omission when route is %s",
    (routeId) => {
      const actual = resolve(routeId, {
        thinkingFormat: "minimax",
        thinkingCanDisable: true,
      });
      expect(actual).toEqual({});
    },
  );
  test("does not turn range or speculative supportedEfforts into an exact live list", () => {
    const actual = resolve("openai/new", {
      thinkingFormat: "openai",
      thinkingRange: [],
      supportedEfforts: ["ultra"],
    });
    expect(actual).toEqual(efforts("none minimal low medium high xhigh"));
  });
  test.each([false, undefined, "true", null])(
    "requires final reasoning true when value is %s",
    (reasoning) => {
      const actual = resolveReasoningVariants({
        routeId: "cx/gpt-5.6-sol",
        reasoning,
        catalog,
      });
      expect(actual).toEqual({});
    },
  );
  test.each(["unknown/new", "openai", "/new", "openai/", "__proto__/new"])(
    "rejects unsupported route %s",
    (routeId) => {
      const actual = resolve(routeId, { thinkingFormat: "openai" });
      expect(actual).toEqual({});
    },
  );
  test.each(["unknown", " OPENAI ", "OpenAI", "", "x".repeat(65), 1, null])(
    "fails conservatively for live format %s",
    (thinkingFormat) => {
      const actual = resolve("openai/new", { thinkingFormat });
      expect(actual).toEqual({});
    },
  );
  test("ignores malformed live fields without losing reviewed policy", () => {
    const actual = resolve("cx/gpt-6.1-sol", {
      thinkingFormat: 42,
      thinkingCanDisable: "false",
      thinkingRange: { min: 8, max: 1 },
    });
    expect(actual).toEqual(efforts("low medium high xhigh max"));
  });
  test("does not invoke own getters or inherited runtime fields", () => {
    const live = Object.create({ thinkingCanDisable: false });
    Object.defineProperty(live, "thinkingFormat", {
      get() {
        throw new Error("getter invoked");
      },
    });
    const actual = resolve("cx/gpt-6.1-sol", live);
    expect(actual).toEqual(efforts("low medium high xhigh max"));
  });
  test("does not inspect custom range iterators", () => {
    const range = ["ultra"];
    Object.defineProperty(range, Symbol.iterator, {
      get() {
        throw new Error("iterator invoked");
      },
    });
    const actual = resolve("openai/new", {
      thinkingFormat: "openai",
      thinkingRange: range,
    });
    expect(actual).toEqual(efforts("none minimal low medium high xhigh"));
  });
  test("does not mutate frozen input", () => {
    const live = Object.freeze({
      thinkingFormat: "kimi",
      thinkingCanDisable: false,
    });
    const actual = resolve("openai/new", live);
    expect(actual).toEqual(efforts("low medium high max"));
  });
});
