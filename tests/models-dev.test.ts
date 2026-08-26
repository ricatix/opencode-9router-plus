import { afterEach, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  readCacheBounded,
  setCacheDirForTest,
  writeCache,
} from "../src/cache.js";
import { createModelsDevClient } from "../src/models-dev.js";

const cache = { read: async () => null, write: async () => {} };
test("client caches catalogs, canonical and exact lookups only", async () => {
  const calls: string[] = [];
  const client = createModelsDevClient({
    apiUrl: "api",
    modelsUrl: "models",
    cache,
    fetch: async (url) => {
      calls.push(url);
      return new Response(
        JSON.stringify(
          url === "api"
            ? {
                p: {
                  id: "p",
                  name: "P",
                  models: { m: { id: "m", name: "provider" } },
                },
              }
            : {
                "p/m": { id: "p/m", name: "global" },
                "private/exact": { id: "private/exact", name: "exact" },
              },
        ),
      );
    },
  });
  expect(await client.lookupCanonical("p", "p/m")).toMatchObject({
    providerModel: { name: "provider" },
    modelOnly: { name: "global" },
  });
  expect(await client.lookupCanonical("p", "p/m")).toBeDefined();
  expect(await client.lookupExact("private/exact")).toMatchObject({
    name: "exact",
  });
  expect(calls).toEqual(["api", "models"]);
});
test("oversize stream becomes empty and never writes", async () => {
  let writes = 0;
  const client = createModelsDevClient({
    apiUrl: "api",
    modelsUrl: "models",
    cache: {
      read: async () => null,
      write: async () => {
        writes++;
      },
    },
    fetch: async () => new Response("x".repeat(1_048_577)),
  });
  expect(await client.lookupExact("x")).toBeNull();
  expect(writes).toBe(0);
});

test("API catalog uses 5 MiB cache, fetch, and write cap", async () => {
  const caps: number[] = [];
  const name = "x".repeat(1_048_577);
  const client = createModelsDevClient({
    apiUrl: "api",
    modelsUrl: "models",
    cache: {
      read: async (_name, maxBytes) => {
        caps.push(maxBytes);
        return null;
      },
      write: async (_name, _data, maxBytes) => {
        caps.push(maxBytes);
      },
    },
    fetch: async (url) =>
      new Response(
        JSON.stringify(
          url === "api" ? { p: { models: { m: { id: "m", name } } } } : {},
        ),
      ),
  });
  expect((await client.lookupCanonical("p", "p/m")).providerModel?.name).toBe(
    name,
  );
  expect(caps).toEqual([5_242_880, 1_048_576, 5_242_880]);
});

test("invalid parseable cache misses then fetches valid catalog", async () => {
  let requests = 0;
  const client = createModelsDevClient({
    apiUrl: "api",
    modelsUrl: "models",
    cache: { read: async () => ({ bad: true }), write: async () => {} },
    fetch: async () => {
      requests++;
      return new Response(
        JSON.stringify({
          "private/exact": { id: "private/exact", name: "Exact" },
        }),
      );
    },
  });
  expect(await client.lookupExact("private/exact")).toMatchObject({
    name: "Exact",
  });
  expect(requests).toBe(1);
});

test("exact lookup has no leaf fallback and provider canonical ref fallback works", async () => {
  const client = createModelsDevClient({
    apiUrl: "api",
    modelsUrl: "models",
    cache,
    fetch: async (url) =>
      new Response(
        JSON.stringify(
          url === "api"
            ? { p: { models: { "p/m": { id: "p/m", name: "fallback" } } } }
            : { "other/m": { id: "other/m", name: "leaf" } },
        ),
      ),
  });
  expect(await client.lookupExact("p/m")).toBeNull();
  expect((await client.lookupCanonical("p", "p/m")).providerModel?.name).toBe(
    "fallback",
  );
});

test("unique global canonical leaf lookup accepts nested route only once", async () => {
  const client = createModelsDevClient({
    apiUrl: "api",
    modelsUrl: "models",
    cache,
    fetch: async () =>
      new Response(
        JSON.stringify({
          "openai/gpt-5.6": { id: "openai/gpt-5.6", name: "Leaf" },
        }),
      ),
  });
  expect(await client.lookupUniqueLeaf("private/nested/gpt-5.6")).toMatchObject(
    {
      name: "Leaf",
    },
  );
});

test("unique global canonical leaf lookup rejects absent, collision, and case mismatch", async () => {
  const client = createModelsDevClient({
    apiUrl: "api",
    modelsUrl: "models",
    cache,
    fetch: async () =>
      new Response(
        JSON.stringify({
          "a/gpt-5.6": { id: "a/gpt-5.6", name: "one" },
          "b/gpt-5.6": { id: "b/gpt-5.6", name: "two" },
          "c/GPT-5.7": { id: "c/GPT-5.7", name: "case" },
        }),
      ),
  });
  expect(await client.lookupUniqueLeaf("private/missing")).toBeNull();
  expect(await client.lookupUniqueLeaf("private/gpt-5.6")).toBeNull();
  expect(await client.lookupUniqueLeaf("private/gpt-5.7")).toBeNull();
});

