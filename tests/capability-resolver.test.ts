import { describe, expect, test } from "bun:test";
import { resolveCatalogVariants, resolveReasoningVariants } from "../src/capability-resolver.js";
import { NINE_ROUTER_LLM_CATALOG } from "../src/generated/9router-llm-catalog.js";
import type { NineRouterLlmCatalog } from "../src/route-types.js";

const resolve = (capabilities: unknown, reasoningOptions?: unknown) =>
  resolveReasoningVariants({ capabilities: capabilities as never, reasoningOptions: reasoningOptions as never });
const all = { none: { reasoningEffort: "none" }, low: { reasoningEffort: "low" }, medium: { reasoningEffort: "medium" }, high: { reasoningEffort: "high" } };
const baseline = { low: { reasoningEffort: "low" }, medium: { reasoningEffort: "medium" }, high: { reasoningEffort: "high" } };
const options = (values: string[]) => [{ type: "effort", values }];

describe("resolveReasoningVariants Oracle Task 3 matrix", () => {
  test("1 absent capabilities", () => expect(resolve(undefined)).toEqual({}));
  test("2 reasoning false", () => expect(resolve({ reasoning: false, thinkingFormat: "openai" })).toEqual({}));
  test("3 reasoning missing", () => expect(resolve({ thinkingFormat: "openai" })).toEqual({}));
  test("4 reasoning non-boolean", () => expect(resolve({ reasoning: "true", thinkingFormat: "openai" })).toEqual({}));
  test("5 OpenAI baseline", () => expect(resolve({ reasoning: true, thinkingFormat: "openai" })).toEqual(baseline));
  test("6 Gemini baseline", () => expect(resolve({ reasoning: true, thinkingFormat: "gemini" })).toEqual(baseline));
  test("7 unknown baseline", () => expect(resolve({ reasoning: true, thinkingFormat: "other" })).toEqual(baseline));
  test("8 undefined format baseline", () => expect(resolve({ reasoning: true })).toEqual(baseline));
  test("9 null format baseline", () => expect(resolve({ reasoning: true, thinkingFormat: null })).toEqual(baseline));
  test("10 OpenAI trim lower", () => expect(resolve({ reasoning: true, thinkingFormat: " OpEnAi " })).toEqual(baseline));
  test("11 Gemini trim lower", () => expect(resolve({ reasoning: true, thinkingFormat: " GEMINI " })).toEqual(baseline));
  test("12 no format coercion", () => expect(resolve({ reasoning: true, thinkingFormat: 1 })).toEqual(baseline));
  test("13 adaptive empty", () => expect(resolve({ reasoning: true, thinkingFormat: "adaptive" })).toEqual({}));
  test("14 claude-adaptive empty", () => expect(resolve({ reasoning: true, thinkingFormat: "claude-adaptive" })).toEqual({}));
  test("15 minimax empty", () => expect(resolve({ reasoning: true, thinkingFormat: "minimax" })).toEqual({}));
  test("16 adaptive trim lower", () => expect(resolve({ reasoning: true, thinkingFormat: " ADAPTIVE " })).toEqual({}));
  test("17 none needs disable", () => expect(resolve({ reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false })).toEqual(baseline));
  test("18 none with disable", () => expect(resolve({ reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true })).toEqual(all));
  test("19 disable exact boolean", () => expect(resolve({ reasoning: true, thinkingFormat: "openai", thinkingCanDisable: "true" })).toEqual(baseline));
  test("20 metadata undefined baseline", () => expect(resolve({ reasoning: true, thinkingFormat: "gemini" }, undefined)).toEqual(baseline));
  test("21 metadata exact efforts filters", () => expect(resolve({ reasoning: true, thinkingFormat: "openai" }, options(["low", "high"]))).toEqual({ low: { reasoningEffort: "low" }, high: { reasoningEffort: "high" } }));
  test("22 metadata excludes all", () => expect(resolve({ reasoning: true, thinkingFormat: "openai" }, options([]))).toEqual({}));
  test("23 no exact effort entry", () => expect(resolve({ reasoning: true, thinkingFormat: "openai" }, [{ type: "other", values: ["low"] }])).toEqual({}));
  test("24 wrong type case", () => expect(resolve({ reasoning: true, thinkingFormat: "openai" }, [{ type: "Effort", values: ["low"] }])).toEqual({}));
  test("25 malformed options", () => expect(resolve({ reasoning: true, thinkingFormat: "openai" }, {})).toEqual({}));
  test("26 malformed values", () => expect(resolve({ reasoning: true, thinkingFormat: "openai" }, [{ type: "effort", values: "low" }])).toEqual({}));
  test("27 invalid effort ignored", () => expect(resolve({ reasoning: true, thinkingFormat: "openai" }, options(["low", "max", " LOW "]))).toEqual({ low: { reasoningEffort: "low" } }));
  test("28 max never output", () => expect(resolve({ reasoning: true, thinkingFormat: "openai" }, options(["max"]))).toEqual({}));
  test("29 metadata none still needs disable", () => expect(resolve({ reasoning: true, thinkingFormat: "openai" }, options(["none"]))).toEqual({}));
  test("30 DeepSeek needs range", () => expect(resolve({ reasoning: true, thinkingFormat: "deepseek" }, options(["low"]))).toEqual({}));
  test("31 DeepSeek range intersection", () => expect(resolve({ reasoning: true, thinkingFormat: "deepseek", thinkingRange: ["low", "high"] }, options(["low", "medium"]))).toEqual({ low: { reasoningEffort: "low" } }));
  test("32 DeepSeek object range", () => expect(resolve({ reasoning: true, thinkingFormat: "deepseek", thinkingRange: { values: ["medium"] } }, options(["medium", "high"]))).toEqual({ medium: { reasoningEffort: "medium" } }));
  test("33 DeepSeek none needs disable", () => expect(resolve({ reasoning: true, thinkingFormat: "deepseek", thinkingRange: ["none"], thinkingCanDisable: false }, options(["none"]))).toEqual({}));
  test("34 DeepSeek none disable", () => expect(resolve({ reasoning: true, thinkingFormat: "deepseek", thinkingRange: ["none"], thinkingCanDisable: true }, options(["none"]))).toEqual({ none: { reasoningEffort: "none" } }));
  test("35 DeepSeek malformed array", () => expect(resolve({ reasoning: true, thinkingFormat: "deepseek", thinkingRange: ["low", 1] }, options(["low"]))).toEqual({}));
  test("36 DeepSeek malformed object", () => expect(resolve({ reasoning: true, thinkingFormat: "deepseek", thinkingRange: { values: "low" } }, options(["low"]))).toEqual({}));
  test("37 DeepSeek no metadata", () => expect(resolve({ reasoning: true, thinkingFormat: "deepseek", thinkingRange: ["low"] })).toEqual({}));
  test("38 xhigh route and metadata", () => expect(resolve({ reasoning: true, thinkingFormat: "openai", thinkingRange: ["xhigh"] }, options(["xhigh"]))).toEqual({ xhigh: { reasoningEffort: "xhigh" } }));
  test("39 xhigh needs route evidence", () => expect(resolve({ reasoning: true, thinkingFormat: "openai" }, options(["xhigh"]))).toEqual({}));
  test("40 no mutation and malformed safe", () => { const caps = { reasoning: true, thinkingFormat: "openai", thinkingRange: ["xhigh"] }; const metadata = options(["low", "xhigh"]); const before = JSON.stringify([caps, metadata]); expect(resolve(caps, metadata)).toEqual({ low: { reasoningEffort: "low" }, xhigh: { reasoningEffort: "xhigh" } }); expect(JSON.stringify([caps, metadata])).toBe(before); });
  test("41 reasoning_effort metadata rejected", () => expect(resolve({ reasoning: true, thinkingFormat: "openai" }, [{ type: "reasoning_effort", values: ["low"] }])).toEqual({}));
  test("42 on-off array range empty", () => expect(resolve({ reasoning: true, thinkingFormat: "openai", thinkingRange: ["on", "off"] })).toEqual({}));
  test("43 on-off object range empty", () => expect(resolve({ reasoning: true, thinkingFormat: "openai", thinkingRange: { values: ["on"] } })).toEqual({}));
});

