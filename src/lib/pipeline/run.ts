import { stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { db, getVisit, milestonesFor, setStep, visitDir } from "../db";
import { segmentFrames, stitchWalk } from "./count";
import { extractKeyframes } from "./frames";
import { checkVisitCode, type CodeCheck } from "./liveness";

export const BLOCK_PROMPT = "concrete block";
const KEYFRAME_FPS = 2;

export type VisitResult = {
  durationS: number;
  keyframes: number;
  frameSize: { width: number; height: number };
  offsets: { x: number; y: number }[];
  blocks: { id: number; x: number; y: number; w: number; h: number; seen: number }[];
  confirmed: number;
  review: number;
  code: CodeCheck;
  verdict: { status: "verified" | "short" | "review" | "not_verified"; headline: string; reasons: string[] };
};

const running = new Set<string>();

/** Run the verification pipeline for a visit. Each step writes its own row. */
export async function runVisit(visitId: string): Promise<void> {
  if (running.has(visitId)) return;
  running.add(visitId);
  try {
    await pipeline(visitId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db().prepare("update visits set status = 'failed' where id = ?").run(visitId);
    setStep(visitId, "verdict", "failed", { error: message });
    console.error(`[visit ${visitId}]`, err);
  } finally {
    running.delete(visitId);
  }
}

async function pipeline(visitId: string) {
  const visit = getVisit(visitId);
  if (!visit?.video_path) throw new Error("visit has no video");
  const dir = visitDir(visitId);

  const size = (await stat(visit.video_path)).size;
  setStep(visitId, "received", "passed", { bytes: size });

  setStep(visitId, "frames", "running");
  const kf = await extractKeyframes(visit.video_path, join(dir, "frames"), KEYFRAME_FPS);
  if (kf.jpgs.length < 4) throw new Error("Video is too short: record at least 3 seconds");
  setStep(visitId, "frames", "passed", { count: kf.jpgs.length, durationS: kf.durationS, fps: KEYFRAME_FPS });

  // The code check and the block count are independent; run them side by side.
  setStep(visitId, "code", "running");
  setStep(visitId, "count", "running", { done: 0, total: kf.jpgs.length });

  const codePromise = checkVisitCode(kf.jpgs.slice(0, 6), visit.code).then((c) => {
    setStep(visitId, "code", c.status, c);
    return c;
  });

  const segs = await segmentFrames(kf.jpgs, BLOCK_PROMPT, (done, index, seg) => {
    setStep(visitId, "count", "running", { done, total: kf.jpgs.length, last: index, lastCount: seg.instances.length });
  });
  setStep(visitId, "count", "passed", {
    done: segs.length,
    total: segs.length,
    sightings: segs.reduce((a, s) => a + s.instances.length, 0),
  });

  setStep(visitId, "stitch", "running");
  const walk = stitchWalk(segs, kf.grays);
  setStep(visitId, "stitch", walk.review > walk.confirmed * 0.15 ? "review" : "passed", {
    unique: walk.clusters.length,
    confirmed: walk.confirmed,
    review: walk.review,
  });

  const code = await codePromise;
  const milestone = visit.milestone_id
    ? milestonesFor(visit.project_id).find((m) => m.id === visit.milestone_id)
    : undefined;
  const verdict = decide(code, walk.confirmed, walk.review, milestone?.target);

  const result: VisitResult = {
    durationS: kf.durationS,
    keyframes: kf.jpgs.length,
    frameSize: walk.frameSize,
    offsets: walk.offsets,
    blocks: walk.clusters.map((c) => ({
      id: c.id,
      x: Math.round(c.x),
      y: Math.round(c.y),
      w: Math.round(c.w),
      h: Math.round(c.h),
      seen: c.sightings.length,
    })),
    confirmed: walk.confirmed,
    review: walk.review,
    code,
    verdict,
  };
  await writeFile(join(dir, "result.json"), JSON.stringify(result));
  db().prepare("update visits set status = 'done', result_json = ? where id = ?").run(JSON.stringify(result), visitId);
  setStep(visitId, "verdict", verdict.status === "verified" ? "passed" : verdict.status === "not_verified" ? "failed" : "review", verdict);
}

/** The release rule. Pure, so it's easy to test and to explain in the report. */
export function decide(code: CodeCheck, confirmed: number, review: number, target?: number): VisitResult["verdict"] {
  const reasons: string[] = [];
  if (code.status === "failed") {
    reasons.push(code.note);
    return { status: "not_verified", headline: "Not verified: the visit code wasn't on camera", reasons };
  }
  if (code.status === "review") reasons.push(code.note);
  if (target === undefined) {
    return { status: code.status === "passed" ? "verified" : "review", headline: `At least ${confirmed} blocks counted`, reasons };
  }
  if (confirmed >= target) {
    return {
      status: code.status === "passed" ? "verified" : "review",
      headline: `${confirmed} of ${target} blocks confirmed`,
      reasons,
    };
  }
  if (confirmed + review >= target) {
    reasons.push(`${review} blocks were seen in only one frame; a person should check them`);
    return { status: "review", headline: `${confirmed} confirmed, ${review} to check, target ${target}`, reasons };
  }
  reasons.push(`${target - confirmed - review} blocks short of the milestone`);
  return { status: "short", headline: `Short: ${confirmed} of ${target} blocks`, reasons };
}
