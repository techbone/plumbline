import { NextResponse } from "next/server";
import { getResult } from "@/lib/pipeline/visit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The finished report for a visit, as the owner sees it. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^vis_[0-9a-f]{12}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await getResult(id);
  if (!result) return NextResponse.json({ status: "pending" }, { status: 404 });
  return NextResponse.json(result);
}
