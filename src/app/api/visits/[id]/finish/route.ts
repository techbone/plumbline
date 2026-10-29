import { NextResponse } from "next/server";
import { finishVisit } from "@/lib/pipeline/visit";
import { readTicket } from "@/lib/ticket";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Stitch the walk, read the visit code, and write the report. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = readTicket(req.headers.get("x-visit-ticket"), id);
  if (!ticket) return NextResponse.json({ error: "Invalid visit ticket" }, { status: 401 });
  try {
    return NextResponse.json(await finishVisit(ticket));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't finish the visit" }, { status: 422 });
  }
}
