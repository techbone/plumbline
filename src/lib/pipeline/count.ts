import { segmentImage, type ImageSegmentation } from "../meta/sam";
import { chainOffsets, estimateShift, mergeSightings, type Cluster, type Gray } from "../verify/stitch";

export type WalkCount = {
  frameSize: { width: number; height: number };
  perFrame: number[];
  offsets: { x: number; y: number }[];
  clusters: Cluster[];
  confirmed: number;
  review: number;
};

/** SAM image mode on every keyframe, a few at a time, in order of completion. */
export async function segmentFrames(
  jpgs: Buffer[],
  prompt: string,
  onFrame: (done: number, index: number, seg: ImageSegmentation) => void,
  concurrency = 8,
): Promise<ImageSegmentation[]> {
  const segs: ImageSegmentation[] = new Array(jpgs.length);
  let next = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, jpgs.length) }, async () => {
      while (next < jpgs.length) {
        const i = next++;
        segs[i] = await withRetry(() => segmentImage({ data: jpgs[i], mime: "image/jpeg" }, prompt));
        onFrame(++done, i, segs[i]);
      }
    }),
  );
  return segs;
}

export function stitchWalk(segs: ImageSegmentation[], grays: Gray[]): WalkCount {
  const ref = segs.find((s) => s.width > 0) ?? segs[0];
  const frameSize = { width: ref.width, height: ref.height };
  const scale = frameSize.width / grays[0].width;
  const shifts = grays.slice(1).map((g, k) => estimateShift(grays[k], g));
  const offsets = chainOffsets(shifts, scale);
  const clusters = mergeSightings(
    segs.map((s, k) => ({ boxes: s.instances.map((i) => i.box), offset: offsets[k] })),
    frameSize,
  );
  const confirmed = clusters.filter((c) => c.sightings.length >= 2).length;
  return {
    frameSize,
    perFrame: segs.map((s) => s.instances.length),
    offsets,
    clusters,
    confirmed,
    review: clusters.length - confirmed,
  };
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
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
