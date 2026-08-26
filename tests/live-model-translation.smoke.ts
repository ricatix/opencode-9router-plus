import {
  acceptDiscoveryEntries,
  createPlugin,
  listModels,
} from "../src/index.js";
import type { OpenCodeModelEntry } from "../src/model-mapper.js";
import { lookupModel, lookupModelsDev } from "../src/models-dev.js";

const contract = (entry: OpenCodeModelEntry) => {
  const allowed = new Set([
    "id",
    "name",
    "family",
    "release_date",
    "attachment",
    "reasoning",
    "temperature",
    "tool_call",
    "cost",
    "limit",
    "modalities",
    "variants",
  ]);
  if (Object.keys(entry).some((key) => !allowed.has(key)))
    throw new Error("unexpected model output key");
  if (typeof entry.id !== "string" || typeof entry.name !== "string")
    throw new Error("invalid model identity output");
  for (const key of [
    "attachment",
    "reasoning",
    "temperature",
    "tool_call",
  ] as const)
    if (typeof entry[key] !== "boolean")
      throw new Error(`invalid ${key} output`);
  if (
    entry.cost &&
    (!Number.isFinite(entry.cost.input) || !Number.isFinite(entry.cost.output))
  )
    throw new Error("invalid cost output");
  if (
    entry.limit &&
    (!Number.isInteger(entry.limit.context) ||
      !Number.isInteger(entry.limit.output))
  )
    throw new Error("invalid limit output");
  if (
    entry.modalities &&
    (!entry.modalities.input.length || !entry.modalities.output.length)
  )
    throw new Error("invalid modalities output");
  if (entry.variants && !entry.reasoning)
    throw new Error("variants require reasoning output");
  if (entry.variants)
    for (const value of Object.values(entry.variants))
      if (
        Object.keys(value).join() !== "reasoningEffort" ||
        typeof value.reasoningEffort !== "string"
      )
        throw new Error("invalid variants output");
};
const key = process.env.OPENCODE_9ROUTER_API_KEY;
if (!key) console.log("skip: OPENCODE_9ROUTER_API_KEY absent");
else {
  let captured: unknown = [];
  let uniqueLeafProjections = 0;
  const baseUrl =
    process.env.OPENCODE_9ROUTER_URL || "http://localhost:20128/v1";
  const plugin = createPlugin({
    listModels: async (baseUrl, timeoutMs, apiKey) =>
      (captured = await listModels(baseUrl, timeoutMs, apiKey)),
    modelsDevClient: {
      lookupCanonical: lookupModelsDev,
      lookupExact: async () => null,
      lookupUniqueLeaf: async (id) => {
        const model = await lookupModel(id);
        if (model) uniqueLeafProjections++;
        return model;
      },
    },
  });
  const hooks = await plugin({} as never),
    config: any = {};
  await hooks.config?.(config);
  const accepted = acceptDiscoveryEntries(captured),
    models = config.provider?.["9router"]?.models ?? {};
  if (!accepted.length)
    throw new Error(
      `live discovery returned zero accepted models from ${baseUrl}; check API key auth and router availability; kind is optional and ignored`,
    );
  if (
    Object.keys(models).sort().join() !==
    accepted
      .map(({ id }) => id)
      .sort()
      .join()
  )
    throw new Error("configured model IDs differ from accepted live discovery");
  for (const entry of Object.values(models) as OpenCodeModelEntry[])
    contract(entry);
  console.log(
    `ok: ${accepted.length} accepted models; ${uniqueLeafProjections} unique leaf metadata projections`,
  );
}
