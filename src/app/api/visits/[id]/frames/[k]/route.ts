import { NextResponse } from "next/server";
import { countFrame, framePath, MAX_FRAME_BYTES, MAX_FRAMES } from "@/lib/pipeline/visit";
import { getObject } from "@/lib/storage";
import { readTicket, UPLOAD_GRACE_MS, CODE_TTL_MS } from "@/lib/ticket";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string; k: string }> };

function frameIndex(k: string): number | null {
  const n = Number(k);
  return Number.isInteger(n) && n >= 0 && n < MAX_FRAMES ? n : null;
}

/** One keyframe from the phone: store it, count its blocks, return the count. */
export async function PUT(req: Request, { params }: Params) {
  const { id, k } = await params;
  const n = frameIndex(k);
  const ticket = readTicket(req.headers.get("x-visit-ticket"), id);
  if (!ticket) return NextResponse.json({ error: "Invalid visit ticket" }, { status: 401 });
  if (n === null) return NextResponse.json({ error: `At most ${MAX_FRAMES} frames per visit` }, { status: 400 });
  if (Date.now() > ticket.issuedAt + CODE_TTL_MS + UPLOAD_GRACE_MS) {
    return NextResponse.json({ error: "This visit expired. Start a new visit." }, { status: 410 });
  }

  const body = Buffer.from(await req.arrayBuffer());
  if (body.length === 0 || body.length > MAX_FRAME_BYTES) {
    return NextResponse.json({ error: "Frame must be a JPEG under 1.5 MB" }, { status: 413 });
  }
  if (body[0] !== 0xff || body[1] !== 0xd8) return NextResponse.json({ error: "Frame must be a JPEG" }, { status: 415 });

  const count = await countFrame(id, n, body);
  return NextResponse.json({ k: n, blocks: count.boxes.length, boxes: count.boxes, width: count.width, height: count.height });
}

export async function GET(_req: Request, { params }: Params) {
  const { id, k } = await params;
  const n = frameIndex(k);
  if (!/^vis_[0-9a-f]{12}$/.test(id) || n === null) return new Response("Not found", { status: 404 });
  const buf = await getObject(framePath(id, n));
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" },
  });
}
