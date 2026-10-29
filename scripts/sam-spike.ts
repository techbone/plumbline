/**
 * M1 spike: can SAM 3.1 count individual blocks in a real wall photo?
 *
 *   npm run spike -- path/to/elevation.jpg ["concrete block"] ["wall"]
 *
 * Writes an SVG overlay and a JSON summary to docs/evidence/spike/.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { segmentImage, type ImageSegmentation } from "../src/lib/meta/sam";
import { crossCheck } from "../src/lib/verify/cross-check";

const [file, blockPrompt = "concrete block", wallPrompt = "wall"] = process.argv.slice(2);
if (!file) {
  console.error('usage: npm run spike -- <image> ["block prompt"] ["wall prompt"]');
  process.exit(1);
}

const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

async function main() {
  const data = await readFile(file);
  const image = { data, mime: MIME[extname(file).toLowerCase()] ?? "image/jpeg" };

  const [blocks, wall] = await Promise.all([
    segmentImage(image, blockPrompt),
    segmentImage(image, wallPrompt),
  ]);

  const wallArea = wall.instances.reduce((sum, i) => sum + i.area, 0);
  const check = crossCheck(blocks.instances.map((i) => i.area), wallArea);

  const outDir = join("docs/evidence/spike");
  await mkdir(outDir, { recursive: true });
  const stem = basename(file, extname(file));

  const summary = {
    file: basename(file),
    blockPrompt,
    wallPrompt,
    size: { width: blocks.width, height: blocks.height },
    blocks: { count: blocks.instances.length, status: blocks.status, ms: blocks.ms, diagnostics: blocks.diagnostics },
    wall: { instances: wall.instances.length, area: wallArea, status: wall.status, ms: wall.ms },
    crossCheck: check,
    lowConfidence: blocks.instances.filter((i) => (i.confidence ?? 1) < 0.5).length,
  };
  await writeFile(join(outDir, `${stem}.json`), JSON.stringify(summary, null, 2));
  await writeFile(join(outDir, `${stem}.svg`), overlay(image, blocks));

  console.log(JSON.stringify(summary, null, 2));
  console.log(`overlay → ${join(outDir, `${stem}.svg`)}`);
}

function overlay(image: { data: Buffer; mime: string }, seg: ImageSegmentation): string {
  const shapes = seg.instances
    .map((inst, n) => {
      const bw = inst.box.right - inst.box.left;
      const bh = inst.box.bottom - inst.box.top;
      const sx = bw / inst.maskSize.width;
      const sy = bh / inst.maskSize.height;
      const cx = inst.box.left + bw / 2;
      const cy = inst.box.top + bh / 2;
      return (
        `<path d="${inst.svgPath}" transform="translate(${inst.box.left} ${inst.box.top}) scale(${sx} ${sy})" ` +
        `fill="#E8590C" fill-opacity="0.35" stroke="#E8590C" stroke-width="${1 / Math.min(sx, sy)}"/>` +
        `<text x="${cx}" y="${cy}" font-family="IBM Plex Mono, monospace" font-size="${Math.max(10, bh / 3)}" ` +
        `text-anchor="middle" dominant-baseline="middle" fill="#fff">${n + 1}</text>`
      );
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${seg.width} ${seg.height}">
<image href="data:${image.mime};base64,${image.data.toString("base64")}" width="${seg.width}" height="${seg.height}"/>
${shapes}
</svg>`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
