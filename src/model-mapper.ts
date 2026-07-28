import { resolveReasoningVariants, type ModelVariants } from "./capability-resolver.js";
import { lookupModelsDev, type ModelsDevModel } from "./models-dev.js";
import { ROUTE_MAP_SNAPSHOT } from "./generated/9router-route-map.js";
import { resolveRouteModel } from "./route-map.js";
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
  variants?: ModelVariants;
}

export interface ModelMapperDependencies {
  lookupModelsDev?: typeof lookupModelsDev;
  resolveRouteModel?: typeof resolveRouteModel;
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
  const route = (dependencies.resolveRouteModel ?? resolveRouteModel)(fullId, ROUTE_MAP_SNAPSHOT);
  const metadata = route.canonicalProvider && route.canonicalModelId
    ? await (dependencies.lookupModelsDev ?? lookupModelsDev)(route.canonicalProvider, `${route.canonicalProvider}/${route.canonicalModelId}`)
    : null;
  const selected = metadata?.providerModel ?? metadata?.modelOnly ?? null;
  const entry = selected ? mapModel(selected) : { ...TEMPLATE };
  const variants = resolveReasoningVariants({ capabilities: discovery?.capabilities, reasoningOptions: selected?.reasoning_options });
  if (Object.keys(variants).length) entry.variants = variants;
  entry.id = fullId;
  entry.name = fullId;
  return entry;
}
