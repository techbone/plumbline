import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { list, put } from "@vercel/blob";

/**
 * Write-once object storage. Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
 * otherwise a local folder, so dev and the e2e script run without an account.
 * Every path is written once and never overwritten, so CDN caching can't serve
 * a stale value.
 */

const LOCAL_DIR = process.env.DATA_DIR ?? join(process.cwd(), "data");
const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function putObject(path: string, body: Buffer | string, contentType: string): Promise<void> {
  if (blobEnabled()) {
    await put(path, body, { access: "public", contentType, addRandomSuffix: false, allowOverwrite: false });
    return;
  }
  const file = join(LOCAL_DIR, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, body);
}

export async function getObject(path: string): Promise<Buffer | null> {
  if (blobEnabled()) {
    const { blobs } = await list({ prefix: path, limit: 1 });
    const hit = blobs.find((b) => b.pathname === path);
    if (!hit) return null;
    const res = await fetch(hit.url, { cache: "no-store" });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }
  try {
    return await readFile(join(LOCAL_DIR, path));
  } catch {
    return null;
  }
}

/** Object paths under a prefix (one level is enough for our layout). */
export async function listObjects(prefix: string): Promise<string[]> {
  if (blobEnabled()) {
    const out: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      out.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return out;
  }
  try {
    const dir = join(LOCAL_DIR, prefix);
    return (await readdir(dir)).map((n) => join(prefix, n));
  } catch {
    return [];
  }
}
