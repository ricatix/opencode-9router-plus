import type { Plugin } from "@opencode-ai/plugin";
import { readCacheBounded, writeCache } from "./cache.js";
import {
  resolveModel as defaultResolveModel,
  type OpenCodeModelEntry,
} from "./model-mapper.js";
import { createModelsDevClient, type ModelsDevClient } from "./models-dev.js";
export type AcceptedDiscoveryEntry = { id: string; kind: "llm" };
type AnyCfg = Record<string, any>;
export interface PluginDependencies {
  env?: NodeJS.ProcessEnv;
  listModels(
    baseUrl: string,
    timeoutMs: number,
    apiKey: string,
  ): Promise<unknown>;
  resolveModel(
    fullId: string,
    client: ModelsDevClient,
  ): Promise<OpenCodeModelEntry>;
  modelsDevClient: ModelsDevClient;
}
const DEFAULT_BASE = "http://localhost:20128/v1",
  DEFAULT_TIMEOUT_MS = 5000;
const own = (v: object, k: string) => Object.hasOwn(v, k);
const safe = (id: unknown): id is string =>
  typeof id === "string" &&
  id.length > 0 &&
  id.length <= 512 &&
  id === id.trim() &&
  ![...id].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) &&
  !["__proto__", "prototype", "constructor"].includes(id);
export function acceptDiscoveryEntries(
  json: unknown,
): AcceptedDiscoveryEntry[] {
  const values: unknown[] = Array.isArray(json)
    ? json
    : json && typeof json === "object" && Array.isArray((json as any).models)
      ? (json as any).models
      : json && typeof json === "object" && Array.isArray((json as any).data)
        ? (json as any).data
        : [];
  const seen = new Set<string>();
  return values.flatMap((v) =>
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    !own(v, "id") ||
    !safe((v as any).id) ||
    seen.has((v as any).id)
      ? []
      : (seen.add((v as any).id), [{ id: (v as any).id, kind: "llm" }]),
  );
}
export const extractDiscoveryEntries = acceptDiscoveryEntries;
async function fetchJson(
  url: string,
  ms: number,
  key: string,
): Promise<unknown> {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(ms),
    headers: key
      ? { Accept: "application/json", Authorization: `Bearer ${key}` }
      : { Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
export async function listModels(
  baseUrl: string,
  timeoutMs: number,
  apiKey: string,
): Promise<AcceptedDiscoveryEntry[]> {
  for (const url of [`${baseUrl}/models`, `${baseUrl}/model`, baseUrl])
    try {
      const entries = acceptDiscoveryEntries(
        await fetchJson(url, timeoutMs, apiKey),
      );
      if (entries.length) return entries;
    } catch {}
  return [];
}
export function pickDefaultModel(
  entries: AcceptedDiscoveryEntry[],
): string | null {
  for (const p of ["gpt", "claude", "gemini", "deepseek", "small"]) {
    const hit = entries.find((x) => x.id.toLowerCase().includes(p));
    if (hit) return hit.id;
  }
  return entries[0]?.id ?? null;
}
const client = createModelsDevClient({
  fetch: globalThis.fetch,
  apiUrl: "https://models.dev/api.json",
  modelsUrl: "https://models.dev/models.json",
  cache: { read: readCacheBounded, write: writeCache },
});
export function createPlugin(
  dependencies?: Partial<PluginDependencies>,
): Plugin {
  const env = dependencies?.env ?? process.env,
    discover = dependencies?.listModels ?? listModels,
    mapper = dependencies?.resolveModel ?? defaultResolveModel,
    md = dependencies?.modelsDevClient ?? client;
  return async () => {
    const baseUrl = env.OPENCODE_9ROUTER_URL || DEFAULT_BASE,
      apiKey = env.OPENCODE_9ROUTER_API_KEY || "",
      timeoutMs = Number(env.OPENCODE_9ROUTER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    let entries: AcceptedDiscoveryEntry[] = [];
    try {
      entries = acceptDiscoveryEntries(
        await discover(baseUrl, timeoutMs, apiKey),
      );
    } catch {}
    const selected = pickDefaultModel(entries);
    return {
      config: async (cfg: AnyCfg) => {
        cfg.provider ||= {};
        cfg.provider["9router"] ||= {};
        const provider = cfg.provider["9router"];
        provider.npm ||= "@ai-sdk/openai-compatible";
        provider.options ||= {};
        provider.options.name ||= "9Router";
        provider.options.baseURL ||= baseUrl;
        if (apiKey && !provider.options.apiKey)
          provider.options.apiKey = apiKey;
        if (!provider.models) provider.models = Object.create(null);
        if (
          typeof provider.models !== "object" ||
          Array.isArray(provider.models)
        )
          throw new TypeError("9router models must be an object");
        for (const { id } of entries)
          if (!own(provider.models, id))
            Object.defineProperty(provider.models, id, {
              value: await mapper(id, md),
              enumerable: true,
              configurable: true,
              writable: true,
            });
        if (!cfg.model && selected) cfg.model = `9router/${selected}`;
      },
    };
  };
}
export default createPlugin();
