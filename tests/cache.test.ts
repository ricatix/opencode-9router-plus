import { afterEach, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  readCacheBounded,
  setCacheDirForTest,
  setCacheOpenForTest,
  writeCache,
} from "../src/cache.js";

let dir = "";
afterEach(async () => {
  setCacheOpenForTest();
  setCacheDirForTest();
  await fs.rm(dir, { recursive: true, force: true });
});
test("bounded cache read accepts envelope and rejects oversized file", async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "cache-"));
  setCacheDirForTest(dir);
  await writeCache("models-dev-api", { ok: true });
  expect(await readCacheBounded("models-dev-api", 1000)).toEqual({ ok: true });
  await fs.writeFile(
    path.join(dir, "models.dev.api.json"),
    "x".repeat(1_048_577),
  );
  expect(await readCacheBounded("models-dev-api", 1_048_576)).toBeNull();
});

test("roundtrips payload at network boundary inside cache envelope", async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "cache-"));
  setCacheDirForTest(dir);
  const payload = "x".repeat(1_048_500);
  await writeCache("models-dev-api", { payload });
  expect(
    ((await readCacheBounded("models-dev-api", 1_048_576)) as any)?.payload,
  ).toBe(payload);
});

test("API cache write accepts 5 MiB cap", async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "cache-"));
  setCacheDirForTest(dir);
  const payload = "x".repeat(1_048_576);
  await writeCache("models-dev-api", { payload }, 5_242_880);
  expect(
    ((await readCacheBounded("models-dev-api", 5_242_880)) as any)?.payload,
  ).toBe(payload);
});

test("malformed and expired envelopes miss; exact serialized boundaries", async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "cache-"));
  setCacheDirForTest(dir);
  const file = path.join(dir, "models.dev.api.json");
  await fs.writeFile(file, "{");
  expect(await readCacheBounded("models-dev-api", 1_048_576)).toBeNull();
  await fs.writeFile(file, JSON.stringify({ timestamp: 0, data: {} }));
  expect(await readCacheBounded("models-dev-api", 1_048_576)).toBeNull();
  const overhead = Buffer.byteLength(
    JSON.stringify({ timestamp: Date.now(), data: "" }),
  );
  await fs.writeFile(
    file,
    JSON.stringify({
      timestamp: Date.now(),
      data: "x".repeat(1_048_576 - overhead),
    }),
  );
  expect(await readCacheBounded("models-dev-api", 1_048_576)).not.toBeNull();
  await fs.writeFile(
    file,
    JSON.stringify({
      timestamp: Date.now(),
      data: "x".repeat(1_048_577 - overhead),
    }),
  );
  expect(await readCacheBounded("models-dev-api", 1_048_576)).toBeNull();
});

test("bounded read rejects deterministic growth after stat before parse", async () => {
  let parsed = false;
  const original = JSON.parse;
  JSON.parse = ((value: string) => {
    parsed = true;
    return original(value);
  }) as typeof JSON.parse;
  setCacheOpenForTest(
    async () =>
      ({
        stat: async () => ({ isFile: () => true, size: 1 }),
        read: async (_b: Buffer, _o: number, length: number) => ({
          bytesRead: length,
        }),
        close: async () => {},
      }) as any,
  );
  try {
    expect(await readCacheBounded("models-dev-api", 1_048_576)).toBeNull();
    expect(parsed).toBeFalse();
  } finally {
    JSON.parse = original;
    setCacheOpenForTest();
  }
});
