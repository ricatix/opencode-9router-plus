import {
  type CatalogModelVariants,
  type ModelVariants,
  resolveCatalogVariants,
} from "./capability-resolver.js";
import { NINE_ROUTER_LLM_CATALOG } from "./generated/9router-llm-catalog.js";
import { matchLlmCatalogRoute } from "./llm-catalog.js";
import type { ModelsDevClient, ModelsDevModel } from "./models-dev.js";
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
const defaults = (): OpenCodeModelEntry => ({
  attachment: false,
  reasoning: false,
  temperature: false,
  tool_call: false,
});
const string = (v: unknown) =>
  typeof v === "string" &&
  v.length <= 512 &&
  v === v.trim() &&
  ![...v].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
    ? v
    : undefined;
const number = (v: unknown, max: number, integer = false) =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= (integer ? 1 : 0) &&
  v <= max &&
  (!integer || Number.isSafeInteger(v))
    ? v
    : undefined;
const modalities = (v: unknown) => {
  if (!v || typeof v !== "object") return;
  const x = v as any;
  const valid = (a: unknown) =>
    Array.isArray(a) &&
    a.length &&
    a.length <= 16 &&
    new Set(a).size === a.length &&
    a.every(
      (s) =>
        typeof s === "string" &&
        s.length <= 64 &&
        s === s.trim() &&
        ["text", "audio", "image", "video", "pdf"].includes(s),
    );
  return valid(x.input) && valid(x.output)
    ? { input: x.input, output: x.output }
    : undefined;
};
function project(
  a: ModelsDevModel | null,
  b: ModelsDevModel | null,
): OpenCodeModelEntry {
  const out: OpenCodeModelEntry = {};
  for (const key of ["name", "family", "release_date"] as const) {
    const v = string(a?.[key]) ?? string(b?.[key]);
    if (v) out[key] = v;
  }
  for (const [key, max, integer] of [
    ["cost", 1_000_000, false],
    ["limit", 10_000_000, true],
  ] as const) {
    const compound = (value: any) => {
      const one = number(
          value?.[key === "cost" ? "input" : "context"],
          max,
          integer,
        ),
        two = number(value?.output, max, integer);
      return one !== undefined && two !== undefined
        ? ([one, two] as const)
        : undefined;
    };
    const values = compound(a?.[key]) ?? compound(b?.[key]);
    if (values)
      (out as any)[key] =
        key === "cost"
          ? { input: values[0], output: values[1] }
          : { context: values[0], output: values[1] };
  }
  const mode = modalities(a?.modalities) ?? modalities(b?.modalities);
  if (mode) out.modalities = mode;
  return out;
}
export async function resolveModel(
  fullId: string,
  client: ModelsDevClient,
): Promise<OpenCodeModelEntry> {
  const route = matchLlmCatalogRoute(fullId, NINE_ROUTER_LLM_CATALOG);
  const data = route
    ? await client.lookupCanonical(
        route.canonicalProvider ?? route.providerId,
        `${route.canonicalProvider ?? route.providerId}/${route.canonicalModelId ?? route.model.upstreamModelId ?? route.modelId}`,
      )
    : { providerModel: null, modelOnly: await client.lookupUniqueLeaf(fullId) };
  const entry = {
    ...defaults(),
    ...project(data.providerModel, data.modelOnly),
    id: fullId,
  };
  entry.reasoning = route?.model.reasoning?.reasoning === true;
  if (entry.reasoning) {
    const variants = resolveCatalogVariants({
      rawModelId: fullId,
      staticCapabilities: route?.model.reasoning,
      picker: NINE_ROUTER_LLM_CATALOG.reasoningPicker,
    });
    if (Object.keys(variants).length) entry.variants = variants;
  }
  entry.name ??= fullId;
  return entry;
}
