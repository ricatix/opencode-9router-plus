import type { CatalogRouteMatch, NineRouterLlmCatalog } from "./route-types.js";

const sourceFile = /^open-sse\/(?:providers\/registry\/(?:index|[^/]+)\.js|providers\/(?:index|schema)\.js|providers\/models\/(?:schema|helpers)\.js|config\/(?:providerModels|grokCli)\.js|providers\/(?:thinkingLevels|capabilities)\.js)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function validateLlmCatalog(catalog: unknown): asserts catalog is NineRouterLlmCatalog {
  if (!isRecord(catalog) || typeof catalog.sourceCommit !== "string" || !/^[0-9a-f]{40}$/.test(catalog.sourceCommit)) throw new TypeError("Invalid LLM catalog sourceCommit");
  if (!Array.isArray(catalog.sourceFiles) || catalog.sourceFiles.length === 0 || !catalog.sourceFiles.every((file) => nonemptyString(file) && sourceFile.test(file)) || new Set(catalog.sourceFiles).size !== catalog.sourceFiles.length) throw new TypeError("Invalid LLM catalog sourceFiles");
  if (!isRecord(catalog.providers)) throw new TypeError("Invalid LLM catalog providers");
  if (!isRecord(catalog.routeOwners)) throw new TypeError("Invalid LLM catalog routeOwners");

  const routeKeys = new Map<string, string[]>();
  for (const [recordKey, provider] of Object.entries(catalog.providers)) {
    if (!isRecord(provider) || !nonemptyString(provider.id) || provider.id !== recordKey || !nonemptyString(provider.catalogKey) || !Array.isArray(provider.aliases) || !provider.aliases.every(nonemptyString) || !Array.isArray(provider.models)) throw new TypeError("Invalid LLM catalog provider");
    if (new Set([provider.catalogKey, ...provider.aliases]).size !== provider.aliases.length + 1) throw new TypeError("Duplicate LLM catalog provider route key");
    for (const routeKey of [provider.catalogKey, ...provider.aliases]) {
      routeKeys.set(routeKey, [...(routeKeys.get(routeKey) ?? []), provider.id]);
    }
    const modelIds = new Set<string>();
    for (const model of provider.models) {
      if (!isRecord(model) || !nonemptyString(model.id) || model.kind !== "llm") throw new TypeError("Invalid LLM catalog model");
      if (modelIds.has(model.id)) throw new TypeError("Duplicate LLM catalog model id");
      modelIds.add(model.id);
    }
  }
  for (const [key, owners] of routeKeys) if (!nonemptyString(catalog.routeOwners[key]) || !owners.includes(catalog.routeOwners[key])) throw new TypeError("Invalid LLM catalog route owner");
  for (const [key, owner] of Object.entries(catalog.routeOwners)) if (!routeKeys.has(key) || !nonemptyString(owner)) throw new TypeError("Orphan LLM catalog route owner");
  if (!isRecord(catalog.reasoningPicker) || !isRecord(catalog.reasoningPicker.formatLevels) || !Object.values(catalog.reasoningPicker.formatLevels).every((levels) => Array.isArray(levels) && levels.every(nonemptyString)) || !Array.isArray(catalog.reasoningPicker.patternLevels) || !catalog.reasoningPicker.patternLevels.every((entry) => isRecord(entry) && nonemptyString(entry.pattern) && Array.isArray(entry.levels) && entry.levels.every(nonemptyString))) throw new TypeError("Invalid LLM catalog reasoningPicker");
}

export function matchLlmCatalogRoute(routeId: string, catalog: NineRouterLlmCatalog): CatalogRouteMatch | null {
  validateLlmCatalog(catalog);
  const slash = routeId.indexOf("/");
  if (slash <= 0 || slash === routeId.length - 1) return null;
  const routeKey = routeId.slice(0, slash);
  const modelId = routeId.slice(slash + 1);
  const provider = catalog.routeOwners[routeKey] ? catalog.providers[catalog.routeOwners[routeKey]] : undefined;
  const model = provider?.models.find((entry) => entry.id === modelId);
  return provider && model ? { providerId: provider.id, catalogKey: provider.catalogKey, modelId, canonicalProvider: model.canonicalProvider, canonicalModelId: model.canonicalModelId, provider, model } : null;
}
