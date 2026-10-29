import jpeg from "jpeg-js";
import type { Gray } from "./stitch";

export const GRAY_SHORT_SIDE = 135;

/**
 * Decode a JPEG and box-average it down to a small greyscale frame for shift
 * estimation. Pure JS, so it runs in a serverless function without ffmpeg.
 */
export function jpegToGray(buf: Buffer, shortSide = GRAY_SHORT_SIDE): Gray {
  const img = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
  const scale = Math.min(img.width, img.height) / shortSide;
  const width = Math.max(1, Math.round(img.width / scale));
  const height = Math.max(1, Math.round(img.height / scale));
  const data = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const sy0 = Math.floor(y * scale);
    const sy1 = Math.min(img.height, Math.floor((y + 1) * scale));
    for (let x = 0; x < width; x++) {
      const sx0 = Math.floor(x * scale);
      const sx1 = Math.min(img.width, Math.floor((x + 1) * scale));
      let sum = 0;
      let n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        let i = (sy * img.width + sx0) * 4;
        for (let sx = sx0; sx < sx1; sx++, i += 4) {
          sum += 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
          n++;
        }
      }
      data[y * width + x] = n ? Math.round(sum / n) : 0;
    }
  }
  return { data, width, height };
}

/** Width and height from a JPEG's start-of-frame marker, without decoding. */
export function jpegSize(buf: Buffer): { width: number; height: number } {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  throw new Error("not a JPEG");
}
