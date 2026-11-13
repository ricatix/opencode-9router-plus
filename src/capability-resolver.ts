import type { NineRouterLlmCatalog } from "./route-types.js";

export type ReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max"
  | "ultra";
export type ModelVariants = Partial<
  Record<
    ReasoningEffort | "thinking",
    | { readonly reasoningEffort: ReasoningEffort }
    | { readonly thinking: { readonly type: "enabled" | "disabled" } }
  >
>;

const own = (value: unknown, key: string): unknown => {
  if (!value || typeof value !== "object") return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
};
const formatName = (value: unknown): string | undefined =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 64 &&
  /^[a-z][a-z-]*$/.test(value)
    ? value
    : undefined;
const boolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;
const effort = (level: string): level is ReasoningEffort =>
  [
    "none",
    "minimal",
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
    "ultra",
  ].includes(level);
const MAX_LIVE_LEVELS = 16,
  MAX_LEVEL_CHARS = 64;
const levelName = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= MAX_LEVEL_CHARS &&
  value === value.trim() &&
  ![...value].some((char) => {
    const code = char.charCodeAt(0);
    return code < 32 || code === 127;
  });
const liveLevelList = (input: unknown): readonly string[] | undefined => {
  if (!Array.isArray(input)) return undefined;
  const length = own(input, "length");
  if (
    typeof length !== "number" ||
    !Number.isSafeInteger(length) ||
    length === 0 ||
    length > MAX_LIVE_LEVELS
  )
    return undefined;
  const levels: string[] = [];
  for (let index = 0; index < length; index++) {
    const item = own(input, String(index));
    if (
      !levelName(item) ||
      levels.includes(item) ||
      !(effort(item) || item === "thinking")
    )
      return undefined;
    levels.push(item);
  }
  return levels;
};
const knownFormats = new Set([
  "openai",
  "claude-adaptive",
  "claude-budget",
  "gemini-level",
  "gemini-budget",
  "zai",
  "qwen",
  "kimi",
  "deepseek",
  "commandcode",
  "minimax",
  "hunyuan",
  "step",
  "nous",
  "tokenrouter",
]);

function matchesGlob(value: string, pattern: string): boolean {
  const source = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}$`, "i").test(value);
}

export function resolveReasoningVariants(input: {
  readonly routeId: string;
  readonly reasoning: unknown;
  readonly live?: unknown;
  readonly liveLevels?: unknown;
  readonly catalog: NineRouterLlmCatalog;
}): ModelVariants {
  if (input.reasoning !== true) return {};
  const slash = input.routeId.indexOf("/");
  if (slash <= 0 || slash === input.routeId.length - 1) return {};
  const alias = input.routeId.slice(0, slash);
  const modelId = input.routeId.slice(slash + 1);
  const owner = own(input.catalog.routeOwners, alias);
  const provider =
    typeof owner === "string" && Object.hasOwn(input.catalog.providers, owner)
      ? input.catalog.providers[owner]
      : undefined;
  if (!provider) return {};
  const model = provider.models.find((entry) => entry.id === modelId);
  if (provider.id === "kiro" && model?.thinkingEligible !== true) return {};
  const staticFormat =
    provider.thinkingFormat ?? model?.reasoning?.thinkingFormat;
  const liveFormat = formatName(own(input.live, "thinkingFormat"));
  const format = liveFormat ?? staticFormat;
  if (!format || !knownFormats.has(format)) return {};
  const compatible =
    liveFormat === undefined ||
    staticFormat == null ||
    liveFormat === staticFormat;
  const canDisable =
    boolean(own(input.live, "thinkingCanDisable")) ??
    (compatible ? model?.reasoning?.thinkingCanDisable : undefined);
  const pattern = compatible
    ? input.catalog.reasoningPicker.patternLevels.find(
        (rule) =>
          (!rule.provider || rule.provider === provider.id) &&
          matchesGlob(modelId, rule.pattern),
      )
    : undefined;
  const levels =
    liveLevelList(input.liveLevels) ??
    (compatible ? model?.thinkingLevels : undefined) ??
    pattern?.levels ??
    (format === "tokenrouter"
      ? ["low", "medium", "high", "xhigh", "max"]
      : input.catalog.reasoningPicker.formatLevels[format]);
  if (!levels) return {};
  const transport =
    provider.id === "muse"
      ? "openai-responses"
      : (provider.thinkingFormat ?? format);
  const explicitOff =
    ![
      "commandcode",
      "tokenrouter",
      "step",
      "nous",
      "openai-responses",
    ].includes(transport) &&
    !["commandcode", "tokenrouter", "step", "nous", "gemini-level"].includes(
      format,
    );
  const variants: ModelVariants = {};
  for (const level of levels) {
    if (level === "none" && (canDisable === false || !explicitOff)) continue;
    if (level === "thinking") {
      if (
        (format === "zai" || format === "minimax") &&
        !["commandcode", "tokenrouter", "step"].includes(transport)
      )
        variants.thinking = { thinking: { type: "enabled" } };
    } else if (effort(level)) {
      if (level === "none" && (format === "zai" || format === "minimax")) {
        variants.none = { thinking: { type: "disabled" } };
      } else {
        variants[level] = { reasoningEffort: level };
      }
    }
  }
  if (provider.id === "kiro" && format === "openai") {
    delete variants.none;
    delete variants.minimal;
    delete variants.max;
    delete variants.ultra;
  }
  return variants;
}
