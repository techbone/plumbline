import { chainOffsets, estimateShift, mergeSightings, type Box, type Cluster, type Gray } from "../verify/stitch";

export type FrameCount = {
  k: number;
  width: number;
  height: number;
  boxes: Box[];
  ms: number;
};

export type WalkCount = {
  frameSize: { width: number; height: number };
  perFrame: number[];
  offsets: { x: number; y: number }[];
  clusters: Cluster[];
  confirmed: number;
  review: number;
};

/** Place every frame on one wall map and merge sightings of the same block. */
export function stitchWalk(frames: FrameCount[], grays: Gray[]): WalkCount {
  const ref = frames.find((f) => f.width > 0) ?? frames[0];
  const frameSize = { width: ref.width, height: ref.height };
  const scale = frameSize.width / grays[0].width;
  const shifts = grays.slice(1).map((g, k) => estimateShift(grays[k], g));
  const offsets = chainOffsets(shifts, scale);
  const clusters = mergeSightings(
    frames.map((f, k) => ({ boxes: f.boxes, offset: offsets[k] })),
    frameSize,
  );
  const confirmed = clusters.filter((c) => c.sightings.length >= 2).length;
  return {
    frameSize,
    perFrame: frames.map((f) => f.boxes.length),
    offsets,
    clusters,
    confirmed,
    review: clusters.length - confirmed,
  };
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let a = 0; a < attempts; a++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** a + Math.random() * 250));
    }
  }
  throw last;
}
