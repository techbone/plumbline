import { strict as assert } from "node:assert";
import { test } from "node:test";
import { chainOffsets, estimateShift, mergeSightings, type Gray } from "./stitch";

function texture(w: number, h: number, seed = 7): Uint8Array {
  const out = new Uint8Array(w * h);
  let s = seed;
  for (let i = 0; i < out.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out[i] = s & 0xff;
  }
  return out;
}

function crop(src: Uint8Array, srcW: number, x: number, y: number, w: number, h: number): Gray {
  const data = new Uint8Array(w * h);
  for (let r = 0; r < h; r++) data.set(src.subarray((y + r) * srcW + x, (y + r) * srcW + x + w), r * w);
  return { data, width: w, height: h };
}

test("recovers a sideways slide between two crops of one texture", () => {
  const big = texture(300, 120);
  const a = crop(big, 300, 10, 10, 100, 80);
  const b = crop(big, 300, 47, 13, 100, 80); // camera moved right 37, down 3
  const s = estimateShift(a, b, { step: 1 });
  assert.equal(s.dx, 37);
  assert.equal(s.dy, 3);
  assert.equal(s.score, 0);
});

test("a block seen in two frames counts once; cut-off edge boxes are ignored", () => {
  const size = { width: 500, height: 800 };
  const offsets = chainOffsets([{ dx: 50, dy: 0 }], 4); // frame 1 sits 200 px right of frame 0
  const clusters = mergeSightings(
    [
      {
        offset: offsets[0],
        boxes: [
          { left: 250, top: 100, right: 350, bottom: 150 }, // block A
          { left: 480, top: 100, right: 500, bottom: 150 }, // cut off at the right edge
        ],
      },
      {
        offset: offsets[1],
        boxes: [
          { left: 52, top: 102, right: 150, bottom: 152 }, // block A again
          { left: 300, top: 100, right: 400, bottom: 150 }, // block B
        ],
      },
    ],
    size,
  );
  assert.equal(clusters.length, 2);
  assert.equal(clusters[0].sightings.length, 2);
});

test("two blocks in the same frame never merge, however close", () => {
  const clusters = mergeSightings(
    [{ offset: { x: 0, y: 0 }, boxes: [
      { left: 100, top: 100, right: 200, bottom: 150 },
      { left: 140, top: 110, right: 240, bottom: 160 },
    ] }],
    { width: 500, height: 800 },
  );
  assert.equal(clusters.length, 2);
});
