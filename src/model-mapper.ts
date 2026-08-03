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

function mapModel(dev: ModelsDevModel): OpenCodeModelEntry {
  const entry: OpenCodeModelEntry = {};
  if (dev.family) entry.family = dev.family;
  if (dev.release_date) entry.release_date = dev.release_date;
  if (dev.attachment !== undefined) entry.attachment = dev.attachment;
  if (dev.reasoning !== undefined) entry.reasoning = dev.reasoning;
  if (dev.temperature !== undefined) entry.temperature = dev.temperature;
  if (dev.tool_call !== undefined) entry.tool_call = dev.tool_call;
  if (dev.cost?.input !== undefined && dev.cost?.output !== undefined) entry.cost = { input: dev.cost.input, output: dev.cost.output };
  if (dev.limit?.context !== undefined && dev.limit?.output !== undefined) entry.limit = { context: dev.limit.context, output: dev.limit.output };
  if (dev.modalities) entry.modalities = { input: dev.modalities.input ?? ["text"], output: dev.modalities.output ?? ["text"] };
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
  const selected = metadata?.providerModel ?? metadata?.modelOnly;
  const entry = selected ? mapModel(selected) : { ...TEMPLATE };
  if (!selected && legacyMetadata?.limit?.context !== undefined && legacyMetadata.limit.output !== undefined) {
    entry.limit = { context: legacyMetadata.limit.context, output: legacyMetadata.limit.output };
  }
  if (route?.model.reasoning?.reasoning === true) entry.variants = resolveCatalogVariants({ rawModelId: fullId, staticCapabilities: route.model.reasoning, picker: NINE_ROUTER_LLM_CATALOG.reasoningPicker });
  else if (!route && discovery?.capabilities?.reasoning === true) entry.variants = {};
  entry.id = fullId;
  entry.name = fullId;
  return entry;
}
