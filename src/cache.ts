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
let openFile: typeof fs.open = fs.open;

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

export function setCacheOpenForTest(open?: typeof fs.open): void {
  openFile = open ?? fs.open;
}

export async function readCacheBounded(
  name: CacheName,
  maxBytes: number,
): Promise<unknown | null> {
  let handle: fs.FileHandle | undefined;
  try {
    handle = await openFile(cacheFile(name), "r");
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maxBytes) return null;
    const buffer = Buffer.alloc(maxBytes + 1);
    let bytesRead = 0;
    while (bytesRead <= maxBytes) {
      const read = await handle.read(
        buffer,
        bytesRead,
        maxBytes + 1 - bytesRead,
        bytesRead,
      );
      if (read.bytesRead === 0) break;
      bytesRead += read.bytesRead;
    }
    if (bytesRead > maxBytes) return null;
    const content = buffer.subarray(0, bytesRead).toString("utf8");
    const entry = JSON.parse(content) as CacheEntry;
    if (!Number.isFinite(entry.timestamp) || !Object.hasOwn(entry, "data"))
      return null;
    return Date.now() - entry.timestamp < CACHE_TTL_MS ? entry.data : null;
  } catch {
    return null;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

export function readCache(name: CacheName): Promise<unknown | null> {
  return readCacheBounded(name, 1_048_576);
}

export async function writeCache(
  name: CacheName,
  data: unknown,
  maxBytes = 1_048_576,
): Promise<void> {
  const content = JSON.stringify({ timestamp: Date.now(), data });
  if (Buffer.byteLength(content) > maxBytes) return;
  await fs.mkdir(cacheDir, { recursive: true });
  const tmp = path.join(
    cacheDir,
    `.${files[name].replace(/\.json$/, "")}.${process.pid}.${crypto.randomUUID()}.tmp`,
  );
  await fs.writeFile(tmp, content, "utf8");
  await fs.rename(tmp, cacheFile(name));
}

export async function getCacheAge(
  name: CacheName = "models-dev-api",
): Promise<{ exists: boolean; ageMs?: number }> {
  try {
    return {
      exists: true,
      ageMs: Date.now() - (await fs.stat(cacheFile(name))).mtimeMs,
    };
  } catch {
    return { exists: false };
  }
}