const picker = (patternLevels: readonly { pattern: string; levels: readonly string[] }[] = [], formatLevels: Readonly<Record<string, readonly string[]>> = {}): NineRouterLlmCatalog["reasoningPicker"] => ({ patternLevels, formatLevels });
const resolveCatalog = (rawModelId: string, staticCapabilities: unknown, customPicker = picker()) => resolveCatalogVariants({ rawModelId, staticCapabilities: staticCapabilities as never, picker: customPicker });
const variants = (...levels: string[]) => Object.fromEntries(levels.map((reasoningEffort) => [reasoningEffort, { reasoningEffort }]));

describe("resolveCatalogVariants Task 4", () => {
  test("snapshot picker gives gpt-5.6-sol seven discrete efforts", () => expect(resolveCatalog("cx/gpt-5.6-sol", { reasoning: true, thinkingFormat: "openai" }, NINE_ROUTER_LLM_CATALOG.reasoningPicker)).toEqual(variants("none", "minimal", "low", "medium", "high", "xhigh", "max")));
  test("first matching pattern wins", () => expect(resolveCatalog("model", { reasoning: true }, picker([{ pattern: "*", levels: ["low"] }, { pattern: "model", levels: ["high"] }]))).toEqual(variants("low")));
  test("glob is case sensitive, escapes regex literals, wildcard matches zero or many", () => {
    const rules = [{ pattern: "v1.2+[x]?*", levels: ["minimal"] }];
    expect(resolveCatalog("v1.2+[x]?", { reasoning: true }, picker(rules))).toEqual(variants("minimal"));
    expect(resolveCatalog("v1.2+[x]?suffix", { reasoning: true }, picker(rules))).toEqual(variants("minimal"));
    expect(resolveCatalog("V1.2+[x]?", { reasoning: true }, picker(rules))).toEqual({});
  });
  test("falls back to exact thinking format", () => expect(resolveCatalog("other", { reasoning: true, thinkingFormat: "openai" }, picker([], { openai: ["low", "high"] }))).toEqual(variants("low", "high")));
  test("missing or non-true reasoning gives no variants", () => {
    expect(resolveCatalog("model", undefined)).toEqual({});
    expect(resolveCatalog("model", { reasoning: false })).toEqual({});
    expect(resolveCatalog("model", { reasoning: "true" })).toEqual({});
  });
  test("false thinkingCanDisable removes none only", () => expect(resolveCatalog("model", { reasoning: true, thinkingCanDisable: false }, picker([{ pattern: "*", levels: ["none", "low"] }]))).toEqual(variants("low")));
  test("non-discrete levels and unknown formats give no variants", () => {
    expect(resolveCatalog("model", { reasoning: true }, picker([{ pattern: "*", levels: ["auto", "on", "off", "thinking", "unknown"] }]))).toEqual({});
    expect(resolveCatalog("model", { reasoning: true, thinkingFormat: "missing" }, picker())).toEqual({});
  });
  test("max and xhigh retain distinct payloads without mutating input", () => {
    const capabilities = { reasoning: true, thinkingFormat: "fmt", thinkingRange: ["on"] };
    const customPicker = picker([], { fmt: ["xhigh", "max"] }); const before = JSON.stringify([capabilities, customPicker]);
    expect(resolveCatalog("model", capabilities, customPicker)).toEqual(variants("xhigh", "max"));
    expect(JSON.stringify([capabilities, customPicker])).toBe(before);
  });
});
