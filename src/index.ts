import type { Plugin } from "@opencode-ai/plugin";
import { resolveModel } from "./model-mapper.js";
import type { NineRouterDiscoveryEntry } from "./route-types.js";

type AnyCfg = Record<string, any>;
const DEFAULT_BASE = "http://localhost:20128/v1";
const DEFAULT_TIMEOUT_MS = 5000;

function buildHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

async function fetchJson(url: string, timeoutMs: number, apiKey: string): Promise<unknown> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: buildHeaders(apiKey) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally { clearTimeout(id); }
}

function entry(value: unknown): NineRouterDiscoveryEntry | null {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return { id: String(value) };
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const id = typeof item.id === "string" && item.id.length ? item.id : typeof item.name === "string" && item.name.length ? item.name : null;
  if (!id) return null;
  const result: NineRouterDiscoveryEntry = { id };
  if (typeof item.name === "string" && item.name.length) result.name = item.name;
  if (item.capabilities && typeof item.capabilities === "object" && !Array.isArray(item.capabilities)) result.capabilities = item.capabilities as NineRouterDiscoveryEntry["capabilities"];
  return result;
}

export function extractDiscoveryEntries(json: unknown): NineRouterDiscoveryEntry[] {
  const values = Array.isArray(json) ? json
    : json && typeof json === "object" && Array.isArray((json as Record<string, unknown>).models) ? (json as Record<string, unknown>).models as unknown[]
    : json && typeof json === "object" && Array.isArray((json as Record<string, unknown>).data) ? (json as Record<string, unknown>).data as unknown[]
    : json && typeof json === "object" ? [(json as Record<string, unknown>).model ?? (json as Record<string, unknown>).default_model ?? (json as Record<string, unknown>).name]
    : [];
  return values.map(entry).filter((value): value is NineRouterDiscoveryEntry => value !== null);
}

export async function listModels(baseUrl: string, timeoutMs: number, apiKey: string): Promise<NineRouterDiscoveryEntry[]> {
  for (const url of [`${baseUrl}/models`, `${baseUrl}/model`, baseUrl]) {
    try {
      const entries = extractDiscoveryEntries(await fetchJson(url, timeoutMs, apiKey));
      if (entries.length) return entries;
    } catch { /* try next endpoint */ }
  }
  return [];
}

export function pickDefaultModel(entries: NineRouterDiscoveryEntry[]): string | null {
  for (const priority of ["gpt", "claude", "gemini", "deepseek", "small"]) {
    const found = entries.find((item) => item.id.toLowerCase().includes(priority));
    if (found) return found.id;
  }
  return entries[0]?.id ?? null;
}

const plugin: Plugin = async () => {
  const baseUrl = process.env.OPENCODE_9ROUTER_URL || DEFAULT_BASE;
  const apiKey = process.env.OPENCODE_9ROUTER_API_KEY || "";
  const timeoutMs = Number(process.env.OPENCODE_9ROUTER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  let discoveredModels: NineRouterDiscoveryEntry[] = [];
  let defaultModel: string | null = null;
  try { discoveredModels = await listModels(baseUrl, timeoutMs, apiKey); defaultModel = pickDefaultModel(discoveredModels); }
  catch (err) { console.warn("opencode-9router plugin: failed to discover models:", (err as any)?.message || err); }
  return { config: async (cfg: AnyCfg) => {
    cfg.provider ||= {}; cfg.provider["9router"] ||= {}; cfg.provider["9router"].npm ||= "@ai-sdk/openai-compatible";
    cfg.provider["9router"].options ||= {}; cfg.provider["9router"].options.name ||= "9Router"; cfg.provider["9router"].options.baseURL ||= baseUrl;
    if (apiKey && !cfg.provider["9router"].options.apiKey) cfg.provider["9router"].options.apiKey = apiKey;
    cfg.provider["9router"].models ||= {};
    for (const model of discoveredModels) if (!cfg.provider["9router"].models[model.id]) cfg.provider["9router"].models[model.id] = await resolveModel(model.id, model);
    if (!cfg.model && defaultModel) cfg.model = `9router/${defaultModel}`;
  }};
};

export default plugin;
