import type { ReasoningOption } from "./models-dev.js";
import type { NineRouterCapabilities } from "./route-types.js";

export type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh";
export type ModelVariants = Partial<Record<ReasoningEffort, { reasoningEffort: ReasoningEffort }>>;

const efforts: readonly ReasoningEffort[] = ["none", "low", "medium", "high", "xhigh"];
const baseline: readonly ReasoningEffort[] = ["low", "medium", "high"];

function exactEfforts(value: unknown): ReasoningEffort[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return null;
  return value.filter((item): item is ReasoningEffort => efforts.includes(item as ReasoningEffort));
}

function routeEfforts(value: unknown): ReasoningEffort[] | null {
  if (Array.isArray(value)) return exactEfforts(value);
  if (value && typeof value === "object" && "values" in value) return exactEfforts((value as { values?: unknown }).values);
  return null;
}

function metadataEfforts(value: unknown): ReasoningEffort[] | null {
  if (!Array.isArray(value)) return null;
  const option = value.find((item) => item && typeof item === "object" && (item as ReasoningOption).type === "reasoning_effort");
  return option ? exactEfforts((option as ReasoningOption).values) : null;
}

export function resolveReasoningVariants(input: {
  capabilities: NineRouterCapabilities | undefined;
  reasoningOptions?: ReasoningOption[];
}): ModelVariants {
  const capabilities = input?.capabilities;
  if (!capabilities || capabilities.reasoning !== true) return {};

  const format = typeof capabilities.thinkingFormat === "string" ? capabilities.thinkingFormat.trim().toLowerCase() : "";
  if (format === "adaptive" || format === "claude-adaptive" || format === "minimax") return {};

  const metadata = input.reasoningOptions === undefined ? undefined : metadataEfforts(input.reasoningOptions);
  if (metadata === null) return {};
  const route = routeEfforts(capabilities.thinkingRange);
  let allowed = format === "deepseek"
    ? route === null || metadata === undefined ? [] : metadata.filter((effort) => route.includes(effort))
    : metadata ?? [...baseline, "none"];

  allowed = allowed.filter((effort) => effort !== "none" || capabilities.thinkingCanDisable === true);
  allowed = allowed.filter((effort) => effort !== "xhigh" || metadata?.includes("xhigh") === true && route?.includes("xhigh") === true);
  return Object.fromEntries(allowed.map((reasoningEffort) => [reasoningEffort, { reasoningEffort }]));
}
