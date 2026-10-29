import { NextResponse } from "next/server";
import { db, id, milestonesFor, projectByToken, visitCode } from "@/lib/db";

export const runtime = "nodejs";

const CODE_TTL_MS = 30 * 60 * 1000;

/** Start a visit: issue a one-time code the foreman must show on camera. */
export async function POST(req: Request) {
  const { token, milestoneId } = (await req.json().catch(() => ({}))) as { token?: string; milestoneId?: string };
  const project = token ? projectByToken(token) : undefined;
  if (!project) return NextResponse.json({ error: "Unknown capture link" }, { status: 404 });

  const milestone = milestonesFor(project.id).find((m) => m.id === milestoneId) ?? milestonesFor(project.id)[0];
  const visitId = id("vis");
  const code = visitCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  db()
    .prepare(
      "insert into visits (id, project_id, milestone_id, code, code_expires_at, status) values (?, ?, ?, ?, ?, 'awaiting_video')",
    )
    .run(visitId, project.id, milestone?.id ?? null, code, expiresAt);

  return NextResponse.json({ visitId, code, expiresAt });
}
