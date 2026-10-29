import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { NextResponse } from "next/server";
import { db, getVisit, setStep, visitDir } from "@/lib/db";
import { runVisit } from "@/lib/pipeline/run";

export const runtime = "nodejs";

const MAX_BYTES = 400 * 1024 * 1024;
const EXT: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };

/** Raw video body, streamed to disk, then the pipeline starts in the background. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visit = getVisit(id);
  if (!visit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (visit.status !== "awaiting_video") return NextResponse.json({ error: "This visit already has a video" }, { status: 409 });
  if (Date.parse(visit.code_expires_at) < Date.now()) {
    return NextResponse.json({ error: "This visit code expired. Start a new visit." }, { status: 410 });
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return NextResponse.json({ error: "Video is larger than 400 MB" }, { status: 413 });
  }
  if (!req.body) return NextResponse.json({ error: "Empty upload" }, { status: 400 });

  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim();
  const path = join(visitDir(id), `walk.${EXT[type] ?? "mp4"}`);
  await pipeline(Readable.fromWeb(req.body as unknown as WebReadableStream), createWriteStream(path));

  db()
    .prepare("update visits set status = 'processing', video_path = ?, submitted_at = ? where id = ?")
    .run(path, new Date().toISOString(), id);
  setStep(id, "received", "running");
  void runVisit(id);

  return NextResponse.json({ ok: true });
}
