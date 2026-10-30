import { segmentImage } from "../meta/sam";
import { projectById } from "../projects";
import { getObject, listObjects, putObject } from "../storage";
import type { Ticket } from "../ticket";
import { jpegToGray } from "../verify/gray";
import { stitchWalk, withRetry, type FrameCount } from "./count";
import { checkVisitCode, type CodeCheck } from "./liveness";
import { decide, type Verdict } from "./verdict";

export const BLOCK_PROMPT = "concrete block";
export const MAX_FRAMES = 240; // 2 minutes at 2 frames a second
export const MAX_FRAME_BYTES = 1.5 * 1024 * 1024;

export type VisitMeta = Ticket & { projectName: string; site: string; owner: string; milestoneTitle: string; target: number; trancheNgn: number; kind: string };

export type VisitResult = {
  visitId: string;
  finishedAt: string;
  meta: VisitMeta;
  keyframes: number;
  /** Frames at walking distance that went into the count (older reports lack it). */
  framesUsed?: number;
  uploadedBytes: number;
  frameSize: { width: number; height: number };
  offsets: { x: number; y: number }[];
  perFrame: number[];
  blocks: { id: number; x: number; y: number; w: number; h: number; seen: number }[];
  confirmed: number;
  review: number;
  code: CodeCheck;
  verdict: Verdict;
};

const pad = (k: number) => String(k).padStart(4, "0");
export const framePath = (visitId: string, k: number) => `visits/${visitId}/frames/${pad(k)}.jpg`;
const samPath = (visitId: string, k: number) => `visits/${visitId}/sam/${pad(k)}.json`;
const resultPath = (visitId: string) => `visits/${visitId}/result.json`;
const metaPath = (visitId: string) => `visits/${visitId}/meta.json`;

export async function saveMeta(ticket: Ticket): Promise<VisitMeta> {
  const project = projectById(ticket.projectId)!;
  const m = project.milestones.find((x) => x.id === ticket.milestoneId)!;
  const meta: VisitMeta = {
    ...ticket,
    projectName: project.name,
    site: project.site,
    owner: project.owner,
    milestoneTitle: m.title,
    target: m.target,
    trancheNgn: m.trancheNgn,
    kind: m.kind,
  };
  await putObject(metaPath(ticket.visitId), JSON.stringify(meta), "application/json");
  return meta;
}

/** Store one keyframe and count its blocks with SAM 3.1. */
export async function countFrame(visitId: string, k: number, jpg: Buffer): Promise<FrameCount> {
  const existing = await getObject(samPath(visitId, k));
  if (existing) return JSON.parse(existing.toString()) as FrameCount;

  await putObject(framePath(visitId, k), jpg, "image/jpeg");
  const seg = await withRetry(() => segmentImage({ data: jpg, mime: "image/jpeg" }, BLOCK_PROMPT));
  const count: FrameCount = { k, width: seg.width, height: seg.height, boxes: seg.instances.map((i) => i.box), ms: seg.ms };
  await putObject(samPath(visitId, k), JSON.stringify(count), "application/json");
  return count;
}

export async function getResult(visitId: string): Promise<VisitResult | null> {
  const buf = await getObject(resultPath(visitId));
  return buf ? (JSON.parse(buf.toString()) as VisitResult) : null;
}

/**
 * Stitch, check the code, decide. Reads frames and counts back from storage,
 * never from the phone, so a tampered client can't inflate the count.
 */
export async function finishVisit(ticket: Ticket): Promise<VisitResult> {
  const done = await getResult(ticket.visitId);
  if (done) return done;

  const paths = (await listObjects(`visits/${ticket.visitId}/sam/`)).filter((p) => p.endsWith(".json")).sort();
  if (paths.length < 4) throw new Error("Too few frames: record at least 3 seconds of wall");

  const counts = await Promise.all(paths.map(async (p) => JSON.parse((await getObject(p))!.toString()) as FrameCount));
  counts.sort((a, b) => a.k - b.k);
  const jpgs = await Promise.all(counts.map(async (c) => (await getObject(framePath(ticket.visitId, c.k)))!));

  const [code, walk] = await Promise.all([
    checkVisitCode(jpgs.slice(0, 6), ticket.code),
    Promise.resolve().then(() => stitchWalk(counts, jpgs.map((j) => jpegToGray(j)))),
  ]);

  const metaBuf = await getObject(metaPath(ticket.visitId));
  const meta = metaBuf ? (JSON.parse(metaBuf.toString()) as VisitMeta) : await saveMeta(ticket);

  const result: VisitResult = {
    visitId: ticket.visitId,
    finishedAt: new Date().toISOString(),
    meta,
    keyframes: counts.length,
    framesUsed: walk.used.filter(Boolean).length,
    uploadedBytes: jpgs.reduce((a, j) => a + j.length, 0),
    frameSize: walk.frameSize,
    offsets: walk.offsets.map((o) => ({ x: Math.round(o.x), y: Math.round(o.y) })),
    perFrame: walk.perFrame,
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
    verdict: decide(code, walk.confirmed, walk.review, meta.target),
  };
  await putObject(resultPath(ticket.visitId), JSON.stringify(result), "application/json");
  return result;
}
