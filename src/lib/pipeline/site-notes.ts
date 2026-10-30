import { metaClient } from "../meta/client";
import { parseJson, SPARK_MODEL } from "./liveness";

export type SiteNotes = {
  stage: string;
  summary: string;
  observations: { text: string; frame: number | null }[];
};

export type SameSite = {
  status: "same" | "different" | "unclear" | "first";
  note: string;
  previousVisitId: string | null;
};

const image = (f: Buffer) => ({
  type: "input_image" as const,
  detail: "high" as const,
  image_url: `data:image/jpeg;base64,${f.toString("base64")}`,
});

/**
 * What an owner would want to know that a count can't say: the stage the work
 * is at, and anything visibly wrong. Muse Spark sees a few frames spread along
 * the walk. Notes inform the owner; they don't change the verdict.
 */
export async function writeSiteNotes(frames: { k: number; jpg: Buffer }[]): Promise<SiteNotes | null> {
  const content = [
    {
      type: "input_text" as const,
      text:
        "These frames are from a foreman's phone walk along a wall at a building site in Nigeria, sent to a homeowner who lives abroad. " +
        `The frame numbers are, in order: ${frames.map((f) => f.k).join(", ")}. ` +
        "Describe only what is visible. Do not count blocks and do not guess at anything you can't see. " +
        "Regular small openings near the base of a fence are usually drainage vents left on purpose; call them vents, not damage. " +
        "Reply with JSON only: " +
        '{"stage": "<one short phrase, e.g. sandcrete block wall, unplastered, about 9 courses>", ' +
        '"observations": [{"text": "<one specific thing the owner should know: a crack, missing or thin mortar, a leaning section, water damage, an unfinished gap, materials stacked on site>", "frame": <frame number>}], ' +
        '"summary": "<one or two plain sentences for the owner>"}. ' +
        "At most 4 observations; an empty list is fine if nothing stands out.",
    },
    ...frames.map((f) => image(f.jpg)),
  ];
  try {
    const res = await metaClient().responses.create({ model: SPARK_MODEL, input: [{ role: "user", content }] });
    const p = parseJson(res.output_text);
    if (!p || typeof p.stage !== "string" || typeof p.summary !== "string") return null;
    const known = new Set(frames.map((f) => f.k));
    const observations = (Array.isArray(p.observations) ? p.observations : [])
      .filter((o): o is { text: string; frame?: unknown } => typeof o?.text === "string")
      .slice(0, 4)
      .map((o) => ({ text: o.text, frame: typeof o.frame === "number" && known.has(o.frame) ? o.frame : null }));
    return { stage: p.stage, summary: p.summary, observations };
  } catch (err) {
    console.error("[site-notes]", err);
    return null;
  }
}

/**
 * Is this the same site as the last visit? Recycling an old video of someone
 * else's wall is the cheapest fake there is. Muse Spark compares one frame from
 * each visit on landmarks that don't change as the wall grows.
 */
export async function compareWithLastVisit(previous: { visitId: string; jpg: Buffer } | null, current: Buffer): Promise<SameSite> {
  if (!previous) return { status: "first", note: "First visit to this site, nothing to compare yet", previousVisitId: null };
  const content = [
    {
      type: "input_text" as const,
      text:
        "Image A is from an earlier visit to a building site, image B from today's visit. Are they the same site? " +
        "Compare things that don't change as building work progresses: buildings, poles, trees and hills in the background, the ground, " +
        "and the wall's own fixed features (pillars, vents, corners, stains). The wall may be taller, longer or plastered now; that alone is not a difference. " +
        'Reply with JSON only: {"same": "yes" | "no" | "unclear", "reason": "<one sentence naming the landmarks you compared>"}.',
    },
    image(previous.jpg),
    image(current),
  ];
  try {
    const res = await metaClient().responses.create({ model: SPARK_MODEL, input: [{ role: "user", content }] });
    const p = parseJson(res.output_text);
    const reason = typeof p?.reason === "string" ? p.reason : "No reason given";
    const status = p?.same === "yes" ? "same" : p?.same === "no" ? "different" : "unclear";
    return { status, note: reason, previousVisitId: previous.visitId };
  } catch (err) {
    console.error("[same-site]", err);
    return { status: "unclear", note: "Couldn't compare with the last visit", previousVisitId: previous.visitId };
  }
}