test("client isolation, cache hit, concurrency, limits, and HTTP boundary", async () => {
  let fetches = 0,
    writes = 0;
  const valid = { "p/m": { id: "p/m", name: "ok" } };
  const make = (cached: any = null) =>
    createModelsDevClient({
      apiUrl: "api",
      modelsUrl: "models",
      cache: {
        read: async () => cached,
        write: async () => {
          writes++;
        },
      },
      fetch: async () => {
        fetches++;
        return new Response(JSON.stringify(valid));
      },
    });
  const cached = make(valid);
  await cached.lookupExact("p/m");
  expect(fetches).toBe(0);
  expect(writes).toBe(0);
  const one = make();
  await Promise.all([one.lookupExact("p/m"), one.lookupExact("p/m")]);
  expect(fetches).toBe(1);
  const two = make();
  await two.lookupExact("p/m");
  expect(fetches).toBe(2);
  for (const huge of [
    {
      ...Object.fromEntries(
        Array.from({ length: 20_001 }, (_, i) => [
          `p/${i}`,
          { id: "x", name: "x" },
        ]),
      ),
    },
    Object.fromEntries(
      Array.from({ length: 501 }, (_, i) => [`p${i}`, { models: {} }]),
    ),
  ]) {
    const c = createModelsDevClient({
      apiUrl: "api",
      modelsUrl: "models",
      cache,
      fetch: async () => new Response(JSON.stringify(huge)),
    });
    expect(await c.lookupExact("p/0")).toBeNull();
  }
  for (const size of [1_048_576, 1_048_577]) {
    const c = createModelsDevClient({
      apiUrl: "api",
      modelsUrl: "models",
      cache,
      fetch: async () => new Response(" ".repeat(size)),
    });
    expect(await c.lookupExact("x")).toBeNull();
  }
});

test("physical cache roundtrip and catalog record limits", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "models-cache-"));
  setCacheDirForTest(dir);
  try {
    let firstFetch = 0,
      secondFetch = 0,
      writes = 0;
    const cache = {
      read: readCacheBounded,
      write: async (...args: Parameters<typeof writeCache>) => {
        writes++;
        await writeCache(...args);
      },
    };
    const first = createModelsDevClient({
      apiUrl: "api",
      modelsUrl: "models",
      cache,
      fetch: async () => {
        firstFetch++;
        return new Response(
          JSON.stringify({ "p/m": { id: "p/m", name: "Cached" } }),
        );
      },
    });
    expect((await first.lookupExact("p/m"))?.name).toBe("Cached");
    expect(firstFetch).toBe(1);
    expect(writes).toBe(1);
    const second = createModelsDevClient({
      apiUrl: "api",
      modelsUrl: "models",
      cache,
      fetch: async () => {
        secondFetch++;
        return new Response("{}");
      },
    });
    expect((await second.lookupExact("p/m"))?.name).toBe("Cached");
    expect(secondFetch).toBe(0);
    for (const catalog of [
      {
        p: {
          models: Object.fromEntries(
            Array.from({ length: 5_001 }, (_, i) => [
              `m${i}`,
              { id: "x", name: "x" },
            ]),
          ),
        },
      },
      {
        "p/m": Object.fromEntries(
          Array.from({ length: 33 }, (_, i) => [`x${i}`, i]),
        ),
      },
    ]) {
      const c = createModelsDevClient({
        apiUrl: "api",
        modelsUrl: "models",
        cache: { read: async () => null, write: async () => {} },
        fetch: async () => new Response(JSON.stringify(catalog)),
      });
      expect(await c.lookupExact("p/m")).toBeNull();
    }
  } finally {
    setCacheDirForTest();
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("valid JSON byte boundary accepts then rejects without cache write", async () => {
  for (const [size, accepted] of [
    [1_048_576, true],
    [1_048_577, false],
  ] as const) {
    let writes = 0;
    const base = JSON.stringify({ "p/m": { id: "p/m", name: "ok" } });
    const padded = base + " ".repeat(size - Buffer.byteLength(base));
    const c = createModelsDevClient({
      apiUrl: "api",
      modelsUrl: "models",
      cache: {
        read: async () => null,
        write: async () => {
          writes++;
        },
      },
      fetch: async () => new Response(padded),
    });
    expect((await c.lookupExact("p/m"))?.name === "ok").toBe(accepted);
    expect(writes === 1).toBe(accepted);
  }
});

test("API provider and provider-model limits reject canonical lookup", async () => {
  for (const api of [
    Object.fromEntries(
      Array.from({ length: 501 }, (_, i) => [`p${i}`, { models: {} }]),
    ),
    {
      p: {
        models: Object.fromEntries(
          Array.from({ length: 5_001 }, (_, i) => [
            `m${i}`,
            { id: "x", name: "x" },
          ]),
        ),
      },
    },
  ]) {
    const requests: string[] = [];
    let writes = 0;
    const client = createModelsDevClient({
      apiUrl: "api",
      modelsUrl: "models",
      cache: {
        read: async () => null,
        write: async () => {
          writes++;
        },
      },
      fetch: async (url) => {
        requests.push(url);
        return new Response(JSON.stringify(url === "api" ? api : {}));
      },
    });
    expect(await client.lookupCanonical("p", "p/m")).toEqual({
      providerModel: null,
      modelOnly: null,
    });
    expect(requests).toEqual(["api", "models"]);
    expect(writes).toBe(0);
  }
});
