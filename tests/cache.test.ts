import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getCacheAge, readCache, setCacheDirForTest, writeCache } from "../src/cache.js";

let cacheDir: string | undefined;

afterEach(async () => {
  setCacheDirForTest();
  if (cacheDir) await fs.rm(cacheDir, { recursive: true, force: true });
  cacheDir = undefined;
});

async function useTempCache(): Promise<string> {
  cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-9router-cache-"));
  setCacheDirForTest(cacheDir);
  return cacheDir;
}

describe("catalog cache", () => {
  test("keeps catalogs separate and defaults cache age to API", async () => {
    await useTempCache();
    await writeCache("models-dev-models", { models: true });
    await writeCache("models-dev-api", { api: true });
    expect(await readCache("models-dev-models")).toEqual({ models: true });
    expect(await getCacheAge()).toMatchObject({ exists: true });
  });

  test("rejects entries older than 24 hours", async () => {
    const dir = await useTempCache();
    const file = path.join(dir, "models.dev.api.json");
    await fs.writeFile(file, JSON.stringify({ timestamp: Date.now() - 24 * 60 * 60 * 1000, data: {} }));
    expect(await readCache("models-dev-api")).toBeNull();
  });
});
