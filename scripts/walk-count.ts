/**
 * Count blocks along a wall walk: SAM image mode per keyframe, then merge.
 *
 *   npm run walk -- fixtures/fence-walk.540.mp4 [fps=2] ["concrete block"]
 *
 * Writes docs/evidence/walk/<stem>.json and a panorama SVG with every merged
 * block numbered.
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { segmentImage, type ImageSegmentation } from "../src/lib/meta/sam";
import { chainOffsets, estimateShift, mergeSightings, type Gray } from "../src/lib/verify/stitch";

const run = promisify(execFile);
const [file, fpsArg = "2", prompt = "concrete block"] = process.argv.slice(2);
if (!file || !ffmpegPath) {
  console.error('usage: npm run walk -- <video> [fps] ["prompt"]');
  process.exit(1);
}
const FPS = Number(fpsArg);
const SMALL_W = 135;
const CONCURRENCY = 8;

async function main() {
  const stem = basename(file, extname(file));
  const work = join("fixtures", `.${stem}-kf`);
  await rm(work, { recursive: true, force: true });
  await mkdir(work, { recursive: true });

  // Same fps filter for both outputs, so keyframe k matches gray frame k.
  await run(ffmpegPath!, ["-v", "error", "-i", file, "-vf", `fps=${FPS}`, "-q:v", "3", join(work, "kf_%04d.jpg")]);
  await run(ffmpegPath!, [
    "-v", "error", "-i", file,
    "-vf", `fps=${FPS},scale=${SMALL_W}:-2,format=gray`,
    "-f", "rawvideo", join(work, "gray.raw"),
  ]);

  const names = (await readdir(work)).filter((n) => n.endsWith(".jpg")).sort();
  const jpgs = await Promise.all(names.map((n) => readFile(join(work, n))));
  console.log(`${jpgs.length} keyframes at ${FPS} fps`);

  // SAM on every keyframe, a few at a time.
  const segs: ImageSegmentation[] = new Array(jpgs.length);
  let next = 0;
  const t0 = Date.now();
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < jpgs.length) {
        const i = next++;
        segs[i] = await segmentImage({ data: jpgs[i], mime: "image/jpeg" }, prompt);
        process.stdout.write(".");
      }
    }),
  );
  console.log(`\nSAM done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  const { width, height } = segs.find((s) => s.width > 0) ?? segs[0];
  const scale = width / SMALL_W;
  const smallH = Math.round(height / scale / 2) * 2;
  const raw = await readFile(join(work, "gray.raw"));
  const frameBytes = SMALL_W * smallH;
  const grays: Gray[] = names.map((_, k) => ({
    data: new Uint8Array(raw.buffer, raw.byteOffset + k * frameBytes, frameBytes),
    width: SMALL_W,
    height: smallH,
  }));

  const shifts = grays.slice(1).map((g, k) => estimateShift(grays[k], g));
  const offsets = chainOffsets(shifts, scale);
  const clusters = mergeSightings(
    segs.map((s, k) => ({ boxes: s.instances.map((i) => i.box), offset: offsets[k] })),
    { width, height },
  );

  const perFrame = segs.map((s) => s.instances.length);
  const once = clusters.filter((c) => c.sightings.length === 1).length;
  const summary = {
    file: basename(file),
    prompt,
    fps: FPS,
    keyframes: jpgs.length,
    frameSize: { width, height },
    uniqueBlocks: clusters.length,
    seenOnce: once,
    perFrame,
    shifts: shifts.map((s) => ({ dx: s.dx * scale, dy: s.dy * scale, score: +s.score.toFixed(1), overlap: +s.overlap.toFixed(2) })),
    worstShiftScore: Math.max(...shifts.map((s) => s.score)).toFixed(1),
  };

  const outDir = join("docs/evidence/walk");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, `${stem}.json`), JSON.stringify(summary, null, 2));
  await writeFile(join(outDir, `${stem}.svg`), panorama(jpgs, offsets, clusters, width, height));
  await rm(work, { recursive: true, force: true });

  console.log(JSON.stringify({ ...summary, perFrame: undefined, shifts: undefined }, null, 2));
}

function panorama(
  jpgs: Buffer[],
  offsets: { x: number; y: number }[],
  clusters: ReturnType<typeof mergeSightings>,
  w: number,
  h: number,
): string {
  const xs = offsets.map((o) => o.x);
  const ys = offsets.map((o) => o.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const W = Math.max(...xs) - minX + w;
  const H = Math.max(...ys) - minY + h;
  // Draw every 2nd keyframe to keep the file small; later frames on top.
  const images = jpgs
    .map((j, k) => (k % 2 === 0 || k === jpgs.length - 1
      ? `<image href="data:image/jpeg;base64,${j.toString("base64")}" x="${offsets[k].x - minX}" y="${offsets[k].y - minY}" width="${w}" height="${h}"/>`
      : ""))
    .join("\n");
  const marks = clusters
    .map((c) => {
      const color = c.sightings.length === 1 ? "#B7791F" : "#E8590C";
      const x = c.x - minX;
      const y = c.y - minY;
      return `<rect x="${x - c.w / 2}" y="${y - c.h / 2}" width="${c.w}" height="${c.h}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>` +
        `<text x="${x}" y="${y}" font-family="IBM Plex Mono, monospace" font-size="${Math.max(12, c.h / 3)}" text-anchor="middle" dominant-baseline="middle" fill="#fff">${c.id}</text>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n${images}\n${marks}\n</svg>`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
