import { NextResponse } from "next/server";
import { createProject, parseNewProject } from "@/lib/projects";

export const runtime = "nodejs";

/** Make a test site from the /new form: one wall, one block target, one payment. */
export async function POST(req: Request) {
  const input = parseNewProject(await req.json().catch(() => null));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  try {
    const project = await createProject(input);
    return NextResponse.json({ token: project.captureToken });
  } catch (err) {
    console.error("[projects] create failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't create the site" }, { status: 500 });
  }
}
