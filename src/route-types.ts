export interface NineRouterCapabilities {
  reasoning?: boolean;
  thinkingFormat?: string | null;
  thinkingCanDisable?: boolean;
  thinkingRange?: unknown;
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
