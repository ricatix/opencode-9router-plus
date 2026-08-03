import { readCache, writeCache } from "./cache.js";

const API_URL = "https://models.dev/api.json";
const MODELS_URL = "https://models.dev/models.json";

export interface ReasoningOption {
  type: string;
  values: string[];
}

export interface ModelsDevProvider {
  id: string;
  name: string;
  npm?: string;
  models: Record<string, ModelsDevModel>;
}

export interface ModelsDevModel {
  id: string;
  name: string;
  family?: string;
  attachment?: boolean;
  reasoning?: boolean;
  reasoning_options?: ReasoningOption[];
  tool_call?: boolean;
  temperature?: boolean;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  modalities?: { input?: string[]; output?: string[] };
  open_weights?: boolean;
  limit?: { context?: number; output?: number };
  cost?: { input?: number; output?: number };
}

export interface ModelsDevLookup {
  providerModel: ModelsDevModel | null;
  modelOnly: ModelsDevModel | null;
}

type ApiCatalog = Record<string, ModelsDevProvider>;
type ModelCatalog = Record<string, ModelsDevModel>;

export function createModelsDevLookup(apiCatalog: ApiCatalog, modelCatalog: ModelCatalog) {
  return {
    lookup(provider: string | undefined, canonicalModelRef: string): ModelsDevLookup {
      const slash = canonicalModelRef.indexOf("/");
      const localModelId = slash === -1 ? canonicalModelRef : canonicalModelRef.slice(slash + 1);
      const providerModel = provider
        ? apiCatalog[provider]?.models[localModelId] ?? apiCatalog[provider]?.models[canonicalModelRef] ?? null
        : null;
      const modelOnly = slash === -1 ? null : modelCatalog[canonicalModelRef] ?? null;
      return { providerModel, modelOnly };
    },
  };
}

let apiCatalogPromise: Promise<ApiCatalog> | null = null;
let modelCatalogPromise: Promise<ModelCatalog> | null = null;

async function loadCatalog<T extends object>(name: "models-dev-api" | "models-dev-models", url: string): Promise<T> {
  const cached = await readCache(name);
  if (cached && typeof cached === "object") return cached as T;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as T;
    await writeCache(name, data);
    return data;
  } catch (err) {
    console.warn("opencode-9router: failed to fetch models.dev, using empty catalog:", (err as Error).message);
    return {} as T;
  }
}

export async function lookupModelsDev(provider: string | undefined, canonicalModelRef: string): Promise<ModelsDevLookup> {
  apiCatalogPromise ??= loadCatalog<ApiCatalog>("models-dev-api", API_URL);
  modelCatalogPromise ??= loadCatalog<ModelCatalog>("models-dev-models", MODELS_URL);
  return createModelsDevLookup(await apiCatalogPromise, await modelCatalogPromise).lookup(provider, canonicalModelRef);
}

export function resetModelsDevCatalogsForTest(): void {
  apiCatalogPromise = null;
  modelCatalogPromise = null;
}

function legacyLookup(index: Map<string, ModelsDevModel | null>, name: string): ModelsDevModel | null {
  const dashed = name.replace(/([a-zA-Z])(\d)/, "$1-$2");
  const matches = new Set<ModelsDevModel>();
  for (const candidate of new Set([name, dashed, name.replace(/\./g, "-"), dashed.replace(/\./g, "-")])) {
    const model = index.get(candidate);
    if (model === null) return null;
    if (model) matches.add(model);
  }
  return matches.size === 1 ? [...matches][0] : null;
}

/** Temporary display-metadata compatibility for current mapper. */
export async function lookupModel(modelName: string): Promise<ModelsDevModel | null> {
  apiCatalogPromise ??= loadCatalog<ApiCatalog>("models-dev-api", API_URL);
  const index = new Map<string, ModelsDevModel | null>();
  for (const provider of Object.values(await apiCatalogPromise)) {
    for (const [id, model] of Object.entries(provider.models ?? {})) index.set(id, index.has(id) ? null : model);
  }
  return legacyLookup(index, modelName);
}
