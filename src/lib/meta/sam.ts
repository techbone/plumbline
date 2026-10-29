import {
  decodeMaskToRaster,
  decodeMaskToSVGPath,
  parseImageStream,
  recordsOfKind,
} from "@meta-sam/parser";
import { metaClient } from "./client";

export const SAM_MODEL = "sam-3.1";

export type Instance = {
  id: string;
  box: { left: number; top: number; right: number; bottom: number };
  /** Mask pixel count, scaled to source-image pixels. */
  area: number;
  confidence?: number;
  /** SVG path in mask-local coordinates; see `maskScale` to place it. */
  svgPath: string;
  maskSize: { width: number; height: number };
};

export type ImageSegmentation = {
  prompt: string;
  width: number;
  height: number;
  instances: Instance[];
  status: string;
  diagnostics: string[];
  ms: number;
};

/** Segment every match of a short noun phrase in one image. */
export async function segmentImage(
  image: { data: Buffer; mime: string },
  prompt: string,
): Promise<ImageSegmentation> {
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
          {
            type: "input_image",
            detail: "auto",
            image_url: `data:${image.mime};base64,${image.data.toString("base64")}`,
          },
        ],
      },
    ],
  });

  const parsed = parseImageStream(stream);
  const result = await parsed.finalResult;

  const { width, height } = sourceSize(result.rawOutput);
  const boxes = new Map(
    recordsOfKind(result.records, "box").map((b) => [b.objectId, b]),
  );

  const instances = recordsOfKind(result.records, "mask").map((m) => {
    const raster = decodeMaskToRaster(m.mask);
    let on = 0;
    for (const px of raster) on += px;
    const b = boxes.get(m.objectId);
    const bw = m.bounds.right - m.bounds.left;
    const bh = m.bounds.bottom - m.bounds.top;
    // Mask rasters can be smaller than the region they cover.
    const scale = (bw * bh) / (m.mask.width * m.mask.height || 1);
    return {
      id: m.objectId,
      box: b
        ? { left: b.left, top: b.top, right: b.right, bottom: b.bottom }
        : m.bounds,
      area: Math.round(on * scale),
      confidence: m.confidence ?? b?.confidence,
      svgPath: decodeMaskToSVGPath(m.mask),
      maskSize: { width: m.mask.width, height: m.mask.height },
    } satisfies Instance;
  });

  return {
    prompt,
    width,
    height,
    instances,
    status: result.outcome.status,
    diagnostics: result.diagnostics.map((d) => `${d.code}: ${d.message}`),
    ms: Date.now() - started,
  };
}

/** Records carry the source `w`/`h`; the parser doesn't expose them. */
function sourceSize(raw: string): { width: number; height: number } {
  const m = raw.match(/;w=(\d+);h=(\d+)/);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : { width: 0, height: 0 };
}
