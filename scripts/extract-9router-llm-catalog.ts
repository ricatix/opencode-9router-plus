import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import ts from "typescript";
import { validateLlmCatalog } from "../src/llm-catalog.js";

export const PINNED_9ROUTER_COMMIT = "79918c7830695bbca4a45c9fea4a42c3e9fd73d1";
export const CATALOG_PROJECTION_VERSION = 1;
export const CATALOG_PROJECTIONS = [
  "codex-review-v1",
  "grok-cli-reasoning-v1",
  "capability-resolution-v1",
  "models-fetcher-marker-v1",
  "route-owner-v1",
] as const;
const ROOT = "open-sse";
const DYNAMIC = [
  "grok-web",
  "kilocode",
  "kimchi",
  "mimo-free",
  "opencode",
  "openrouter",
  "perplexity-agent",
  "venice",
  "vercel-ai-gateway",
];
type Model = {
  id: string;
  name?: string;
  kind: "llm";
  upstreamModelId?: string;
  canonicalProvider?: string;
  canonicalModelId?: string;
  reasoning?: unknown;
};
type Provider = {
  id: string;
  catalogKey: string;
  aliases: string[];
  models: Model[];
  modelsFetcher?: true;
  passthroughModels?: true;
};
type Counts = {
  providers: number;
  llm: number;
  excluded: number;
  image: number;
  stt: number;
  embedding: number;
  tts: number;
  video: number;
};
export interface ExcludedKindCounts {
  image: number;
  stt: number;
  embedding: number;
  tts: number;
  video: number;
}
export interface ProviderReviewRow {
  providerId: string;
  sourceFile: string;
  catalogKey: string;
  staticLlmCount: number;
  excluded: ExcludedKindCounts;
  modelsFetcher: boolean;
  passthroughModels: boolean;
}
export interface CatalogReviewMetadata {
  projectionVersion: 1;
  projections: readonly string[];
  sourceFiles: readonly string[];
  providers: readonly ProviderReviewRow[];
  totals: {
    providers: number;
    staticLlm: number;
    excluded: number;
    excludedByKind: ExcludedKindCounts;
  };
  dynamicProviderIds: readonly string[];
  routeCollisions: Readonly<Record<string, readonly string[]>>;
}
export interface ExtractCatalogResult {
  catalog: {
    sourceCommit: string;
    sourceFiles: string[];
    providers: Record<string, Provider>;
    routeOwners: Record<string, string>;
    reasoningPicker: unknown;
  };
  projectionVersion: number;
  projections: readonly string[];
  routeCollisions: Readonly<Record<string, readonly string[]>>;
  diagnostics: string[];
  counts: Counts;
  review: CatalogReviewMetadata;
}
type StaticRef = {
  file: string;
  expression: ts.Expression;
  refs: Map<string, StaticRef>;
};

