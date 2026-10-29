import { NextResponse } from "next/server";
import { saveMeta } from "@/lib/pipeline/visit";
import { projectByToken } from "@/lib/projects";
import { issueTicket } from "@/lib/ticket";

export const runtime = "nodejs";

/** Start a visit: issue a signed ticket with a one-time code the foreman must show on camera. */
export async function POST(req: Request) {
  const { token, milestoneId } = (await req.json().catch(() => ({}))) as { token?: string; milestoneId?: string };
  const project = token ? projectByToken(token) : undefined;
  if (!project) return NextResponse.json({ error: "Unknown capture link" }, { status: 404 });

  const milestone = project.milestones.find((m) => m.id === milestoneId) ?? project.milestones[0];
  const { ticket, data } = issueTicket(project.id, milestone.id);
  await saveMeta(data);

  return NextResponse.json({
    visitId: data.visitId,
    code: data.code,
    expiresAt: new Date(data.expiresAt).toISOString(),
    ticket,
  });
}
