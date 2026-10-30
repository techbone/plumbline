/**
 * Count blocks along a walkthrough without SAM video tracking.
 *
 * SAM video tracks at most 16 objects per frame, so a wall walk is counted from
 * keyframes instead: SAM image mode finds the blocks in each keyframe, we
 * measure how far the wall slid between neighbouring keyframes, place every
 * block in one shared wall coordinate system, and merge sightings of the same
 * block. Walking parallel to a flat wall makes that slide close to a pure
 * translation.
 */

export type Gray = { data: Uint8Array; width: number; height: number };
export type Shift = { dx: number; dy: number; score: number; overlap: number };
export type Box = { left: number; top: number; right: number; bottom: number };

/**
 * Translation (dx, dy) such that b(x, y) ≈ a(x + dx, y + dy): a point at x in
 * frame b sits at x + dx in frame a. Brute-force mean absolute difference over
 * the overlap; frames are small (about 135 x 240), so this stays fast.
 */
export function estimateShift(
  a: Gray,
  b: Gray,
  opts: { maxDx?: number; maxDy?: number; minOverlap?: number; step?: number } = {},
): Shift {
  const { width: w, height: h } = a;
  const maxDx = opts.maxDx ?? Math.floor(w * 0.6);
  const maxDy = opts.maxDy ?? Math.floor(h * 0.06);
  const minOverlap = opts.minOverlap ?? 0.35;
  const step = opts.step ?? 2;

  let best: Shift = { dx: 0, dy: 0, score: Infinity, overlap: 0 };
  for (let dy = -maxDy; dy <= maxDy; dy++) {
    for (let dx = -maxDx; dx <= maxDx; dx++) {
      const x0 = Math.max(0, -dx);
      const x1 = Math.min(w, w - dx);
      const y0 = Math.max(0, -dy);
      const y1 = Math.min(h, h - dy);
      const ow = x1 - x0;
      const oh = y1 - y0;
      if (ow < w * minOverlap || oh < h * minOverlap) continue;

      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y += step) {
        const rowA = (y + dy) * w + dx;
        const rowB = y * w;
        for (let x = x0; x < x1; x += step) {
          sum += Math.abs(a.data[rowA + x] - b.data[rowB + x]);
          n++;
        }
      }
      const score = sum / n;
      if (score < best.score) best = { dx, dy, score, overlap: (ow * oh) / (w * h) };
    }
  }
  return best;
}

export type Sighting = { frame: number; x: number; y: number; w: number; h: number };
export type Cluster = { id: number; x: number; y: number; w: number; h: number; sightings: Sighting[] };

/**
 * Merge per-frame block boxes into unique blocks.
 *
 * `offsets[k]` places frame k in wall coordinates (same pixel scale as the
 * boxes). Boxes touching the frame's side margins are dropped: a cut-off block
 * will be seen whole in a neighbouring frame, and counting both halves is the
 * classic double count.
 */
export function mergeSightings(
  frames: { boxes: Box[]; offset: { x: number; y: number } }[],
  frameSize: { width: number; height: number },
  opts: { sideMargin?: number; matchFraction?: number } = {},
): Cluster[] {
  const sideMargin = (opts.sideMargin ?? 0.03) * frameSize.width;
  const matchFraction = opts.matchFraction ?? 0.5;
  const clusters: Cluster[] = [];

  frames.forEach(({ boxes, offset }, frame) => {
    for (const b of boxes) {
      if (b.left < sideMargin || b.right > frameSize.width - sideMargin) continue;
      const s: Sighting = {
        frame,
        x: offset.x + (b.left + b.right) / 2,
        y: offset.y + (b.top + b.bottom) / 2,
        w: b.right - b.left,
        h: b.bottom - b.top,
      };
      const match = clusters.find(
        (c) =>
          Math.abs(c.x - s.x) < c.w * matchFraction &&
          Math.abs(c.y - s.y) < c.h * matchFraction &&
          !c.sightings.some((o) => o.frame === frame),
      );
      if (match) {
        match.sightings.push(s);
        const n = match.sightings.length;
        match.x += (s.x - match.x) / n;
        match.y += (s.y - match.y) / n;
        match.w += (s.w - match.w) / n;
        match.h += (s.h - match.h) / n;
      } else {
        clusters.push({ id: clusters.length + 1, x: s.x, y: s.y, w: s.w, h: s.h, sightings: [s] });
      }
    }
  });
  return clusters;
}

/**
 * Which frames sit at walking distance. The walk is stitched as a pure slide, so
 * frames taken while stepping back from the code block (blocks drawn bigger)
 * would land at the wrong scale and count the same blocks twice. A frame is kept
 * when its median block height is within `tolerance` of the walk's typical one.
 */
export function steadyFrames(boxesPerFrame: Box[][], tolerance = 1.35): boolean[] {
  const medians = boxesPerFrame.map((boxes) => median(boxes.map((b) => b.bottom - b.top)));
  const typical = median(medians.filter((m) => m > 0));
  return medians.map((m) => m > 0 && m <= typical * tolerance && m >= typical / tolerance);
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Chain pairwise shifts into absolute offsets (frame 0 at the origin). */
export function chainOffsets(shifts: { dx: number; dy: number }[], scale = 1): { x: number; y: number }[] {
  const out = [{ x: 0, y: 0 }];
  for (const s of shifts) {
    const prev = out[out.length - 1];
    out.push({ x: prev.x + s.dx * scale, y: prev.y + s.dy * scale });
  }
  return out;
}
