/**
 * Build the home page's phone replay from a real visit: small copies of its
 * frames, SAM's boxes for each, and the running count of unique blocks. Needs
 * the visit counted locally first (`npm run replay -- <visitId> <frames>`); the
 * receipt numbers come from the report stored in production.
 *
 *   npm run showcase -- vis_77d1c43227e3 [baseUrl=https://plumbline-ruby.vercel.app]
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { stitchWalk, type FrameCount } from "../src/lib/pipeline/count";
import type { VisitResult } from "../src/lib/pipeline/visit";
import { jpegToGray } from "../src/lib/verify/gray";

const run = promisify(execFile);
const [visitId, base = "https://plumbline-ruby.vercel.app"] = process.argv.slice(2);
const STEP = 2; // every 2nd keyframe: 4 stills a second of walk at 8 fps playback = real time at 2x
const OUT_W = 270;

async function main() {
  if (!visitId || !ffmpegPath) throw new Error("usage: npm run showcase -- <visitId> [baseUrl]");
  const dir = join("data/visits", visitId);
  const names = (await readdir(join(dir, "sam"))).filter((n) => n.endsWith(".json")).sort();
  const counts = await Promise.all(names.map(async (n) => JSON.parse(await readFile(join(dir, "sam", n), "utf8")) as FrameCount));
  const jpgs = await Promise.all(names.map((n) => readFile(join(dir, "frames", n.replace(".json", ".jpg")))));
  const walk = stitchWalk(counts, jpgs.map((j) => jpegToGray(j)));

  // Running total of unique blocks: each block counts from the frame it was first seen in.
  const firstSeen = new Array(counts.length).fill(0);
  for (const c of walk.clusters) firstSeen[Math.min(...c.sightings.map((s) => s.frame))]++;
  let running = 0;
  const found = firstSeen.map((n) => (running += n));

  const res = await fetch(`${base}/api/visits/${visitId}`);
  if (!res.ok) throw new Error(`report ${visitId}: ${res.status}`);
  const report = (await res.json()) as VisitResult;

  const out = join("public/showcase");
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  const picked = counts.map((_, k) => k).filter((k) => k % STEP === 0 || k === counts.length - 1);
  const size = walk.frameSize; // frames with no blocks report no size; this is the walk's
  const scale = OUT_W / size.width;
  const frames = [];
  for (const [i, k] of picked.entries()) {
    const src = `${String(i).padStart(3, "0")}.jpg`;
    await run(ffmpegPath, ["-v", "error", "-y", "-i", join(dir, "frames", names[k].replace(".json", ".jpg")), "-vf", `scale=${OUT_W}:-2`, "-q:v", "7", join(out, src)]);
    frames.push({
      src,
      k,
      used: walk.used[k],
      found: found[k],
      boxes: walk.used[k]
        ? counts[k].boxes.map((b) => [b.left, b.top, b.right - b.left, b.bottom - b.top].map((v) => Math.round(v * scale)))
        : [],
    });
  }

  const showcase = {
    visitId,
    recordedAt: report.finishedAt,
    site: report.meta.site,
    milestone: report.meta.milestoneTitle,
    code: report.meta.code,
    codeRead: report.code.read,
    width: OUT_W,
    height: Math.round(size.height * scale),
    keyframes: report.keyframes,
    uploadedMB: +(report.uploadedBytes / 1e6).toFixed(1),
    confirmed: report.confirmed,
    review: report.review,
    target: report.meta.target,
    verdict: report.verdict,
    trancheNgn: report.meta.trancheNgn,
    frames,
  };
  await writeFile(join(out, "walk.json"), JSON.stringify(showcase));
  const bytes = (await Promise.all(frames.map((f) => readFile(join(out, f.src))))).reduce((a, b) => a + b.length, 0);
  console.log(`${frames.length} frames, ${(bytes / 1e6).toFixed(2)} MB, ${found.at(-1)} blocks found, report ${report.confirmed}/${report.review}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
