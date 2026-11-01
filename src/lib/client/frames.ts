/**
 * Keyframes are made on the phone, not the server: a still every half second,
 * shortest side 540 px, JPEG. A 53 s walk on rough concrete becomes 107 frames
 * and ~17 MB instead of a 30–90 MB video upload. Quality 0.75 halves the data
 * against 0.82 and cost about 1% of the count on a real walk (docs/build-log.md).
 */

export const FRAME_FPS = 2;
export const FRAME_SHORT_SIDE = 540;
export const MAX_FRAMES = 240;
const QUALITY = 0.75;

export type Frame = { blob: Blob; t: number; url: string };

export function grabFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<Blob | null> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return Promise.resolve(null);
  const scale = FRAME_SHORT_SIDE / Math.min(vw, vh);
  canvas.width = Math.round(vw * scale);
  canvas.height = Math.round(vh * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", QUALITY));
}

/** Pull frames out of a video file picked from the gallery by seeking through it. */
export async function framesFromFile(file: File, onProgress?: (done: number, total: number) => void): Promise<Frame[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await once(video, "loadedmetadata");
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error("Couldn't read this video's length");
    const total = Math.min(MAX_FRAMES, Math.floor(video.duration * FRAME_FPS));
    const canvas = document.createElement("canvas");
    const frames: Frame[] = [];
    for (let k = 0; k < total; k++) {
      video.currentTime = Math.min(video.duration - 0.05, k / FRAME_FPS + 0.01);
      await once(video, "seeked");
      const blob = await grabFrame(video, canvas);
      if (blob) frames.push({ blob, t: k / FRAME_FPS, url: URL.createObjectURL(blob) });
      onProgress?.(k + 1, total);
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function once(el: HTMLElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = () => {
      el.removeEventListener("error", bad);
      resolve();
    };
    const bad = () => {
      el.removeEventListener(event, ok);
      reject(new Error("This video format can't be read on this phone"));
    };
    el.addEventListener(event, ok, { once: true });
    el.addEventListener("error", bad, { once: true });
  });
}
