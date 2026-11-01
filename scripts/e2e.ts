/**
 * Headless end-to-end run through the same HTTP API the phone uses.
 *
 *   npm run e2e -- fixtures/fence-walk.540.mp4 [baseUrl=http://localhost:3100] [token=demo] [milestone=ms_fence]
 *
 * Cuts frames from a video (2 per second, shortest side 540), sends each to the
 * server as the phone would, then asks for the verdict. Writes the report to
 * docs/evidence/e2e/. Set E2E_LOCATION=lat,lng,accuracy to send a GPS fix the
 * way the phone does; without it the visit has no location and is held.
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);
const [file, base = "http://localhost:3100", token = "demo", milestoneId = "ms_fence"] = process.argv.slice(2);
if (!file || !ffmpegPath) {
  console.error("usage: npm run e2e -- <video> [baseUrl] [token] [milestoneId]");
  process.exit(1);
}

async function main() {
  const t0 = Date.now();
  const start = await fetch(`${base}/api/visits`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, milestoneId }),
  });
  const visit = (await start.json()) as { visitId: string; code: string; ticket: string };
  if (!start.ok) throw new Error(`start failed: ${JSON.stringify(visit)}`);
  console.log(`visit ${visit.visitId}  code ${visit.code}`);

  const work = join("fixtures", `.e2e-${visit.visitId}`);
  await mkdir(work, { recursive: true });
  await run(ffmpegPath!, [
    "-v", "error", "-i", file,
    "-vf", "fps=2,scale=540:540:force_original_aspect_ratio=increase",
    "-q:v", "4", join(work, "f_%04d.jpg"),
  ]);
  const names = (await readdir(work)).filter((n) => n.endsWith(".jpg")).sort();
  const jpgs = await Promise.all(names.map((n) => readFile(join(work, n))));
  await rm(work, { recursive: true, force: true });
  const bytes = jpgs.reduce((a, j) => a + j.length, 0);
  console.log(`${jpgs.length} frames, ${(bytes / 1e6).toFixed(1)} MB (the video is ${((await readFile(file)).length / 1e6).toFixed(1)} MB)`);

  let next = 0;
  let done = 0;
  const counts: number[] = [];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < jpgs.length) {
        const k = next++;
        const res = await fetch(`${base}/api/visits/${visit.visitId}/frames/${k}`, {
          method: "PUT",
          headers: { "content-type": "image/jpeg", "x-visit-ticket": visit.ticket },
          body: new Uint8Array(jpgs[k]),
        });
        const body = (await res.json()) as { blocks?: number; error?: string };
        if (!res.ok) throw new Error(`frame ${k}: ${res.status} ${body.error}`);
        counts[k] = body.blocks ?? 0;
        process.stdout.write(`\r  counted ${++done}/${jpgs.length}`);
      }
    }),
  );
  console.log();

  const [lat, lng, accuracy] = (process.env.E2E_LOCATION ?? "").split(",").map(Number);
  const location = Number.isFinite(accuracy) ? { lat, lng, accuracy } : null;
  const fin = await fetch(`${base}/api/visits/${visit.visitId}/finish`, {
    method: "POST",
    headers: { "x-visit-ticket": visit.ticket, "content-type": "application/json" },
    body: JSON.stringify({ location }),
  });
  const result = await fin.json();
  if (!fin.ok) throw new Error(`finish failed: ${JSON.stringify(result)}`);

  const outDir = join("docs/evidence/e2e");
  await mkdir(outDir, { recursive: true });
  // The evidence keeps the block count, not the per-block list or the frame offsets.
  const summary = Object.fromEntries(Object.entries(result).filter(([k]) => k !== "blocks" && k !== "offsets"));
  await writeFile(join(outDir, `${basename(file, extname(file))}.json`), JSON.stringify({ ...summary, blockCount: result.blocks.length, seconds: (Date.now() - t0) / 1000 }, null, 2));

  console.log(JSON.stringify({
    verdict: result.verdict,
    confirmed: result.confirmed,
    review: result.review,
    code: result.code,
    location: result.location,
    sameSite: result.sameSite,
    notes: result.notes,
    uploadedMB: +(result.uploadedBytes / 1e6).toFixed(1),
    seconds: +((Date.now() - t0) / 1000).toFixed(0),
  }, null, 2));
  console.log(`report: ${base}/r/${visit.visitId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
