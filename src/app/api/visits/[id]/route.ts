import { NextResponse } from "next/server";
import { STEPS, getVisit, stepsFor } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visit = getVisit(id);
  if (!visit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = new Map(stepsFor(id).map((s) => [s.name, s]));
  const steps = STEPS.map(({ name, label }) => {
    const row = rows.get(name);
    return {
      name,
      label,
      status: row?.status ?? "pending",
      detail: row?.detail ? JSON.parse(row.detail) : null,
      startedAt: row?.started_at ?? null,
      finishedAt: row?.finished_at ?? null,
    };
  });

  return NextResponse.json({
    id: visit.id,
    status: visit.status,
    code: visit.code,
    codeExpiresAt: visit.code_expires_at,
    submittedAt: visit.submitted_at,
    steps,
    result: visit.result_json ? JSON.parse(visit.result_json) : null,
  });
}
