import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which required settings are present. Names only, never values. */
export async function GET() {
  const checks = {
    MODEL_API_KEY: Boolean(process.env.MODEL_API_KEY),
    VISIT_SECRET: Boolean(process.env.VISIT_SECRET),
    BLOB_READ_WRITE_TOKEN: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  };
  const missing = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  return NextResponse.json({ ok: missing.length === 0, missing, checks }, { status: missing.length ? 503 : 200 });
}
