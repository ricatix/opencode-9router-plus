export interface NineRouterCapabilities {
  reasoning?: boolean;
  thinkingFormat?: string | null;
  thinkingCanDisable?: boolean;
  thinkingRange?: unknown;
}

export type NineRouterModelKind = "llm" | "image" | "tts" | "stt" | "embedding" | "image-to-text" | "web";

export interface StaticLlmModel {
  id: string;
  name?: string;
  kind: "llm";
  upstreamModelId?: string;
  canonicalProvider?: string;
  canonicalModelId?: string;
  reasoning?: NineRouterCapabilities;
}

export interface StaticLlmProvider {
  id: string;
  catalogKey: string;
  aliases: readonly string[];
  models: readonly StaticLlmModel[];
  modelsFetcher?: true;
  passthroughModels?: true;
}

export interface NineRouterLlmCatalog {
  sourceCommit: string;
  sourceFiles: readonly string[];
  providers: Readonly<Record<string, StaticLlmProvider>>;
  routeOwners: Readonly<Record<string, string>>;
  reasoningPicker: {
    formatLevels: Readonly<Record<string, readonly string[]>>;
    patternLevels: readonly { pattern: string; levels: readonly string[] }[];
  };
}

export interface CatalogRouteMatch {
  providerId: string;
  catalogKey: string;
  modelId: string;
  canonicalProvider?: string;
  canonicalModelId?: string;
  provider: StaticLlmProvider;
  model: StaticLlmModel;
}

export interface NineRouterDiscoveryEntry {
  id: string;
  name?: string;
  kind?: NineRouterModelKind | string;
  capabilities?: NineRouterCapabilities;
}
