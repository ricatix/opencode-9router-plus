import type { CatalogRouteMatch, NineRouterLlmCatalog } from "./route-types.js";

const sourceFile =
  /^open-sse\/(?:providers\/registry\/(?:index|[^/]+)\.js|providers\/(?:index|schema)\.js|providers\/models\/(?:schema|helpers)\.js|config\/(?:providerModels|grokCli)\.js|providers\/(?:thinkingLevels|capabilities)\.js)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

const maxCatalogId = 512,
  maxFormat = 64,
  maxPickerEntries = 32,
  maxLevels = 7,
  maxBudget = 1_000_000;
const catalogLevels = new Set([
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "thinking",
]);
const rangeLevels = new Set([
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "on",
  "off",
]);
const safeString = (value: unknown, max: number) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= max &&
  ![...value].some(
    (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
  );
const uniqueLevels = (value: unknown, allowed: Set<string>) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.length <= maxLevels &&
  value.every((level) => typeof level === "string" && allowed.has(level)) &&
  new Set(value).size === value.length;
function validRange(value: unknown): boolean {
  if (value === null) return true;
  if (uniqueLevels(value, rangeLevels)) return true;
  if (!isRecord(value)) return false;
  if (Object.keys(value).length === 1 && "values" in value)
    return uniqueLevels(value.values, rangeLevels);
  if (Object.keys(value).length !== 2 || !("min" in value) || !("max" in value))
    return false;
  return (
    typeof value.min === "number" &&
    typeof value.max === "number" &&
    Number.isSafeInteger(value.min) &&
    Number.isSafeInteger(value.max) &&
    value.min >= 0 &&
    value.min <= value.max &&
    value.max <= maxBudget
  );
}
function validReasoning(value: unknown): boolean {
  if (
    !isRecord(value) ||
    Object.keys(value).length > 4 ||
    (value.reasoning !== true && value.reasoning !== false)
  )
    return false;
  if (
    "thinkingFormat" in value &&
    value.thinkingFormat !== null &&
    !safeString(value.thinkingFormat, maxFormat)
  )
    return false;
  if (
    "thinkingCanDisable" in value &&
    typeof value.thinkingCanDisable !== "boolean"
  )
    return false;
  return !("thinkingRange" in value) || validRange(value.thinkingRange);
}

export function validateLlmCatalog(
  catalog: unknown,
): asserts catalog is NineRouterLlmCatalog {
  if (
    !isRecord(catalog) ||
    typeof catalog.sourceCommit !== "string" ||
    !/^[0-9a-f]{40}$/.test(catalog.sourceCommit)
  )
    throw new TypeError("Invalid LLM catalog sourceCommit");
  if (
    !Array.isArray(catalog.sourceFiles) ||
    catalog.sourceFiles.length === 0 ||
    !catalog.sourceFiles.every(
      (file) => nonemptyString(file) && sourceFile.test(file),
    ) ||
    new Set(catalog.sourceFiles).size !== catalog.sourceFiles.length
  )
    throw new TypeError("Invalid LLM catalog sourceFiles");
  if (!isRecord(catalog.providers))
    throw new TypeError("Invalid LLM catalog providers");
  if (!isRecord(catalog.routeOwners))
    throw new TypeError("Invalid LLM catalog routeOwners");

  const routeKeys = new Map<string, string[]>();
  for (const [recordKey, provider] of Object.entries(catalog.providers)) {
    if (
      !isRecord(provider) ||
      !nonemptyString(provider.id) ||
      provider.id !== recordKey ||
      !nonemptyString(provider.catalogKey) ||
      !Array.isArray(provider.aliases) ||
      !provider.aliases.every(nonemptyString) ||
      !Array.isArray(provider.models)
    )
      throw new TypeError("Invalid LLM catalog provider");
    if (
      new Set([provider.catalogKey, ...provider.aliases]).size !==
      provider.aliases.length + 1
    )
      throw new TypeError("Duplicate LLM catalog provider route key");
    for (const routeKey of [provider.catalogKey, ...provider.aliases]) {
      routeKeys.set(routeKey, [
        ...(routeKeys.get(routeKey) ?? []),
        provider.id,
      ]);
    }
    const modelIds = new Set<string>();
    for (const model of provider.models) {
      if (
        !isRecord(model) ||
        !nonemptyString(model.id) ||
        model.kind !== "llm" ||
        !["canonicalProvider", "canonicalModelId", "upstreamModelId"].every(
          (key) => !(key in model) || safeString(model[key], maxCatalogId),
        ) ||
        (!("reasoning" in model) || validReasoning(model.reasoning)) === false
      )
        throw new TypeError("Invalid LLM catalog model");
      if (modelIds.has(model.id))
        throw new TypeError("Duplicate LLM catalog model id");
      modelIds.add(model.id);
    }
  }
  for (const [key, owners] of routeKeys)
    if (
      !nonemptyString(catalog.routeOwners[key]) ||
      !owners.includes(catalog.routeOwners[key])
    )
      throw new TypeError("Invalid LLM catalog route owner");
  for (const [key, owner] of Object.entries(catalog.routeOwners))
    if (!routeKeys.has(key) || !nonemptyString(owner))
      throw new TypeError("Orphan LLM catalog route owner");
  if (
    !isRecord(catalog.reasoningPicker) ||
    !isRecord(catalog.reasoningPicker.formatLevels) ||
    Object.keys(catalog.reasoningPicker.formatLevels).length >
      maxPickerEntries ||
    !Object.entries(catalog.reasoningPicker.formatLevels).every(
      ([format, levels]) =>
        safeString(format, maxFormat) && uniqueLevels(levels, catalogLevels),
    ) ||
    !Array.isArray(catalog.reasoningPicker.patternLevels) ||
    catalog.reasoningPicker.patternLevels.length > maxPickerEntries ||
    !catalog.reasoningPicker.patternLevels.every(
      (entry) =>
        isRecord(entry) &&
        Object.keys(entry).length === 2 &&
        safeString(entry.pattern, maxCatalogId) &&
        uniqueLevels(entry.levels, catalogLevels),
    ) ||
    new Set(catalog.reasoningPicker.patternLevels.map((entry) => entry.pattern))
      .size !== catalog.reasoningPicker.patternLevels.length
  )
    throw new TypeError("Invalid LLM catalog reasoningPicker");
}

export function matchLlmCatalogRoute(
  routeId: string,
  catalog: NineRouterLlmCatalog,
): CatalogRouteMatch | null {
  validateLlmCatalog(catalog);
  const slash = routeId.indexOf("/");
  if (slash <= 0 || slash === routeId.length - 1) return null;
  const routeKey = routeId.slice(0, slash);
  const modelId = routeId.slice(slash + 1);
  const provider = catalog.routeOwners[routeKey]
    ? catalog.providers[catalog.routeOwners[routeKey]]
    : undefined;
  const model = provider?.models.find((entry) => entry.id === modelId);
  return provider && model
    ? {
        providerId: provider.id,
        catalogKey: provider.catalogKey,
        modelId,
        canonicalProvider: model.canonicalProvider,
        canonicalModelId: model.canonicalModelId,
        provider,
        model,
      }
    : null;
}
