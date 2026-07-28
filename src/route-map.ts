import type { RouteMapSnapshot, RouteModelResolution } from "./route-types.js";

const opaqueAlias = /^(?:openai-compatible-.*|anthropic-compatible-.*|local|passthrough)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function stringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(nonemptyString);
}

export function validateRouteMapSnapshot(snapshot: unknown): asserts snapshot is RouteMapSnapshot {
  if (!isRecord(snapshot) || !/^[0-9a-f]{40}$/i.test(String(snapshot.sourceCommit))) throw new TypeError("Invalid route map sourceCommit");
  if (!Array.isArray(snapshot.directProviders) || snapshot.directProviders.length === 0 || !snapshot.directProviders.every(nonemptyString)) throw new TypeError("Invalid route map directProviders");
  if (!stringRecord(snapshot.aliases) || !stringRecord(snapshot.providerRules) || !stringRecord(snapshot.prefixRules) || !stringRecord(snapshot.upstreamModels)) throw new TypeError("Invalid route map record");
  if (!isRecord(snapshot.suffixRules) || !Object.values(snapshot.suffixRules).every((suffixes) => Array.isArray(suffixes) && suffixes.every(nonemptyString))) throw new TypeError("Invalid route map suffixRules");
  if (!isRecord(snapshot.wrapperRules) || !Object.values(snapshot.wrapperRules).every((rule) => isRecord(rule) && nonemptyString(rule.prefix) && (rule.providerAliases === undefined || stringRecord(rule.providerAliases)))) throw new TypeError("Invalid route map wrapperRules");
}

export function resolveRouteModel(routeId: string, snapshot: RouteMapSnapshot): RouteModelResolution {
  validateRouteMapSnapshot(snapshot);
  const slash = routeId.indexOf("/");
  if (slash <= 0 || slash === routeId.length - 1) return { routeAlias: "", routeModelId: routeId };

  const routeAlias = routeId.slice(0, slash);
  const routeModelId = routeId.slice(slash + 1);
  if (opaqueAlias.test(routeAlias)) return { routeAlias, routeModelId };

  const family = snapshot.aliases[routeAlias] ?? routeAlias;
  let modelId = snapshot.upstreamModels[routeId] ?? routeModelId;
  let providerAlias = family;
  const wrapper = snapshot.wrapperRules[family];
  if (!snapshot.upstreamModels[routeId] && wrapper && modelId.startsWith(wrapper.prefix)) {
    const wrapped = modelId.slice(wrapper.prefix.length);
    const separator = wrapped.indexOf("/");
    if (separator > 0 && separator < wrapped.length - 1) {
      providerAlias = wrapper.providerAliases?.[wrapped.slice(0, separator)] ?? wrapped.slice(0, separator);
      modelId = wrapped.slice(separator + 1);
    }
  }

  for (const suffix of snapshot.suffixRules[family] ?? []) if (modelId.endsWith(suffix)) modelId = modelId.slice(0, -suffix.length);
  const canonicalProvider = snapshot.providerRules[family]
    ?? (snapshot.directProviders.includes(providerAlias) ? providerAlias : undefined)
    ?? Object.entries(snapshot.prefixRules).filter(([prefix]) => modelId.startsWith(prefix)).sort(([a], [b]) => b.length - a.length)[0]?.[1];
  return canonicalProvider ? { routeAlias, routeModelId, canonicalProvider, canonicalModelId: modelId } : { routeAlias, routeModelId };
}
