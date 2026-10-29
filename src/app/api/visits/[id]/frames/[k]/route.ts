import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { visitDir } from "@/lib/db";

export const runtime = "nodejs";

/** Keyframe k (0-based) of a visit, as extracted by the pipeline. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; k: string }> }) {
  const { id, k } = await params;
  const n = Number(k);
  if (!/^vis_[0-9a-f]{12}$/.test(id) || !Number.isInteger(n) || n < 0) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(join(visitDir(id), "frames", `kf_${String(n + 1).padStart(4, "0")}.jpg`));
    return new Response(new Uint8Array(buf), {
      headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
