import { expect, test } from "bun:test";
import { resolveModel } from "../src/model-mapper.js";

const client = (
  canonical: any = { providerModel: null, modelOnly: null },
  exact: any = null,
) => ({
  lookupCanonical: async (...args: string[]) => canonical,
  lookupExact: async (id: string) => (id === "private/exact" ? exact : null),
  lookupUniqueLeaf: async (id: string) =>
    id === "private/exact" ? exact : null,
});

test("catalog controls reasoning and projects safe provider/global metadata", async () => {
  const entry = await resolveModel(
    "cx/gpt-5.6-sol",
    client({
      providerModel: {
        id: "x",
        name: "Provider",
        cost: { input: 1, output: 2 },
        attachment: true,
        reasoning: false,
      },
      modelOnly: {
        id: "x",
        family: "global",
        limit: { context: 10, output: 2 },
        modalities: { input: ["text"], output: ["image"] },
        temperature: false,
      },
    }),
  );
  expect(entry).toMatchObject({
    id: "cx/gpt-5.6-sol",
    name: "Provider",
    family: "global",
    cost: { input: 1, output: 2 },
    limit: { context: 10, output: 2 },
    modalities: { input: ["text"], output: ["image"] },
    attachment: false,
    temperature: false,
    tool_call: false,
    reasoning: true,
  });
  expect(entry.variants).toBeDefined();
});
test("Codex catalog uses OpenAI canonical metadata and projects limit", async () => {
  const calls: string[][] = [];
  const entry = await resolveModel("cx/gpt-5.6-terra", {
    lookupCanonical: async (...args: string[]) => {
      calls.push(args);
      return {
        providerModel: {
          id: "openai/gpt-5.6-terra",
          name: "GPT 5.6 Terra",
          limit: { context: 1_000, output: 100 },
        },
        modelOnly: null,
      };
    },
    lookupExact: async () => null,
    lookupUniqueLeaf: async () => null,
  });
  expect(calls).toEqual([["openai", "openai/gpt-5.6-terra"]]);
  expect(entry.limit).toEqual({ context: 1_000, output: 100 });
});
test("unmatched uses unique leaf only, default false flags, rejects unsafe metadata", async () => {
  const entry = await resolveModel(
    "private/exact",
    client(undefined, {
      id: "private/exact",
      name: " bad ",
      cost: { input: Infinity, output: 1 },
      limit: { context: 0, output: 1 },
      modalities: { input: ["binary"], output: ["text"] },
      reasoning: true,
    }),
  );
  expect(entry).toEqual({
    id: "private/exact",
    name: "private/exact",
    attachment: false,
    reasoning: false,
    temperature: false,
    tool_call: false,
  });
});

test("uses valid global compound when provider compound is invalid", async () => {
  const entry = await resolveModel(
    "cx/gpt-5.6-sol",
    client({
      providerModel: {
        id: "p",
        name: "",
        cost: { input: -1, output: 1 },
        limit: { context: 0, output: 1 },
        modalities: { input: ["binary"], output: ["text"] },
      },
      modelOnly: {
        id: "g",
        cost: { input: 2, output: 3 },
        limit: { context: 4, output: 5 },
        modalities: { input: ["text"], output: ["image"] },
      },
    }),
  );
  expect(entry).toMatchObject({
    attachment: false,
    reasoning: true,
    temperature: false,
    tool_call: false,
    cost: { input: 2, output: 3 },
    limit: { context: 4, output: 5 },
    modalities: { input: ["text"], output: ["image"] },
  });
});

test("rejects invalid metadata matrix and ignores models.dev booleans", async () => {
  const bad = ["", "x".repeat(513), "x\n"];
  for (const name of bad) {
    const e = await resolveModel(
      "private/exact",
      client(undefined, {
        id: "x",
        name,
        family: name,
        release_date: name,
        attachment: true,
        reasoning: true,
        temperature: true,
        tool_call: true,
        cost: { input: NaN, output: Infinity },
        limit: { context: 1.5, output: 10_000_001 },
        modalities: { input: Array(17).fill("text"), output: ["text"] },
      }),
    );
    expect(e).toMatchObject({
      name: "private/exact",
      attachment: false,
      reasoning: false,
      temperature: false,
      tool_call: false,
    });
  }
  for (const mode of [
    { input: ["text", "text"], output: ["text"] },
    { input: ["x".repeat(65)], output: ["text"] },
    { input: ["binary"], output: ["text"] },
  ])
    expect(
      (
        await resolveModel(
          "private/exact",
          client(undefined, {
            id: "x",
            name: "ok",
            cost: { input: -1, output: 1 },
            limit: { context: 0, output: 1 },
            modalities: mode,
          }),
        )
      ).modalities,
    ).toBeUndefined();
});

test("reviewed nonreasoning omits variants", async () => {
  const e = await resolveModel("ag/gemini-pro-agent", client());
  expect(e.reasoning).toBeFalse();
  expect(e.variants).toBeUndefined();
});
