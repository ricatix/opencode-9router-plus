import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type CacheName = "models-dev-api" | "models-dev-models";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const files: Record<CacheName, string> = {
  "models-dev-api": "models.dev.api.json",
  "models-dev-models": "models.dev.models.json",
};
let cacheDir = path.join(os.homedir(), ".cache", "opencode-9router-plus");

interface CacheEntry {
  timestamp: number;
  data: unknown;
}

function cacheFile(name: CacheName): string {
  return path.join(cacheDir, files[name]);
}

export function setCacheDirForTest(dir?: string): void {
  cacheDir = dir ?? path.join(os.homedir(), ".cache", "opencode-9router-plus");
}

export async function readCache(name: CacheName): Promise<unknown | null> {
  try {
    const entry = JSON.parse(await fs.readFile(cacheFile(name), "utf8")) as CacheEntry;
    return Date.now() - entry.timestamp < CACHE_TTL_MS ? entry.data : null;
  } catch {
    return null;
  }
}

export async function writeCache(name: CacheName, data: unknown): Promise<void> {
  await fs.mkdir(cacheDir, { recursive: true });
  const tmp = path.join(cacheDir, `.${files[name].replace(/\.json$/, "")}.${process.pid}.tmp`);
  await fs.writeFile(tmp, JSON.stringify({ timestamp: Date.now(), data }), "utf8");
  await fs.rename(tmp, cacheFile(name));
}

export async function getCacheAge(name: CacheName = "models-dev-api"): Promise<{ exists: boolean; ageMs?: number }> {
  try {
    return { exists: true, ageMs: Date.now() - (await fs.stat(cacheFile(name))).mtimeMs };
  } catch {
    return { exists: false };
  }
}
