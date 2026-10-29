/**
 * M2 spike: does SAM 3.1 video tracking keep identities on a walkthrough?
 *
 *   npm run spike:video -- path/to/walk.mov "concrete pillar" "concrete block"
 *
 * Transcodes to 720p H.264 with faststart (SAM needs MP4/MOV H.264, and 94 MB
 * phone clips are too heavy), uploads once, then tracks each prompt.
 */
import { execFile } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";
import { trackVideo, uploadVideo } from "../src/lib/meta/sam-video";

const run = promisify(execFile);
const [file, ...prompts] = process.argv.slice(2);
if (!file) {
  console.error('usage: npm run spike:video -- <video> ["prompt" ...]');
  process.exit(1);
}
if (prompts.length === 0) prompts.push("concrete pillar", "concrete block");

async function main() {
  const outDir = join("docs/evidence/spike");
  await mkdir(outDir, { recursive: true });
  const stem = basename(file, extname(file));
  let small = file;
  if (extname(file).toLowerCase() !== ".mp4") {
    const { default: ffmpegPath } = await import("ffmpeg-static");
    small = join("fixtures", `${stem}.720.mp4`);
    await run(ffmpegPath!, [
      "-y", "-i", file,
      "-vf", "scale=-2:1280", "-r", "30",
      "-c:v", "libx264", "-crf", "28", "-preset", "veryfast", "-an",
      "-movflags", "+faststart", small,
    ]);
  }
  console.log(`using ${small} (${((await stat(small)).size / 1e6).toFixed(1)} MB)`);

  const fileId = await uploadVideo(small);
  console.log(`uploaded → ${fileId}`);

  const results = [];
  for (const prompt of prompts) {
    console.log(`tracking "${prompt}" …`);
    const r = await trackVideo(fileId, prompt);
    results.push(r);
    console.log(
      `  ${r.tracks.length} tracks, peak ${r.peakPerFrame}/frame, ${r.framesSeen} frames, ${r.status}, ${(r.ms / 1000).toFixed(0)}s`,
    );
    for (const t of r.tracks.slice(0, 24)) {
      console.log(`  id ${t.id}: frames ${t.firstFrame}–${t.lastFrame} (${t.frames})`);
    }
    if (r.diagnostics.length) console.log("  diagnostics:", r.diagnostics.slice(0, 5));
  }
  await writeFile(join(outDir, `${stem}.video.json`), JSON.stringify({ file: basename(file), results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
