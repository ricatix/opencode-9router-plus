import { resolveCatalogVariants, type CatalogModelVariants, type ModelVariants } from "./capability-resolver.js";
import { lookupModel, lookupModelsDev, type ModelsDevModel } from "./models-dev.js";
import { NINE_ROUTER_LLM_CATALOG } from "./generated/9router-llm-catalog.js";
import { matchLlmCatalogRoute } from "./llm-catalog.js";
import type { NineRouterDiscoveryEntry } from "./route-types.js";

export interface OpenCodeModelEntry {
  id?: string;
  name?: string;
  family?: string;
  release_date?: string;
  attachment?: boolean;
  reasoning?: boolean;
  temperature?: boolean;
  tool_call?: boolean;
  cost?: { input: number; output: number };
  limit?: { context: number; output: number };
  modalities?: { input: string[]; output: string[] };
  variants?: ModelVariants | CatalogModelVariants;
}

export interface ModelMapperDependencies {
  lookupModelsDev?: typeof lookupModelsDev;
  lookupModel?: typeof lookupModel;
}

const TEMPLATE: OpenCodeModelEntry = {
  attachment: false,
  reasoning: false,
  temperature: true,
  tool_call: true,
};

function first<T>(providerValue: T | undefined, modelValue: T | undefined): T | undefined {
  return providerValue ?? modelValue;
}

function completeCost(model: ModelsDevModel | null): OpenCodeModelEntry["cost"] | undefined {
  const cost = model?.cost;
  return cost?.input !== undefined && cost.output !== undefined ? { input: cost.input, output: cost.output } : undefined;
}

function completeLimit(model: ModelsDevModel | null): OpenCodeModelEntry["limit"] | undefined {
  const limit = model?.limit;
  return limit?.context !== undefined && limit.output !== undefined ? { context: limit.context, output: limit.output } : undefined;
}

function completeModalities(model: ModelsDevModel | null): OpenCodeModelEntry["modalities"] | undefined {
  const modalities = model?.modalities;
  return modalities?.input && modalities.output ? { input: modalities.input, output: modalities.output } : undefined;
}

function mapModel(providerModel: ModelsDevModel | null, modelOnly: ModelsDevModel | null): OpenCodeModelEntry {
  const entry: OpenCodeModelEntry = {};
  const name = first(providerModel?.name, modelOnly?.name);
  if (name) entry.name = name;
  const family = first(providerModel?.family, modelOnly?.family);
  if (family) entry.family = family;
  const releaseDate = first(providerModel?.release_date, modelOnly?.release_date);
  if (releaseDate) entry.release_date = releaseDate;
  for (const field of ["attachment", "reasoning", "temperature", "tool_call"] as const) {
    const value = first(providerModel?.[field], modelOnly?.[field]);
    if (value !== undefined) entry[field] = value;
  }
  entry.cost = completeCost(providerModel) ?? completeCost(modelOnly);
  entry.limit = completeLimit(providerModel) ?? completeLimit(modelOnly);
  entry.modalities = completeModalities(providerModel) ?? completeModalities(modelOnly);
  return entry;
}

export async function resolveModel(
  fullId: string,
  discovery?: NineRouterDiscoveryEntry,
  dependencies: ModelMapperDependencies = {},
): Promise<OpenCodeModelEntry> {
  const route = matchLlmCatalogRoute(fullId, NINE_ROUTER_LLM_CATALOG);
  const canonicalProvider = route?.canonicalProvider ?? route?.providerId;
  const canonicalModelId = route?.canonicalModelId ?? route?.model.upstreamModelId ?? route?.modelId;
  const metadata = canonicalProvider && canonicalModelId
    ? await (dependencies.lookupModelsDev ?? lookupModelsDev)(canonicalProvider, `${canonicalProvider}/${canonicalModelId}`)
    : null;
  const legacyMetadata = !route && fullId.includes("/")
    ? await (dependencies.lookupModel ?? lookupModel)(fullId.slice(fullId.lastIndexOf("/") + 1))
    : null;
  const providerModel = metadata?.providerModel ?? null;
  const modelOnly = metadata?.modelOnly ?? null;
  const entry = providerModel || modelOnly
    ? { ...TEMPLATE, ...mapModel(providerModel, modelOnly) }
    : legacyMetadata
      ? { ...TEMPLATE, ...mapModel(legacyMetadata, null) }
      : { ...TEMPLATE };
  if (route?.model.reasoning?.reasoning === true) entry.variants = resolveCatalogVariants({ rawModelId: fullId, staticCapabilities: route.model.reasoning, picker: NINE_ROUTER_LLM_CATALOG.reasoningPicker });
  else if (!route && discovery?.capabilities?.reasoning === true) entry.variants = {};
  entry.id = fullId;
  if (!entry.name) entry.name = fullId;
  return entry;
}
