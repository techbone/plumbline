/**
 * Re-count a stored visit locally: pull its frames from a deployed server, count
 * them with SAM (cached under ./data), and stitch. Used to test stitching
 * changes against a real walk without walking it again.
 *
 *   npm run replay -- vis_62077ef1a92a 88 [baseUrl=https://plumbline-ruby.vercel.app]
 */
import { stitchWalk, withRetry } from "../src/lib/pipeline/count";
import { countFrame } from "../src/lib/pipeline/visit";
import { jpegToGray } from "../src/lib/verify/gray";

const [visitId, n, base = "https://plumbline-ruby.vercel.app"] = process.argv.slice(2);
if (!visitId || !n) {
  console.error("usage: npm run replay -- <visitId> <frameCount> [baseUrl]");
  process.exit(1);
}

async function main() {
  const total = Number(n);
  const jpgs: Buffer[] = new Array(total);
  const counts = new Array(total);
  let next = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (next < total) {
        const k = next++;
        jpgs[k] = await withRetry(async () => {
          const res = await fetch(`${base}/api/visits/${visitId}/frames/${k}`);
          if (!res.ok) throw new Error(`frame ${k}: ${res.status}`);
          return Buffer.from(await res.arrayBuffer());
        }, 5);
        counts[k] = await countFrame(visitId, k, jpgs[k]);
        process.stdout.write(`\r  counted ${k + 1}/${total}`);
      }
    }),
  );
  console.log();
  const walk = stitchWalk(counts, jpgs.map((j) => jpegToGray(j)));
  console.log(JSON.stringify({ confirmed: walk.confirmed, review: walk.review, used: walk.used }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
