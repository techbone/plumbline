"use client";

import { Check, Link2, ScanLine, TriangleAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Logo } from "@/components/logo";
import { Card, Eyebrow, naira } from "@/components/ui";
import type { VisitResult } from "@/lib/pipeline/visit";

const TONE = {
  verified: { chip: "bg-ok-soft text-ok", label: "Verified", Icon: Check },
  review: { chip: "bg-warn-soft text-warn", label: "Needs a check", Icon: TriangleAlert },
  short: { chip: "bg-bad-soft text-bad", label: "Short of target", Icon: X },
  not_verified: { chip: "bg-bad-soft text-bad", label: "Not verified", Icon: X },
} as const;

/** The owner's report: the verdict first, then the numbered wall as evidence. */
export function Report({ result: r }: { result: VisitResult }) {
  const tone = TONE[r.verdict.status];
  const [copied, setCopied] = useState(false);
  const progress = r.meta.target ? Math.min(1, r.confirmed / r.meta.target) : 0;

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[1200px] px-4 pb-16 pt-5 sm:px-8">
      <header className="flex h-11 items-center justify-between">
        <Logo />
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {}
          }}
          className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-line bg-surface px-3 text-[13px] font-medium"
        >
          <Link2 size={15} strokeWidth={1.75} />
          {copied ? "Link copied" : "Share report"}
        </button>
      </header>

      <section className="grid grid-cols-1 gap-8 pt-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <Eyebrow>
            {r.meta.projectName} &middot; {r.meta.site}
          </Eyebrow>
          <h1 className="font-display mt-2 text-[34px] font-semibold leading-[1.05] sm:text-[44px]">{r.meta.milestoneTitle}</h1>
          <p className="mt-3 flex items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${tone.chip}`}>
              <tone.Icon size={14} strokeWidth={2.25} />
              {tone.label}
            </span>
            <span className="text-[15px] text-muted">{r.verdict.headline}</span>
          </p>

          <Card className="mt-6 p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[13px] text-muted">Blocks confirmed against target</p>
              <p className="font-mono tnum text-[13px] text-muted">{Math.round(progress * 100)}%</p>
            </div>
            <p className="font-mono tnum mt-2 text-[44px] font-medium leading-none">
              {r.confirmed.toLocaleString()}
              <span className="text-[22px] text-muted"> / {r.meta.target.toLocaleString()}</span>
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full ${r.verdict.status === "verified" ? "bg-ok" : "bg-accent"}`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4">
              <Fact label="To check" value={r.review.toLocaleString()} />
              <Fact label="Tranche" value={naira(r.meta.trancheNgn)} />
              <Fact label="Visit code" value={r.code.read ?? "–"} tone={r.code.status === "passed" ? "ok" : "bad"} />
            </dl>
          </Card>

          <Card className="mt-4 divide-y divide-line">
            <Check4 ok={r.code.status === "passed"} warn={r.code.status === "review"} title="Visit code on camera" body={r.code.note} />
            <Check4
              ok={r.review <= r.confirmed * 0.15}
              warn={r.review > r.confirmed * 0.15}
              title="Walk stitched into one wall"
              body={`${r.keyframes} frames joined; ${r.confirmed} blocks seen in two or more frames, ${r.review} seen once.`}
            />
            <Check4
              ok={r.confirmed >= r.meta.target}
              warn={r.confirmed < r.meta.target && r.confirmed + r.review >= r.meta.target}
              title="Count against the milestone"
              body={
                r.confirmed >= r.meta.target
                  ? `${r.confirmed} confirmed, target of ${r.meta.target} met.`
                  : `${r.confirmed} confirmed, ${r.meta.target - r.confirmed} short of ${r.meta.target}${r.review ? `; ${r.review} more seen once` : ""}.`
              }
            />
          </Card>

          <p className="mt-4 font-mono text-[12px] text-muted">
            {r.visitId} &middot; {new Date(r.finishedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} &middot;{" "}
            {(r.uploadedBytes / 1e6).toFixed(1)} MB sent
          </p>
        </div>

        <WallMap result={r} />
      </section>
    </main>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div>
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className={`font-mono tnum mt-1 text-[17px] font-medium ${tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : ""}`}>{value}</dd>
    </div>
  );
}

function Check4({ ok, warn, title, body }: { ok: boolean; warn: boolean; title: string; body: string }) {
  return (
    <div className="flex gap-3 p-4">
      {ok ? (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok text-white"><Check size={12} strokeWidth={3} /></span>
      ) : warn ? (
        <TriangleAlert size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-warn" />
      ) : (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bad text-white"><X size={12} strokeWidth={3} /></span>
      )}
      <div>
        <p className="text-[14px] font-medium">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">{body}</p>
      </div>
    </div>
  );
}

/**
 * The stitched wall: every frame laid on one map, every merged block numbered.
 * Solid accent means the block was seen in two or more frames; amber means once.
 */
function WallMap({ result: r }: { result: VisitResult }) {
  const [showFrames, setShowFrames] = useState(true);
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    const xs = r.offsets.map((o) => o.x);
    const ys = r.offsets.map((o) => o.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
      minX,
      minY,
      width: Math.max(...xs) - minX + r.frameSize.width,
      height: Math.max(...ys) - minY + r.frameSize.height,
    };
  }, [r]);

  // Every 2nd frame is enough to cover the wall; the last one closes the end.
  const shown = r.offsets.map((_, k) => k).filter((k) => k % 2 === 0 || k === r.offsets.length - 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <Eyebrow className="flex items-center gap-1.5">
          <ScanLine size={14} strokeWidth={1.75} /> The wall, stitched from {r.keyframes} frames
        </Eyebrow>
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={showFrames} onChange={(e) => setShowFrames(e.target.checked)} className="accent-[var(--accent)]" />
          Show photos
        </label>
      </div>

      <div className="mt-3 overflow-x-auto rounded-[10px] border border-line bg-surface-2 [scrollbar-width:thin]">
        <svg
          viewBox={`0 0 ${geo.width} ${geo.height}`}
          style={{ height: "min(70dvh, 640px)", aspectRatio: `${geo.width} / ${geo.height}` }}
          role="img"
          aria-label={`${r.blocks.length} blocks numbered across the stitched wall`}
        >
          {showFrames &&
            shown.map((k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <image
                key={k}
                href={`/api/visits/${r.visitId}/frames/${k}`}
                x={r.offsets[k].x - geo.minX}
                y={r.offsets[k].y - geo.minY}
                width={r.frameSize.width}
                height={r.frameSize.height}
              />
            ))}
          {r.blocks.map((b) => {
            const once = b.seen < 2;
            const color = once ? "var(--warn)" : "var(--accent)";
            const x = b.x - geo.minX;
            const y = b.y - geo.minY;
            return (
              <g key={b.id} onMouseEnter={() => setHover(b.id)} onMouseLeave={() => setHover(null)}>
                <rect
                  x={x - b.w / 2}
                  y={y - b.h / 2}
                  width={b.w}
                  height={b.h}
                  fill={color}
                  fillOpacity={hover === b.id ? 0.55 : 0.3}
                  stroke={color}
                  strokeWidth={hover === b.id ? 3 : 1.5}
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.max(11, b.h / 3)}
                  fill="#fff"
                  style={{ fontFamily: "var(--font-plex-mono), monospace" }}
                >
                  {b.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-muted">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-[2px] bg-accent/40 ring-1 ring-accent" /> Seen in 2+ frames ({r.confirmed})
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-[2px] bg-warn/40 ring-1 ring-warn" /> Seen once, check by eye ({r.review})
        </span>
        <span className="ml-auto font-mono tnum text-[12px]">scroll sideways along the wall</span>
      </div>
    </div>
  );
}
