import type { Plugin, PluginModule } from "@opencode-ai/plugin";
import { readCacheBounded, writeCache } from "./cache.js";
import {
  configVariants,
  resolveModel as defaultResolveModel,
  type OpenCodeModelEntry,
} from "./model-mapper.js";
import { createModelsDevClient, type ModelsDevClient } from "./models-dev.js";

type LiveThinkingRange =
  | readonly string[]
  | { values: readonly string[] }
  | { min: number; max: number };
type LiveModelMetadata = {
  name?: string;
  capabilities?: {
    reasoning?: boolean;
    tools?: boolean;
    vision?: boolean;
    pdf?: boolean;
    contextWindow?: number;
    maxOutput?: number;
    thinkingFormat?: string;
    thinkingCanDisable?: boolean;
    thinkingRange?: LiveThinkingRange;
    thinkingEffortSupported?: boolean;
  };
  context_length?: number;
  max_completion_tokens?: number;
};
export type AcceptedDiscoveryEntry = {
  id: string;
  kind: "llm";
  live?: LiveModelMetadata;
};
type AnyCfg = Record<string, any>;
export interface PluginDependencies {
  env?: NodeJS.ProcessEnv;
  listModels(
    baseUrl: string,
    timeoutMs: number,
    apiKey: string,
  ): Promise<unknown>;
  resolveModel(
    input: { id: string; live?: LiveModelMetadata },
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
const text = (value: unknown, max = 512): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= max &&
  value === value.trim() &&
  ![...value].some((char) => {
    const code = char.charCodeAt(0);
    return code < 32 || code === 127;
  });
const boolean = (value: unknown) =>
  value === true || value === "true"
    ? true
    : value === false || value === "false"
      ? false
      : undefined;
const positiveSafeInt = (value: unknown) => {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^[0-9]+$/.test(value)
        ? Number(value)
        : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
};
const value = (record: object, key: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
};
const record = (value: unknown): value is object =>
  !!value && typeof value === "object" && !Array.isArray(value);
const MAX_RANGE_LEVELS = 16,
  MAX_THINKING_FORMAT_CHARS = 64,
  MAX_THINKING_BUDGET = 1_000_000;
const budgetInteger = (input: unknown) => {
  const n =
    typeof input === "number"
      ? input
      : typeof input === "string" && /^[0-9]+$/.test(input)
        ? Number(input)
        : NaN;
  return Number.isSafeInteger(n) && n >= 0 && n <= MAX_THINKING_BUDGET
    ? n
    : undefined;
};
const boundedLevels = (items: unknown): readonly string[] | undefined => {
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > MAX_RANGE_LEVELS
  )
    return undefined;
  const levels: string[] = [];
  for (let index = 0; index < items.length; index++) {
    const item: unknown = value(items, String(index));
    if (!text(item, MAX_THINKING_FORMAT_CHARS) || levels.includes(item))
      return undefined;
    levels.push(item);
  }
  return levels;
};
const thinkingRange = (input: unknown): LiveThinkingRange | undefined => {
  const values = boundedLevels(input);
  if (values) return values;
  if (!record(input)) return undefined;
  const keys = Object.keys(input).length,
    viaValues = boundedLevels(value(input, "values"));
  if (own(input, "values") && keys === 1 && viaValues)
    return { values: viaValues };
  const min = budgetInteger(value(input, "min")),
    max = budgetInteger(value(input, "max"));
  return keys === 2 && min !== undefined && max !== undefined && min <= max
    ? { min, max }
    : undefined;
};
function liveMetadata(input: object): LiveModelMetadata {
  if (Object.keys(input).length > 32) return {};
  const capabilities = value(input, "capabilities");
  if (record(capabilities) && Object.keys(capabilities).length > 32) return {};
  const live: LiveModelMetadata = {};
  const name = value(input, "name");
  if (text(name)) live.name = name;
  if (record(capabilities) && Object.keys(capabilities).length <= 32) {
    const parsed: NonNullable<LiveModelMetadata["capabilities"]> = {};
    for (const key of ["reasoning", "tools", "vision", "pdf"] as const) {
      const normalized = boolean(value(capabilities, key));
      if (normalized !== undefined) parsed[key] = normalized;
    }
    for (const key of ["contextWindow", "maxOutput"] as const) {
      const normalized = positiveSafeInt(value(capabilities, key));
      if (normalized !== undefined) parsed[key] = normalized;
    }
    const thinkingFormat = value(capabilities, "thinkingFormat");
    if (text(thinkingFormat, MAX_THINKING_FORMAT_CHARS))
      parsed.thinkingFormat = thinkingFormat;
    for (const key of [
      "thinkingCanDisable",
      "thinkingEffortSupported",
    ] as const) {
      const normalized = boolean(value(capabilities, key));
      if (normalized !== undefined) parsed[key] = normalized;
    }
    const range = thinkingRange(value(capabilities, "thinkingRange"));
    if (range !== undefined) parsed.thinkingRange = range;
    if (Object.keys(parsed).length) live.capabilities = parsed;
  }
  for (const key of ["context_length", "max_completion_tokens"] as const) {
    const normalized = positiveSafeInt(value(input, key));
    if (normalized !== undefined) live[key] = normalized;
  }
  return live;
}
export function acceptDiscoveryEntries(
  json: unknown,
): AcceptedDiscoveryEntry[] {
  const values: unknown[] = Array.isArray(json)
    ? json
    : record(json) && Array.isArray(value(json, "models"))
      ? value(json, "models")
      : record(json) && Array.isArray(value(json, "data"))
        ? value(json, "data")
        : [];
  if (values.length > 2000) return [];
  const seen = new Set<string>();
  return values.flatMap((v) =>
    !record(v) ||
    !own(v, "id") ||
    !safe(value(v, "id")) ||
    seen.has(value(v, "id"))
      ? []
      : (seen.add(value(v, "id")),
        [{ id: value(v, "id"), kind: "llm", live: liveMetadata(v) }]),
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
  const reader = r.body?.getReader();
  if (!reader) return JSON.parse(await r.text());
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 5 * 1024 * 1024) throw new Error("Response too large");
      chunks.push(chunk.value);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(body));
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
      entries = (await discover(
        baseUrl,
        timeoutMs,
        apiKey,
      )) as AcceptedDiscoveryEntry[];
    } catch {}
    const selected = pickDefaultModel(entries);
    const ownedVariants = new Map<string, Set<string>>();
    return {
      "chat.message": async (input, output) => {
        const model = output.message.model;
        if (model.providerID !== "9router" || input.variant === undefined)
          return;
        const allowed = ownedVariants.get(model.modelID);
        if (allowed && !allowed.has(input.variant))
          throw new TypeError(
            `Unsupported 9router variant: ${model.modelID}/${input.variant}`,
          );
      },
      config: async (cfg: AnyCfg) => {
        cfg.provider ||= {};
        cfg.provider["9router"] ||= {};
        const provider = cfg.provider["9router"];
        provider.npm ||= "@ai-sdk/openai-compatible";
        provider.options ||= {};
        provider.options.name = "9router";
        provider.options.baseURL ||= baseUrl;
        if (apiKey && !provider.options.apiKey)
          provider.options.apiKey = apiKey;
        if (!provider.models) provider.models = Object.create(null);
        if (
          typeof provider.models !== "object" ||
          Array.isArray(provider.models)
        )
          throw new TypeError("9router models must be an object");
        for (const { id, live = {} } of entries)
          if (!own(provider.models, id)) {
            const mapped = await mapper({ id, live }, md).catch(() => ({
              id,
              name: id,
              attachment: false,
              reasoning: false,
              temperature: false,
              tool_call: false,
              variants: configVariants(),
            }));
            Object.defineProperty(provider.models, id, {
              value: mapped,
              enumerable: true,
              configurable: true,
              writable: true,
            });
            ownedVariants.set(
              id,
              new Set(
                Object.entries(mapped.variants ?? {})
                  .filter(([, variant]) => !("disabled" in variant))
                  .map(([key]) => key),
              ),
            );
          }
        if (!cfg.model && selected) cfg.model = `9router/${selected}`;
      },
    };
  };
}
export default {
  id: "opencode-9router-plus",
  server: createPlugin(),
} satisfies PluginModule;