function failUnsupported(file: string, node: ts.Node, field: string): never {
  const p = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
  throw new Error(
    `${file}:${p.line + 1}:${p.character + 1} ${ts.SyntaxKind[node.kind]} [${field}]`,
  );
}
function propertyName(
  p: ts.ObjectLiteralElementLike,
  file: string,
  field: string,
): string {
  if (
    !ts.isPropertyAssignment(p) ||
    !(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))
  )
    failUnsupported(file, p, field);
  return p.name.text;
}
function findProperty(
  object: ts.ObjectLiteralExpression,
  wanted: string,
): ts.PropertyAssignment | undefined {
  return object.properties.find(
    (p): p is ts.PropertyAssignment =>
      ts.isPropertyAssignment(p) &&
      (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
      p.name.text === wanted,
  );
}
function staticValue(
  node: ts.Expression,
  file: string,
  field: string,
  refs: Map<string, StaticRef>,
): unknown {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isIdentifier(node) && refs.has(node.text)) {
    const ref = refs.get(node.text)!;
    return staticValue(ref.expression, ref.file, field, ref.refs);
  }
  if (ts.isArrayLiteralExpression(node))
    return node.elements.map((x) =>
      ts.isExpression(x)
        ? staticValue(x, file, field, refs)
        : failUnsupported(file, x, field),
    );
  if (ts.isObjectLiteralExpression(node)) {
    const out: Record<string, unknown> = {};
    for (const p of node.properties) {
      if (ts.isSpreadAssignment(p)) {
        const spread = staticValue(p.expression, file, field, refs);
        if (!spread || typeof spread !== "object" || Array.isArray(spread))
          failUnsupported(file, p, field);
        Object.assign(out, spread);
      } else if (ts.isPropertyAssignment(p))
        out[propertyName(p, file, field)] = staticValue(
          p.initializer,
          file,
          field,
          refs,
        );
      else failUnsupported(file, p, field);
    }
    return out;
  }
  failUnsupported(file, node, field);
}
function extractReasoning(
  node: ts.Expression,
  file: string,
  field: string,
  refs: Map<string, StaticRef>,
): unknown {
  if (!ts.isObjectLiteralExpression(node))
    return staticValue(node, file, field, refs);
  const out: Record<string, unknown> = {};
  for (const key of ["reasoning", "thinkingFormat", "thinkingCanDisable"]) {
    const p = findProperty(node, key);
    if (p) out[key] = staticValue(p.initializer, file, `${field}.${key}`, refs);
  }
  return out;
}
function extractModel(
  node: ts.Expression,
  file: string,
  refs: Map<string, StaticRef>,
  excluded: ExcludedKindCounts,
): Model | null {
  if (ts.isStringLiteral(node)) return { id: node.text, kind: "llm" };
  if (!ts.isObjectLiteralExpression(node))
    failUnsupported(file, node, "provider.models");
  const get = (key: string) => {
    const p = findProperty(node, key);
    return p
      ? staticValue(p.initializer, file, `model.${key}`, refs)
      : undefined;
  };
  const kind = get("kind") ?? get("type") ?? "llm";
  if (typeof kind !== "string") failUnsupported(file, node, "model.kind");
  if (kind !== "llm") {
    if (kind in excluded) excluded[kind as keyof ExcludedKindCounts]++;
    return null;
  }
  const id = get("id");
  if (typeof id !== "string" || !id) failUnsupported(file, node, "model.id");
  const out: Model = { id, kind: "llm" };
  for (const key of [
    "name",
    "upstreamModelId",
    "canonicalProvider",
    "canonicalModelId",
  ] as const) {
    const v = get(key);
    if (v !== undefined) {
      if (typeof v !== "string" || !v)
        failUnsupported(file, node, `model.${key}`);
      out[key] = v;
    }
  }
  for (const key of ["reasoning", "capabilities"]) {
    const p = findProperty(node, key);
    if (p)
      out.reasoning = extractReasoning(
        p.initializer,
        file,
        `model.${key}`,
        refs,
      );
  }
  return out;
}
function extractModels(
  node: ts.Expression,
  file: string,
  refs: Map<string, StaticRef>,
  excluded: ExcludedKindCounts,
): Model[] {
  if (ts.isIdentifier(node) && refs.has(node.text)) {
    const ref = refs.get(node.text)!;
    return extractModels(ref.expression, ref.file, ref.refs, excluded);
  }
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "withCodexReviewModels" &&
    node.arguments.length === 1
  ) {
    const base = extractModels(node.arguments[0], file, refs, excluded);
    const ids = new Set(base.map((m) => m.id));
    for (const m of [...base]) {
      const id = `${m.id}-review`;
      if (!m.id.endsWith("-review") && !ids.has(id)) {
        ids.add(id);
        base.push({
          ...m,
          id,
          name: m.name ? `${m.name} Review` : undefined,
          upstreamModelId: m.upstreamModelId ?? m.id,
        });
      }
    }
    return base;
  }
  if (!ts.isArrayLiteralExpression(node))
    failUnsupported(file, node, "provider.models");
  return node.elements.flatMap((item) => {
    if (ts.isSpreadElement(item))
      return extractModels(item.expression, file, refs, excluded);
    if (!ts.isExpression(item)) failUnsupported(file, item, "provider.models");
    const model = extractModel(item, file, refs, excluded);
    return model ? [model] : [];
  });
}
function extractProvider(
  node: ts.ObjectLiteralExpression,
  file: string,
  refs: Map<string, StaticRef>,
  excluded: ExcludedKindCounts,
): Provider {
  const getProperty = (key: string) => {
    const values = node.properties.filter(
      (entry): entry is ts.PropertyAssignment =>
        ts.isPropertyAssignment(entry) &&
        (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)) &&
        entry.name.text === key,
    );
    if (values.length > 1) failUnsupported(file, values[1], `provider.${key}`);
    return values[0];
  };
  const get = (key: string) => {
    const p = getProperty(key);
    return p
      ? staticValue(p.initializer, file, `provider.${key}`, refs)
      : undefined;
  };
  const id = get("id");
  if (typeof id !== "string") failUnsupported(file, node, "provider.id");
  const modelsProp = getProperty("models");
  const models = modelsProp
    ? extractModels(modelsProp.initializer, file, refs, excluded)
    : [];
  const alias = get("alias");
  const aliases = get("aliases");
  const fetcherProp = getProperty("modelsFetcher");
  const passthrough = get("passthroughModels");
  const fetcher = fetcherProp
    ? (() => {
        if (fetcherProp.initializer.kind === ts.SyntaxKind.TrueKeyword)
          return true;
        if (!ts.isObjectLiteralExpression(fetcherProp.initializer))
          failUnsupported(
            file,
            fetcherProp.initializer,
            "provider.modelsFetcher",
          );
        const properties = fetcherProp.initializer.properties;
        if (
          properties.length !== 2 ||
          properties.some((entry) => !ts.isPropertyAssignment(entry))
        )
          failUnsupported(
            file,
            fetcherProp.initializer,
            "provider.modelsFetcher",
          );
        const url = findProperty(fetcherProp.initializer, "url");
        const type = findProperty(fetcherProp.initializer, "type");
        if (
          !url ||
          !type ||
          !(
            (ts.isStringLiteral(url.initializer) ||
              ts.isNoSubstitutionTemplateLiteral(url.initializer)) &&
            url.initializer.text
          ) ||
          !(
            (ts.isStringLiteral(type.initializer) ||
              ts.isNoSubstitutionTemplateLiteral(type.initializer)) &&
            type.initializer.text
          )
        )
          failUnsupported(
            file,
            fetcherProp.initializer,
            "provider.modelsFetcher",
          );
        return true;
      })()
    : undefined;
  if (!id) failUnsupported(file, node, "provider.id");
  if (alias !== undefined && (typeof alias !== "string" || !alias))
    failUnsupported(file, node, "provider.alias");
  if (
    aliases !== undefined &&
    (!Array.isArray(aliases) ||
      !aliases.every((x) => typeof x === "string" && x))
  )
    failUnsupported(file, node, "provider.aliases");
  if (passthrough !== undefined && passthrough !== true)
    failUnsupported(file, node, "provider.passthroughModels");
  return {
    id,
    catalogKey: alias ?? id,
    aliases: aliases ?? [],
    models,
    ...(fetcher === true ? { modelsFetcher: true } : {}),
    ...(passthrough === true ? { passthroughModels: true } : {}),
  };
}
function git(dir: string, args: string[]) {
  return execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
}
function verifyHead(dir: string) {
  try {
    if (git(dir, ["rev-parse", "HEAD"]) !== PINNED_9ROUTER_COMMIT)
      throw new Error("Pinned source HEAD mismatch");
  } catch {
    throw new Error("Pinned source HEAD mismatch");
  }
}
function verify(dir: string, files: string[]) {
  verifyHead(dir);
  if (git(dir, ["status", "--porcelain", "--", ...files]))
    throw new Error("Whitelisted source path is dirty");
}
export function verifyWhitelistedCleanForTest(
  sourceDir: string,
  sourceFiles: string[],
): void {
  if (git(sourceDir, ["status", "--porcelain", "--", ...sourceFiles]))
    throw new Error("Whitelisted source path is dirty");
}
async function read(dir: string, file: string) {
  return readFile(join(dir, file), "utf8");
}
function refs(sf: ts.SourceFile, file: string): Map<string, StaticRef> {
  const out = new Map<string, StaticRef>();
  for (const s of sf.statements)
    if (ts.isVariableStatement(s)) {
      if (!(s.declarationList.flags & ts.NodeFlags.Const))
        failUnsupported(file, s, "top-level const");
      for (const d of s.declarationList.declarations)
        if (ts.isIdentifier(d.name) && d.initializer) {
          if (out.has(d.name.text)) failUnsupported(file, d, d.name.text);
          out.set(d.name.text, { file, expression: d.initializer, refs: out });
        }
    }
  return out;
}
function resolvePickerLevelReference(
  node: ts.Expression,
  file: string,
  field: string,
  r: Map<string, StaticRef>,
): string[] {
  if (
    !ts.isPropertyAccessExpression(node) ||
    ts.isPropertyAccessChain(node) ||
    !ts.isIdentifier(node.expression) ||
    node.expression.text !== "L" ||
    node.name.text === "__proto__" ||
    node.name.text === "constructor" ||
    node.name.text === "prototype"
  )
    failUnsupported(file, node, field);
  const levels = r.get("L");
  if (!levels || !ts.isObjectLiteralExpression(levels.expression))
    failUnsupported(file, node, field);
  const matches = levels.expression.properties.filter(
    (entry): entry is ts.PropertyAssignment =>
      ts.isPropertyAssignment(entry) &&
      (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)) &&
      entry.name.text === node.name.text,
  );
  if (
    levels.expression.properties.some(ts.isSpreadAssignment) ||
    matches.length !== 1
  )
    failUnsupported(file, node, `${field}.${node.name.text}`);
  const property = matches[0];
  const value = staticValue(
    property.initializer,
    levels.file,
    `${field}.${node.name.text}`,
    levels.refs,
  );
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string"))
    failUnsupported(file, property.initializer, `${field}.${node.name.text}`);
  return value;
}
function picker(sf: ts.SourceFile, file: string) {
  const r = refs(sf, file);
  const formatNode = r.get("FORMAT_LEVELS");
  const patternNode = r.get("PATTERN_THINKING");
  if (!formatNode || !ts.isObjectLiteralExpression(formatNode.expression))
    failUnsupported(file, formatNode?.expression ?? sf, "FORMAT_LEVELS");
  if (formatNode.expression.properties.length === 0)
    failUnsupported(file, formatNode.expression, "FORMAT_LEVELS");
  if (!patternNode) failUnsupported(file, sf, "PATTERN_THINKING");
  const formatLevels: Record<string, string[]> = {};
  const seen = new Set<string>();
  for (const entry of formatNode.expression.properties) {
    if (ts.isSpreadAssignment(entry))
      failUnsupported(file, entry, "FORMAT_LEVELS");
    const key = propertyName(entry, file, "FORMAT_LEVELS");
    if (seen.has(key)) failUnsupported(file, entry, `FORMAT_LEVELS.${key}`);
    seen.add(key);
    if (!ts.isPropertyAssignment(entry))
      failUnsupported(file, entry, `FORMAT_LEVELS.${key}`);
    formatLevels[key] = resolvePickerLevelReference(
      entry.initializer,
      file,
      `FORMAT_LEVELS.${key}`,
      r,
    );
  }
  return {
    formatLevels,
    patternLevels: staticValue(
      patternNode.expression,
      patternNode.file,
      "PATTERN_THINKING",
      patternNode.refs,
    ),
  };
}
const reasoningKeys = new Set([
  "reasoning",
  "thinkingFormat",
  "thinkingCanDisable",
  "thinkingRange",
]);
function capabilityObject(
  node: ts.Expression,
  file: string,
  field: string,
  r: Map<string, StaticRef>,
): Record<string, unknown> {
  if (ts.isIdentifier(node) && r.has(node.text)) {
    const ref = r.get(node.text)!;
    return capabilityObject(ref.expression, ref.file, field, ref.refs);
  }
  if (!ts.isObjectLiteralExpression(node)) failUnsupported(file, node, field);
  const out: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (const entry of node.properties) {
    if (!ts.isPropertyAssignment(entry)) failUnsupported(file, entry, field);
    const key = propertyName(entry, file, field);
    if (!reasoningKeys.has(key)) continue;
    if (seen.has(key)) failUnsupported(file, entry, `${field}.${key}`);
    seen.add(key);
    out[key] = staticValue(entry.initializer, file, `${field}.${key}`, r);
  }
  if ("reasoning" in out && typeof out.reasoning !== "boolean")
    failUnsupported(file, node, `${field}.reasoning`);
  if (
    "thinkingFormat" in out &&
    typeof out.thinkingFormat !== "string" &&
    out.thinkingFormat !== null
  )
    failUnsupported(file, node, `${field}.thinkingFormat`);
  if (
    "thinkingCanDisable" in out &&
    typeof out.thinkingCanDisable !== "boolean"
  )
    failUnsupported(file, node, `${field}.thinkingCanDisable`);
  if (
    "thinkingRange" in out &&
    out.thinkingRange !== null &&
    (!out.thinkingRange ||
      typeof out.thinkingRange !== "object" ||
      Array.isArray(out.thinkingRange) ||
      Object.keys(out.thinkingRange as object)
        .sort()
        .join(",") !== "max,min" ||
      !Number.isFinite((out.thinkingRange as { min?: unknown }).min) ||
      !Number.isFinite((out.thinkingRange as { max?: unknown }).max) ||
      (out.thinkingRange as { min: number; max: number }).min >
        (out.thinkingRange as { min: number; max: number }).max)
  )
    failUnsupported(file, node, `${field}.thinkingRange`);
  return out;
}
function matches(pattern: string, model: string): boolean {
  return new RegExp(
    `^${pattern
      .split("*")
      .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, "\\$&"))
      .join(".*")}$`,
    "i",
  ).test(model);
}
function capabilityTables(sf: ts.SourceFile, file: string) {
  const r = refs(sf, file);
  const table = (key: string) => {
    const ref = r.get(key);
    if (!ref || !ts.isObjectLiteralExpression(ref.expression))
      failUnsupported(file, ref?.expression ?? sf, key);
    return { node: ref.expression, refs: ref.refs, file: ref.file };
  };
  const defaults = capabilityObject(
    table("DEFAULT_CAPABILITIES").node,
    file,
    "DEFAULT_CAPABILITIES",
    r,
  );
  const model: Record<string, Record<string, unknown>> = {};
  for (const entry of table("MODEL_CAPABILITIES").node.properties) {
    if (!ts.isPropertyAssignment(entry))
      failUnsupported(file, entry, "MODEL_CAPABILITIES");
    const key = propertyName(entry, file, "MODEL_CAPABILITIES");
    if (model[key]) failUnsupported(file, entry, `MODEL_CAPABILITIES.${key}`);
    model[key] = capabilityObject(
      entry.initializer,
      file,
      `MODEL_CAPABILITIES.${key}`,
      r,
    );
  }
  const provider: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const entry of table("PROVIDER_CAPABILITIES").node.properties) {
    if (!ts.isPropertyAssignment(entry))
      failUnsupported(file, entry, "PROVIDER_CAPABILITIES");
    const id = propertyName(entry, file, "PROVIDER_CAPABILITIES");
    if (provider[id] || !ts.isObjectLiteralExpression(entry.initializer))
      failUnsupported(file, entry, `PROVIDER_CAPABILITIES.${id}`);
    provider[id] = {};
    for (const modelEntry of entry.initializer.properties) {
      if (!ts.isPropertyAssignment(modelEntry))
        failUnsupported(file, modelEntry, `PROVIDER_CAPABILITIES.${id}`);
      const id2 = propertyName(modelEntry, file, `PROVIDER_CAPABILITIES.${id}`);
      if (provider[id][id2])
        failUnsupported(file, modelEntry, `PROVIDER_CAPABILITIES.${id}.${id2}`);
      provider[id][id2] = capabilityObject(
        modelEntry.initializer,
        file,
        `PROVIDER_CAPABILITIES.${id}.${id2}`,
        r,
      );
    }
  }
  const patternsRef = r.get("PATTERN_CAPABILITIES");
  if (!patternsRef || !ts.isArrayLiteralExpression(patternsRef.expression))
    failUnsupported(
      file,
      patternsRef?.expression ?? sf,
      "PATTERN_CAPABILITIES",
    );
  const patterns = patternsRef.expression.elements.map((entry, index) => {
    if (!ts.isObjectLiteralExpression(entry))
      failUnsupported(file, entry, `PATTERN_CAPABILITIES.${index}`);
    const pattern = findProperty(entry, "pattern");
    const caps = findProperty(entry, "caps");
    if (!pattern || !caps)
      failUnsupported(file, entry, `PATTERN_CAPABILITIES.${index}`);
    const value = staticValue(
      pattern.initializer,
      file,
      `PATTERN_CAPABILITIES.${index}.pattern`,
      r,
    );
    if (typeof value !== "string")
      failUnsupported(
        file,
        pattern.initializer,
        `PATTERN_CAPABILITIES.${index}.pattern`,
      );
    return {
      pattern: value,
      caps: capabilityObject(
        caps.initializer,
        file,
        `PATTERN_CAPABILITIES.${index}.caps`,
        r,
      ),
    };
  });
  return { defaults, provider, model, patterns };
}
function requireCodexProjection(sf: ts.SourceFile, file: string): void {
  const suffix = refs(sf, file).get("CODEX_REVIEW_SUFFIX");
  const helper = sf.statements.find(
    (s): s is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(s) && s.name?.text === "withCodexReviewModels",
  );
  if (
    !suffix ||
    !ts.isStringLiteral(suffix.expression) ||
    suffix.expression.text !== "-review" ||
    !helper
  )
    failUnsupported(
      file,
      helper ?? suffix?.expression ?? sf,
      "codex-review-v1",
    );
}
function requireGrokProjection(sf: ts.SourceFile, file: string): void {
  const hasModel = refs(sf, file).has("GROK_CLI_MODEL");
  const hasGate = sf.statements.some(
    (s) =>
      ts.isFunctionDeclaration(s) &&
      s.name?.text === "supportsGrokCliReasoningEffort",
  );
  if (!hasModel || !hasGate) failUnsupported(file, sf, "grok-cli-reasoning-v1");
}
export function isGrokCliReasoningProjectionModel(
  providerId: string,
  modelId: string,
): boolean {
  return providerId === "grok-cli" && /^grok-4\.5(?:$|-)/.test(modelId);
}
type InternalOptions = {
  verify: (dir: string, files: string[]) => void;
  expected: Counts;
  registryCount: number;
  dynamic: string[];
};
export function parseCliArgs(args: string[]): {
  sourceDir: string;
  output: string;
} {
  if (args.length !== 4 || args[0] !== "--source-dir" || args[2] !== "--output")
    throw new Error("Usage: --source-dir <dir> --output <path>");
  return { sourceDir: args[1], output: args[3] };
}
export function validateProductionGoldens(
  catalog: ExtractCatalogResult["catalog"],
  routeCollisions: Readonly<Record<string, readonly string[]>>,
): void {
  const codex = catalog.providers.codex;
  const sol = codex?.models.find((model) => model.id === "gpt-5.6-sol");
  const review = codex?.models.find(
    (model) => model.id === "gpt-5.6-sol-review",
  );
  const grok = catalog.providers["grok-cli"];
  const high = grok?.models.find((model) => model.id === "grok-4.5-high");
  const build = grok?.models.find((model) => model.id === "grok-build");
  const zai = Object.values(catalog.providers)
    .flatMap((provider) => provider.models)
    .find(
      (model) =>
        (model.reasoning as { thinkingFormat?: unknown } | undefined)
          ?.thinkingFormat === "zai",
    );
  const patterns = (
    catalog.reasoningPicker as {
      patternLevels: { pattern: string; levels: string[] }[];
    }
  ).patternLevels;
  const solLevels = patterns.find(
    (pattern) => pattern.pattern === "*gpt-5.6-sol*",
  )?.levels;
  if (
    !sol ||
    !review ||
    (
      sol.reasoning as
        { reasoning?: unknown; thinkingFormat?: unknown } | undefined
    )?.reasoning !== true ||
    (sol.reasoning as { thinkingFormat?: unknown } | undefined)
      ?.thinkingFormat !== "openai" ||
    (
      high?.reasoning as
        { reasoning?: unknown; thinkingFormat?: unknown } | undefined
    )?.reasoning !== true ||
    (high?.reasoning as { thinkingFormat?: unknown } | undefined)
      ?.thinkingFormat !== "openai" ||
    !zai ||
    JSON.stringify(solLevels) !==
      JSON.stringify([
        "none",
        "minimal",
        "low",
        "medium",
        "high",
        "xhigh",
        "max",
      ]) ||
    catalog.routeOwners.mmf !== "mmf" ||
    JSON.stringify(routeCollisions) !==
      JSON.stringify({ mmf: ["mimo-free", "mmf"] })
  )
    throw new Error("Production golden mismatch");
}
export function validateReviewMetadata(
  review: CatalogReviewMetadata,
  catalog: ExtractCatalogResult["catalog"],
  counts: Counts,
  imports: readonly string[],
): void {
  const ids = new Set<string>();
  const files = new Set<string>();
  const sums: ExcludedKindCounts = {
    image: 0,
    stt: 0,
    embedding: 0,
    tts: 0,
    video: 0,
  };
  if (
    review.projectionVersion !== 1 ||
    JSON.stringify(review.projections) !==
      JSON.stringify(CATALOG_PROJECTIONS) ||
    JSON.stringify(review.sourceFiles) !==
      JSON.stringify(catalog.sourceFiles) ||
    JSON.stringify(review.dynamicProviderIds) !==
      JSON.stringify(
        Object.entries(catalog.providers)
          .filter(
            ([, provider]) =>
              provider.modelsFetcher || provider.passthroughModels,
          )
          .map(([id]) => id)
          .sort(),
      )
  )
    throw new Error("Review metadata projection mismatch");
  if (
    review.providers.length !== imports.length ||
    !Number.isInteger(review.totals.providers) ||
    review.totals.providers < 0 ||
    !Number.isInteger(review.totals.staticLlm) ||
    review.totals.staticLlm < 0 ||
    !Number.isInteger(review.totals.excluded) ||
    review.totals.excluded < 0 ||
    review.totals.providers !== counts.providers ||
    review.totals.staticLlm !== counts.llm ||
    review.totals.excluded !== counts.excluded
  )
    throw new Error("Review metadata totals mismatch");
  for (let index = 0; index < review.providers.length; index++) {
    const row = review.providers[index];
    const provider = catalog.providers[row.providerId];
    if (
      !row.providerId ||
      ids.has(row.providerId) ||
      !/^open-sse\/providers\/registry\/[^/]+\.js$/.test(row.sourceFile) ||
      files.has(row.sourceFile) ||
      !catalog.sourceFiles.includes(row.sourceFile) ||
      row.sourceFile !== `${ROOT}/providers/registry/${imports[index]}` ||
      !provider ||
      row.catalogKey !== provider.catalogKey ||
      !Number.isInteger(row.staticLlmCount) ||
      row.staticLlmCount < 0 ||
      row.staticLlmCount !== provider.models.length ||
      row.modelsFetcher !== (provider.modelsFetcher === true) ||
      row.passthroughModels !== (provider.passthroughModels === true)
    )
      throw new Error("Review metadata row mismatch");
    ids.add(row.providerId);
    files.add(row.sourceFile);
    for (const key of ["image", "stt", "embedding", "tts", "video"] as const) {
      if (
        !Number.isInteger(row.excluded[key]) ||
        row.excluded[key] < 0 ||
        !Number.isInteger(review.totals.excludedByKind[key]) ||
        review.totals.excludedByKind[key] < 0
      )
        throw new Error("Review metadata excluded count");
      sums[key] += row.excluded[key];
    }
  }
  if (
    JSON.stringify(sums) !== JSON.stringify(review.totals.excludedByKind) ||
    sums.image !== counts.image ||
    sums.stt !== counts.stt ||
    sums.embedding !== counts.embedding ||
    sums.tts !== counts.tts ||
    sums.video !== counts.video
  )
    throw new Error("Review metadata excluded totals mismatch");
  const collisionMap: Record<string, string[]> = {};
  for (const provider of Object.values(catalog.providers))
    for (const key of [provider.catalogKey, ...provider.aliases])
      (collisionMap[key] ??= []).push(provider.id);
  const expectedCollisions = Object.fromEntries(
    Object.entries(collisionMap)
      .filter(([, owners]) => owners.length > 1)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  if (
    JSON.stringify(review.routeCollisions) !==
    JSON.stringify(expectedCollisions)
  )
    throw new Error("Review metadata collision mismatch");
  if (
    imports.length === 100 &&
    (review.providers.length !== 100 ||
      review.totals.staticLlm !== 468 ||
      review.totals.excluded !== 144 ||
      review.providers.findIndex((row) => row.providerId === "mimo-free") >=
        review.providers.findIndex((row) => row.providerId === "mmf"))
  )
    throw new Error("Production review metadata mismatch");
}
async function extract(
  sourceDir: string,
  options: InternalOptions,
): Promise<ExtractCatalogResult> {
  const index = `${ROOT}/providers/registry/index.js`;
  const indexFile = ts.createSourceFile(
    index,
    await read(sourceDir, index),
    ts.ScriptTarget.ES2022,
    true,
  );
  const bindings = new Map<string, string>();
  for (const statement of indexFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      statement.importClause?.name &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      /^\.\/[^/]+\.js$/.test(statement.moduleSpecifier.text)
    ) {
      const binding = statement.importClause.name.text;
      const path = statement.moduleSpecifier.text.slice(2);
      if (bindings.has(binding) || [...bindings.values()].includes(path))
        failUnsupported(index, statement, "registry.import");
      bindings.set(binding, path);
    } else if (ts.isImportDeclaration(statement))
      failUnsupported(index, statement, "registry.import");
  }
  const assignment = indexFile.statements.find(ts.isExportAssignment);
  if (!assignment || !ts.isArrayLiteralExpression(assignment.expression))
    failUnsupported(index, assignment ?? indexFile, "registry.export");
  const imports = assignment.expression.elements.map((element) => {
    if (!ts.isIdentifier(element) || !bindings.has(element.text))
      failUnsupported(index, element, "registry.export");
    return bindings.get(element.text)!;
  });
  if (
    imports.length !== options.registryCount ||
    new Set(imports).size !== imports.length ||
    bindings.size !== imports.length
  )
    throw new Error("Registry import count mismatch");
  const sourceFiles = [
    "open-sse/config/grokCli.js",
    "open-sse/config/providerModels.js",
    "open-sse/providers/capabilities.js",
    "open-sse/providers/index.js",
    "open-sse/providers/models/helpers.js",
    "open-sse/providers/models/schema.js",
    "open-sse/providers/schema.js",
    "open-sse/providers/thinkingLevels.js",
    index,
    ...imports.map((x) => `${ROOT}/providers/registry/${x}`),
  ].sort();
  options.verify(sourceDir, sourceFiles);
  const grokFile = "open-sse/config/grokCli.js";
  const grokSf = ts.createSourceFile(
    grokFile,
    await read(sourceDir, grokFile),
    ts.ScriptTarget.ES2022,
    true,
  );
  const grokRefs = refs(grokSf, grokFile);
  const excluded: ExcludedKindCounts = {
    image: 0,
    stt: 0,
    embedding: 0,
    tts: 0,
    video: 0,
  };
  const entries: Record<string, Provider> = {};
  const routeOwners: Record<string, string> = {};
  const reviewRows: ProviderReviewRow[] = [];
  requireGrokProjection(grokSf, grokFile);
  const helperFile = "open-sse/providers/models/helpers.js";
  requireCodexProjection(
    ts.createSourceFile(
      helperFile,
      await read(sourceDir, helperFile),
      ts.ScriptTarget.ES2022,
      true,
    ),
    helperFile,
  );
  for (const fileName of imports) {
    const file = `${ROOT}/providers/registry/${fileName}`;
    const sf = ts.createSourceFile(
      file,
      await read(sourceDir, file),
      ts.ScriptTarget.ES2022,
      true,
    );
    const assignment = sf.statements.find(ts.isExportAssignment);
    if (!assignment || !ts.isObjectLiteralExpression(assignment.expression))
      failUnsupported(file, assignment ?? sf, "provider");
    const localRefs = refs(sf, file);
    if (fileName === "grok-cli.js") {
      const constant = grokRefs.get("GROK_CLI_MODEL");
      if (constant) localRefs.set("GROK_CLI_MODEL", constant);
    }
    const before = { ...excluded };
    const p = extractProvider(assignment.expression, file, localRefs, excluded);
    if (entries[p.id]) throw new Error("Duplicate provider id");
    entries[p.id] = p;
    for (const key of [p.catalogKey, ...p.aliases]) routeOwners[key] = p.id;
    reviewRows.push({
      providerId: p.id,
      sourceFile: file,
      catalogKey: p.catalogKey,
      staticLlmCount: p.models.length,
      excluded: {
        image: excluded.image - before.image,
        stt: excluded.stt - before.stt,
        embedding: excluded.embedding - before.embedding,
        tts: excluded.tts - before.tts,
        video: excluded.video - before.video,
      },
      modelsFetcher: p.modelsFetcher === true,
      passthroughModels: p.passthroughModels === true,
    });
  }
  const providers = Object.fromEntries(
    Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)),
  );
  const llm = Object.values(providers).reduce<number>(
    (n, p) => n + p.models.length,
    0,
  );
  const counts: Counts = {
    providers: Object.keys(providers).length,
    llm,
    excluded:
      excluded.image +
      excluded.stt +
      excluded.embedding +
      excluded.tts +
      excluded.video,
    ...excluded,
  };
  if (
    Object.entries(options.expected).some(
      ([key, value]) => counts[key as keyof Counts] !== value,
    )
  )
    throw new Error(`Production count mismatch: ${JSON.stringify(counts)}`);
  const capabilitiesFile = "open-sse/providers/capabilities.js";
  const tables = capabilityTables(
    ts.createSourceFile(
      capabilitiesFile,
      await read(sourceDir, capabilitiesFile),
      ts.ScriptTarget.ES2022,
      true,
    ),
    capabilitiesFile,
  );
  for (const provider of Object.values(providers))
    for (const model of provider.models) {
      const base = model.id.includes("/")
        ? model.id.split("/").pop()!
        : model.id;
      const selected =
        tables.provider[provider.id]?.[model.id] ??
        tables.provider[provider.id]?.[base] ??
        tables.model[base] ??
        tables.model[model.id] ??
        tables.patterns.find(
          (rule) =>
            matches(rule.pattern, base) || matches(rule.pattern, model.id),
        )?.caps ??
        {};
      const effective = {
        ...tables.defaults,
        ...selected,
        ...((model.reasoning as Record<string, unknown>) ?? {}),
      };
      if (effective.reasoning === true)
        model.reasoning = reasoningKeys.size ? effective : undefined;
      else delete model.reasoning;
      if (isGrokCliReasoningProjectionModel(provider.id, model.id))
        model.reasoning = {
          ...effective,
          reasoning: true,
          thinkingFormat: "openai",
        };
    }
  for (const model of providers.codex?.models ?? []) {
    model.canonicalProvider = "openai";
    model.canonicalModelId = model.upstreamModelId ?? model.id;
  }
  for (const provider of Object.values(providers))
    if (
      !provider.id ||
      new Set(provider.models.map((model) => model.id)).size !==
        provider.models.length ||
      provider.models.some((model) => !model.id) ||
      new Set(provider.aliases).size !== provider.aliases.length
    )
      throw new Error("Invalid catalog provider/model identity");
  const dynamic = Object.values(providers)
    .filter((provider) => provider.modelsFetcher || provider.passthroughModels)
    .map((provider) => provider.id)
    .sort();
  if (dynamic.join(",") !== options.dynamic.join(","))
    throw new Error("Dynamic provider flags mismatch");
  const collisions: Record<string, string[]> = {};
  for (const provider of Object.values(entries))
    for (const key of [provider.catalogKey, ...provider.aliases]) {
      const owners = collisions[key] ?? [];
      collisions[key] = owners;
      owners.push(provider.id);
    }
  const routeCollisions = Object.fromEntries(
    Object.entries(collisions)
      .filter(([, owners]) => owners.length > 1)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  const pickerFile = "open-sse/providers/thinkingLevels.js";
  const catalog = {
    sourceCommit: PINNED_9ROUTER_COMMIT,
    sourceFiles,
    providers,
    routeOwners: Object.fromEntries(
      Object.entries(routeOwners).sort(([a], [b]) => a.localeCompare(b)),
    ),
    reasoningPicker: picker(
      ts.createSourceFile(
        pickerFile,
        await read(sourceDir, pickerFile),
        ts.ScriptTarget.ES2022,
        true,
      ),
      pickerFile,
    ),
  };
  validateLlmCatalog(catalog);
  const review: CatalogReviewMetadata = {
    projectionVersion: 1,
    projections: CATALOG_PROJECTIONS,
    sourceFiles,
    providers: reviewRows,
    totals: {
      providers: reviewRows.length,
      staticLlm: reviewRows.reduce((sum, row) => sum + row.staticLlmCount, 0),
      excluded: counts.excluded,
      excludedByKind: { ...excluded },
    },
    dynamicProviderIds: dynamic,
    routeCollisions,
  };
  validateReviewMetadata(review, catalog, counts, imports);
  if (options.registryCount === 100)
    validateProductionGoldens(catalog, routeCollisions);
  return {
    catalog,
    projectionVersion: CATALOG_PROJECTION_VERSION,
    projections: CATALOG_PROJECTIONS,
    routeCollisions,
    diagnostics: [],
    counts,
    review,
  };
}
const productionOptions: InternalOptions = {
  verify,
  registryCount: 100,
  dynamic: DYNAMIC,
  expected: {
    providers: 100,
    llm: 468,
    excluded: 144,
    image: 60,
    stt: 21,
    embedding: 33,
    tts: 27,
    video: 3,
  },
};
export async function extractCatalog({
  sourceDir,
}: {
  sourceDir: string;
}): Promise<ExtractCatalogResult> {
  verifyHead(sourceDir);
  return extract(sourceDir, productionOptions);
}
/** Test-only fixture profile. Never used by CLI. */
export async function extractFixtureCatalog(
  sourceDir: string,
  expected: Counts,
  dynamic: string[] = [],
  registryCount = 1,
): Promise<ExtractCatalogResult> {
  return extract(sourceDir, {
    verify: () => {},
    registryCount,
    expected,
    dynamic,
  });
}
export function renderCatalogModule(result: ExtractCatalogResult): string {
  return `import type { NineRouterLlmCatalog } from "../route-types.js";\n\nexport const NINE_ROUTER_LLM_CATALOG: NineRouterLlmCatalog = ${JSON.stringify(result.catalog, null, 2)};\n`;
}
export function renderReviewMetadata(result: ExtractCatalogResult): string {
  return `${JSON.stringify(result.review, null, 2)}\n`;
}
async function atomicWrite(
  path: string,
  contents: string,
  beforeRename?: () => void,
): Promise<void> {
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, contents);
    beforeRename?.();
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}
export async function writeCatalogAtomically(
  path: string,
  contents: string,
): Promise<void> {
  await atomicWrite(path, contents);
}
export async function writeCatalogAtomicallyForTest(
  path: string,
  contents: string,
): Promise<void> {
  await atomicWrite(path, contents, () => {
    throw new Error("test post-temp failure");
  });
}
async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const result = await extractCatalog({ sourceDir: args.sourceDir });
  await writeCatalogAtomically(args.output, renderCatalogModule(result));
  console.log(JSON.stringify(result.counts));
}
if (import.meta.main)
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
