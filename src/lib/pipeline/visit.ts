import { segmentImage } from "../meta/sam";
import { getProject } from "../projects";
import { getObject, listObjects, putObject } from "../storage";
import type { Ticket } from "../ticket";
import { checkLocation, type GeoFix, type LocationCheck } from "../verify/geo";
import { jpegToGray } from "../verify/gray";
import { stitchWalk, withRetry, type FrameCount } from "./count";
import { checkVisitCode, type CodeCheck } from "./liveness";
import { compareWithLastVisit, writeSiteNotes, type SameSite, type SiteNotes } from "./site-notes";
import { decide, type Verdict } from "./verdict";

export const BLOCK_PROMPT = "concrete block";
export const MAX_FRAMES = 240; // 2 minutes at 2 frames a second
export const MAX_FRAME_BYTES = 1.5 * 1024 * 1024;

export type VisitMeta = Ticket & {
  projectName: string;
  site: string;
  owner: string;
  milestoneTitle: string;
  target: number;
  trancheNgn: number;
  kind: string;
  /** The project's link token, for the owner's page (older reports lack it). */
  projectToken?: string;
  sandbox?: boolean;
};

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
  /** Checks added after the first reports; older reports lack them. */
  location?: LocationCheck;
  sameSite?: SameSite;
  notes?: SiteNotes | null;
  verdict: Verdict;
};

/** One line per visit in the project's history, written once when the visit finishes. */
export type VisitSummary = {
  visitId: string;
  finishedAt: string;
  milestoneTitle: string;
  status: Verdict["status"];
  headline: string;
  confirmed: number;
  target: number;
  distanceM: number | null;
  /** A frame from the middle of the walk, for the next visit's same-site check. */
  refFrame: number;
};

const pad = (k: number) => String(k).padStart(4, "0");
export const framePath = (visitId: string, k: number) => `visits/${visitId}/frames/${pad(k)}.jpg`;
const samPath = (visitId: string, k: number) => `visits/${visitId}/sam/${pad(k)}.json`;
const resultPath = (visitId: string) => `visits/${visitId}/result.json`;
const metaPath = (visitId: string) => `visits/${visitId}/meta.json`;
const pinPath = (projectId: string) => `projects/${projectId}/pin.json`;
const historyPrefix = (projectId: string) => `projects/${projectId}/visits/`;

export async function saveMeta(ticket: Ticket): Promise<VisitMeta> {
  const project = (await getProject(ticket.projectId))!;
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
    projectToken: project.captureToken,
    sandbox: project.sandbox,
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

/** Every finished visit to a project, newest first. */
export async function projectHistory(projectId: string): Promise<VisitSummary[]> {
  const paths = await listObjects(historyPrefix(projectId));
  const rows = await Promise.all(
    paths.filter((p) => p.endsWith(".json")).map(async (p) => {
      const buf = await getObject(p);
      return buf ? (JSON.parse(buf.toString()) as VisitSummary) : null;
    }),
  );
  return rows.filter((r): r is VisitSummary => r !== null).sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
}

export async function sitePinned(projectId: string): Promise<boolean> {
  return (await getObject(pinPath(projectId))) !== null;
}

/** Up to `n` frames spread evenly over the ones that went into the count. */
function spread(used: boolean[], n: number): number[] {
  const ks = used.flatMap((u, k) => (u ? [k] : []));
  if (ks.length <= n) return ks;
  return Array.from({ length: n }, (_, i) => ks[Math.round(((i + 0.5) * ks.length) / n - 0.5)]);
}

/**
 * Stitch, check the code, place the visit, write site notes, decide. Reads
 * frames and counts back from storage, never from the phone, so a tampered
 * client can't inflate the count. The GPS fix does come from the phone; the
 * report says so.
 */
export async function finishVisit(ticket: Ticket, fix: GeoFix | null = null): Promise<VisitResult> {
  const done = await getResult(ticket.visitId);
  if (done) return done;

  const paths = (await listObjects(`visits/${ticket.visitId}/sam/`)).filter((p) => p.endsWith(".json")).sort();
  if (paths.length < 4) throw new Error("Too few frames: record at least 3 seconds of wall");

  const counts = await Promise.all(paths.map(async (p) => JSON.parse((await getObject(p))!.toString()) as FrameCount));
  counts.sort((a, b) => a.k - b.k);
  const jpgs = await Promise.all(counts.map(async (c) => (await getObject(framePath(ticket.visitId, c.k)))!));

  const codeCheck = checkVisitCode(jpgs.slice(0, 6), ticket.code);
  const walk = stitchWalk(counts, jpgs.map((j) => jpegToGray(j)));
  const noteFrames = spread(walk.used, 4);
  const refFrame = noteFrames[Math.floor(noteFrames.length / 2)] ?? Math.floor(counts.length / 2);

  const metaBuf = await getObject(metaPath(ticket.visitId));
  const meta = metaBuf ? (JSON.parse(metaBuf.toString()) as VisitMeta) : await saveMeta(ticket);
  const [pinBuf, history] = await Promise.all([getObject(pinPath(ticket.projectId)), projectHistory(ticket.projectId)]);
  const pin = pinBuf ? (JSON.parse(pinBuf.toString()) as GeoFix) : null;
  const last = history[0];
  const lastJpg = last ? await getObject(framePath(last.visitId, last.refFrame)) : null;

  const [code, notes, sameSite] = await Promise.all([
    codeCheck,
    writeSiteNotes(noteFrames.map((k) => ({ k, jpg: jpgs[k] }))),
    compareWithLastVisit(last && lastJpg ? { visitId: last.visitId, jpg: lastJpg } : null, jpgs[refFrame]),
  ]);
  let location = checkLocation(fix, pin);
  if (location.status === "pinned" && code.status === "failed") {
    location = { ...location, status: "review", note: "Not pinned: a visit without a readable code can't set the site pin" };
  }

  const holds: string[] = [];
  if (location.status === "review" || location.status === "missing") holds.push(location.note);
  if (sameSite.status === "different") holds.push(`Doesn't look like the site from the last visit: ${sameSite.note}`);

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
    location,
    sameSite,
    notes,
    verdict: decide(code, walk.confirmed, walk.review, meta.target, holds),
  };
  await putObject(resultPath(ticket.visitId), JSON.stringify(result), "application/json");

  // The site pin is set once, by the first visit with a precise fix and a readable code.
  if (location.status === "pinned" && fix && code.status !== "failed") {
    await putObject(pinPath(ticket.projectId), JSON.stringify(fix), "application/json").catch(() => {});
  }
  const summary: VisitSummary = {
    visitId: result.visitId,
    finishedAt: result.finishedAt,
    milestoneTitle: meta.milestoneTitle,
    status: result.verdict.status,
    headline: result.verdict.headline,
    confirmed: result.confirmed,
    target: meta.target,
    distanceM: location.distanceM,
    refFrame,
  };
  await putObject(`${historyPrefix(ticket.projectId)}${result.visitId}.json`, JSON.stringify(summary), "application/json");
  return result;
}
