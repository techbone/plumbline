import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import type { Gray } from "../verify/stitch";

const run = promisify(execFile);

export const GRAY_SHORT_SIDE = 135;

export type Keyframes = {
  jpgs: Buffer[];
  grays: Gray[];
  durationS: number;
};

/**
 * Keyframes for SAM (shortest side 540) plus small grey copies for shift
 * estimation. ffmpeg auto-rotates phone video and reads MOV, MP4 and WebM, so
 * whatever the browser recorded works here. Both outputs share one fps filter,
 * so jpg k and grey frame k are the same instant.
 */
export async function extractKeyframes(videoPath: string, workDir: string, fps = 2): Promise<Keyframes> {
  if (!ffmpegPath) throw new Error("ffmpeg-static has no binary for this platform");
  await rm(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });

  const { stderr } = await run(ffmpegPath, [
    "-i", videoPath,
    "-vf", `fps=${fps},scale=540:540:force_original_aspect_ratio=increase`,
    "-q:v", "3", join(workDir, "kf_%04d.jpg"),
  ]);
  const durationS = parseDuration(stderr);

  await run(ffmpegPath, [
    "-v", "error", "-i", videoPath,
    "-vf", `fps=${fps},scale=${GRAY_SHORT_SIDE}:${GRAY_SHORT_SIDE}:force_original_aspect_ratio=increase,format=gray`,
    "-f", "rawvideo", join(workDir, "gray.raw"),
  ]);

  const names = (await readdir(workDir)).filter((n) => n.endsWith(".jpg")).sort();
  const jpgs = await Promise.all(names.map((n) => readFile(join(workDir, n))));
  const raw = await readFile(join(workDir, "gray.raw"));

  const { width, height } = jpegSize(jpgs[0]);
  const gw = width >= height ? Math.round((GRAY_SHORT_SIDE * width) / height / 2) * 2 : GRAY_SHORT_SIDE;
  const gh = raw.length / jpgs.length / gw;
  const grays = jpgs.map((_, k) => ({
    data: new Uint8Array(raw.buffer, raw.byteOffset + k * gw * gh, gw * gh),
    width: gw,
    height: gh,
  }));
  return { jpgs, grays, durationS };
}

function parseDuration(stderr: string): number {
  const m = stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

/** Width and height from a baseline/progressive JPEG's SOF marker. */
export function jpegSize(buf: Buffer): { width: number; height: number } {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  throw new Error("not a JPEG");
}
