import { readCacheBounded, writeCache } from "./cache.js";

const API_URL = "https://models.dev/api.json";
const MODELS_URL = "https://models.dev/models.json";
const MAX_API_BYTES = 5 * 1_048_576;
const MAX_MODELS_BYTES = 1_048_576;
type CacheName = "models-dev-api" | "models-dev-models";

export interface ReasoningOption {
  type: string;
  values: string[];
}
export interface ModelsDevModel {
  id: string;
  name: string;
  family?: string;
  release_date?: string;
  modalities?: { input?: string[]; output?: string[] };
  limit?: { context?: number; output?: number };
  cost?: { input?: number; output?: number };
  [key: string]: unknown;
}
export interface ModelsDevLookup {
  providerModel: ModelsDevModel | null;
  modelOnly: ModelsDevModel | null;
}
export interface ModelsDevCache {
  read(name: CacheName, maxBytes: number): Promise<unknown | null>;
  write(name: CacheName, data: unknown, maxBytes: number): Promise<void>;
}
export interface ModelsDevClient {
  lookupCanonical(provider: string, modelRef: string): Promise<ModelsDevLookup>;
  lookupExact(modelRef: string): Promise<ModelsDevModel | null>;
  lookupUniqueLeaf(modelRef: string): Promise<ModelsDevModel | null>;
}
type ApiCatalog = Record<string, { models: Record<string, ModelsDevModel> }>;
type ModelCatalog = Record<string, ModelsDevModel>;
const plain = (v: unknown): v is Record<string, unknown> =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.getPrototypeOf(v) === Object.prototype;
const safeId = (v: unknown) =>
  typeof v === "string" &&
  v.length > 0 &&
  v.length <= 512 &&
  ![...v].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
function validModel(v: unknown): v is ModelsDevModel {
  return plain(v) && Object.keys(v).length <= 32;
}
function validateApi(v: unknown): ApiCatalog {
  if (!plain(v) || Object.keys(v).length > 500) return {};
  for (const [id, provider] of Object.entries(v))
    if (
      !safeId(id) ||
      !plain(provider) ||
      !plain(provider.models) ||
      Object.keys(provider.models).length > 5000 ||
      Object.entries(provider.models).some(
        ([key, model]) => !safeId(key) || !validModel(model),
      )
    )
      return {};
  return v as ApiCatalog;
}
function validateModels(v: unknown): ModelCatalog {
  if (
    !plain(v) ||
    Object.keys(v).length > 20000 ||
    Object.entries(v).some(([id, model]) => !safeId(id) || !validModel(model))
  )
    return {};
  return v as ModelCatalog;
}
async function body(
  response: Response,
  maxBytes: number,
): Promise<unknown | null> {
  if (!response.ok || !response.body) return null;
  const reader = response.body.getReader();
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(next.value);
    }
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
export function createModelsDevClient(input: {
  fetch: typeof fetch;
  apiUrl: string;
  modelsUrl: string;
  cache: ModelsDevCache;
}): ModelsDevClient {
  const load = <T extends object>(
    name: CacheName,
    url: string,
    maxBytes: number,
    validate: (v: unknown) => T,
  ) => {
    let promise: Promise<T> | null = null;
    return () =>
      (promise ??= (async () => {
        const cached = await input.cache.read(name, maxBytes);
        const cachedValid = validate(cached);
        if (
          cached !== null &&
          (Object.keys(cachedValid).length > 0 ||
            (plain(cached) && Object.keys(cached).length === 0))
        )
          return cachedValid;
        try {
          const data = await body(
            await input.fetch(url, { signal: AbortSignal.timeout(15000) }),
            maxBytes,
          );
          const valid = validate(data);
          if (data !== null && Object.keys(valid).length)
            await input.cache.write(name, data, maxBytes);
          return valid;
        } catch {
          return {} as T;
        }
      })());
  };
  const api = load("models-dev-api", input.apiUrl, MAX_API_BYTES, validateApi),
    models = load(
      "models-dev-models",
      input.modelsUrl,
      MAX_MODELS_BYTES,
      validateModels,
    );
  return {
    async lookupCanonical(provider, modelRef) {
      const [a, m] = await Promise.all([api(), models()]);
      const local = modelRef.slice(modelRef.indexOf("/") + 1);
      return {
        providerModel:
          a[provider]?.models[local] ?? a[provider]?.models[modelRef] ?? null,
        modelOnly: m[modelRef] ?? null,
      };
    },
    async lookupExact(modelRef) {
      return (await models())[modelRef] ?? null;
    },
    async lookupUniqueLeaf(modelRef) {
      const leaf = modelRef.slice(modelRef.lastIndexOf("/") + 1);
      const matches = Object.entries(await models()).filter(
        ([key]) => key.slice(key.lastIndexOf("/") + 1) === leaf,
      );
      return matches.length === 1 ? matches[0]![1] : null;
    },
  };
}
const production = createModelsDevClient({
  fetch: globalThis.fetch,
  apiUrl: API_URL,
  modelsUrl: MODELS_URL,
  cache: { read: readCacheBounded, write: writeCache },
});
export async function lookupModelsDev(
  provider: string | undefined,
  ref: string,
): Promise<ModelsDevLookup> {
  return provider
    ? production.lookupCanonical(provider, ref)
    : { providerModel: null, modelOnly: await production.lookupExact(ref) };
}
export async function lookupModel(ref: string): Promise<ModelsDevModel | null> {
  return production.lookupUniqueLeaf(ref);
}
