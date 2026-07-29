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
  capabilities?: NineRouterCapabilities;
}

export interface RouteModelResolution {
  routeAlias: string;
  routeModelId: string;
  canonicalProvider?: string;
  canonicalModelId?: string;
}

export interface RouteMapSnapshot {
  sourceCommit: string;
  directProviders: readonly string[];
  aliases: Readonly<Record<string, string>>;
  providerRules: Readonly<Record<string, string>>;
  suffixRules: Readonly<Record<string, readonly string[]>>;
  wrapperRules: Readonly<Record<string, { prefix: string; providerAliases?: Readonly<Record<string, string>> }>>;
  prefixRules: Readonly<Record<string, string>>;
  upstreamModels: Readonly<Record<string, string>>;
}
