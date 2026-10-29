import { metaClient } from "../meta/client";

export const SPARK_MODEL = "muse-spark-1.3";

export type CodeCheck = {
  status: "passed" | "review" | "failed";
  read: string | null;
  frame: number | null;
  matched: number;
  note: string;
};

/**
 * Read the visit code off the opening frames. The model is never told the
 * expected code: it reads blind, and we compare. Telling it would invite a
 * polite "yes, I see K74Q".
 */
export async function checkVisitCode(frames: Buffer[], expected: string): Promise<CodeCheck> {
  const content = [
    {
      type: "input_text" as const,
      text:
        "These are the first frames of a phone video filmed at a building site, in order (frame 0 first). " +
        "Somewhere near the start, a short code of 4 letters/digits has been written on a block, a wall, or a piece of paper " +
        "(chalk, marker, or print) and shown to the camera. Read it exactly. If no hand-written or printed code is visible, say so. " +
        'Reply with JSON only: {"found": boolean, "code": string | null, "frame": number | null}.',
    },
    ...frames.map((f) => ({
      type: "input_image" as const,
      detail: "high" as const,
      image_url: `data:image/jpeg;base64,${f.toString("base64")}`,
    })),
  ];

  const res = await metaClient().responses.create({
    model: SPARK_MODEL,
    input: [{ role: "user", content }],
  });

  const parsed = parseJson(res.output_text);
  const read = typeof parsed?.code === "string" ? normalise(parsed.code) : null;
  const frame = typeof parsed?.frame === "number" ? parsed.frame : null;
  const want = normalise(expected);
  const matched = read ? [...want].filter((ch, i) => read[i] === ch).length : 0;

  if (read === want) return { status: "passed", read, frame, matched, note: `Read "${read}" on frame ${frame ?? "?"}` };
  if (read && matched >= want.length - 1) {
    return { status: "review", read, frame, matched, note: `Read "${read}", expected "${want}": one character off` };
  }
  return {
    status: "failed",
    read,
    frame,
    matched,
    note: read ? `Read "${read}", expected "${want}"` : "No visit code visible in the opening frames",
  };
}

function normalise(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function parseJson(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}
