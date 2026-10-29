import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { parseVideoStream, frameIndexOf, recordsOfKind } from "@meta-sam/parser";
import { metaClient } from "./client";
import { SAM_MODEL } from "./sam";

export type Track = {
  id: string;
  firstFrame: number;
  lastFrame: number;
  /** Frames in which this object has a mask. */
  frames: number;
  /** Mean mask confidence, when the API returned one. */
  confidence?: number;
};

export type VideoTracking = {
  prompt: string;
  tracks: Track[];
  framesSeen: number;
  /** Highest number of objects present in any single frame. */
  peakPerFrame: number;
  status: string;
  diagnostics: string[];
  ms: number;
};

/** Upload once with the Files API and reuse the id across prompts. */
export async function uploadVideo(path: string): Promise<string> {
  const bytes = await readFile(path);
  const file = new File([new Uint8Array(bytes)], basename(path), { type: "video/mp4" });
  const res = await metaClient().files.create({ file, purpose: "user_data" });
  return res.id;
}

/** Track every match of a noun phrase through the video, one identity per object. */
export async function trackVideo(fileId: string, prompt: string): Promise<VideoTracking> {
  const started = Date.now();
  const stream = await metaClient().responses.create({
    model: SAM_MODEL,
    stream: true,
    metadata: { include_confidence: "true" },
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          // The OpenAI SDK has no input_video type; the Responses API accepts it.
          { type: "input_video", file_id: fileId } as unknown as { type: "input_text"; text: string },
        ],
      },
    ],
  });

  const result = await parseVideoStream(stream).finalResult;

  const byId = new Map<string, { frames: Set<number>; conf: number[] }>();
  const perFrame = new Map<number, Set<string>>();
  for (const m of recordsOfKind(result.records, "mask")) {
    const f = frameIndexOf(m);
    if (f === undefined) continue;
    const t = byId.get(m.objectId) ?? { frames: new Set(), conf: [] };
    t.frames.add(f);
    if (m.confidence !== undefined) t.conf.push(m.confidence);
    byId.set(m.objectId, t);
    const set = perFrame.get(f) ?? new Set();
    set.add(m.objectId);
    perFrame.set(f, set);
  }

  const tracks = [...byId.entries()].map(([id, t]) => {
    const frames = [...t.frames].sort((a, b) => a - b);
    return {
      id,
      firstFrame: frames[0],
      lastFrame: frames[frames.length - 1],
      frames: frames.length,
      confidence: t.conf.length ? t.conf.reduce((a, b) => a + b, 0) / t.conf.length : undefined,
    } satisfies Track;
  });

  return {
    prompt,
    tracks,
    framesSeen: perFrame.size,
    peakPerFrame: Math.max(0, ...[...perFrame.values()].map((s) => s.size)),
    status: result.outcome.status,
    diagnostics: result.diagnostics.map((d) => `${d.code}: ${d.message}`),
    ms: Date.now() - started,
  };
}
