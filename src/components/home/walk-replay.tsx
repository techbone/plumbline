"use client";

import { ArrowUpRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Showcase = {
  visitId: string;
  recordedAt: string;
  site: string;
  milestone: string;
  code: string;
  codeRead: string | null;
  width: number;
  height: number;
  keyframes: number;
  uploadedMB: number;
  confirmed: number;
  review: number;
  target: number;
  verdict: { status: string; headline: string };
  frames: { src: string; k: number; used: boolean; found: number; boxes: number[][] }[];
};

const FPS = 6;
const RECEIPT_MS = 5200;

/**
 * A phone replaying a real walk: the stored frames of one visit with the boxes
 * SAM 3.1 returned for each, the running count of unique blocks, and the
 * receipt the visit produced. Nothing here is drawn by hand; it plays back
 * public/showcase, built from the visit by `npm run showcase`.
 */
export function WalkReplay() {
  const [data, setData] = useState<Showcase | null>(null);
  const [ready, setReady] = useState(false);
  const [i, setI] = useState(0);
  const [receipt, setReceipt] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    if (root.current) io.observe(root.current);
    return () => io.disconnect();
  }, []);

  // Load the walk once the phone scrolls into view, and decode every frame before playing.
  useEffect(() => {
    if (!visible || data) return;
    let cancelled = false;
    (async () => {
      try {
        const s = (await (await fetch("/showcase/walk.json")).json()) as Showcase;
        await Promise.all(
          s.frames.map(
            (f) =>
              new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = img.onerror = () => resolve();
                img.src = `/showcase/${f.src}`;
              }),
          ),
        );
        if (cancelled) return;
        setData(s);
        if (reduced.current) {
          setI(s.frames.length - 1);
          setReceipt(true);
        }
        setReady(true);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, data]);

  useEffect(() => {
    if (!data || !visible || reduced.current) return;
    if (receipt) {
      const t = setTimeout(() => {
        setReceipt(false);
        setI(0);
      }, RECEIPT_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (i >= data.frames.length - 1) setReceipt(true);
      else setI(i + 1);
    }, 1000 / FPS);
    return () => clearTimeout(t);
  }, [data, visible, i, receipt]);

  const f = data?.frames[i];
  const onCode = !!data && !!f && !f.used && data.frames.slice(0, i + 1).every((x) => !x.used);
  const seconds = f ? f.k / 2 : 0;

  return (
    <div ref={root} className="mx-auto w-full max-w-[300px]">
      <div className="relative aspect-[9/19] overflow-hidden rounded-[38px] border border-line bg-[#0c0c0b] p-[9px] shadow-[0_24px_60px_-28px_rgba(28,27,25,0.45)]">
        <div className="relative h-full w-full overflow-hidden rounded-[30px] bg-black">
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="font-mono text-[12px] text-white/50">Loading a recorded walk…</p>
            </div>
          )}

          {data && f && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/showcase/${f.src}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <svg viewBox={`0 0 ${data.width} ${data.height}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
                {f.boxes.map(([x, y, w, h], n) => (
                  <rect key={n} x={x} y={y} width={w} height={h} fill="var(--accent)" fillOpacity={0.35} stroke="var(--accent)" strokeWidth={1} />
                ))}
              </svg>

              <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3.5 pt-4 text-white">
                <span className="rounded-full bg-black/50 px-2.5 py-1 text-[11px]">
                  Code <span className="font-mono font-semibold tracking-[0.1em]">{data.code}</span>
                </span>
                <span className="flex items-center gap-1.5 font-mono tnum text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ff4d3a]" />
                  0:{String(Math.floor(seconds)).padStart(2, "0")}
                </span>
              </div>

              {!onCode && (
                <div className="absolute right-3 top-12 rounded-[8px] bg-black/55 px-2.5 py-1.5 text-right text-white">
                  <p className="font-mono tnum text-[18px] font-medium leading-none">{f.found}</p>
                  <p className="mt-0.5 text-[10px] text-white/65">blocks found</p>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-black/60 px-3.5 pb-4 pt-3 text-center text-white">
                {onCode ? (
                  <p className="text-[12px] font-medium">Hold on the code…</p>
                ) : (
                  <p className="text-[12px] font-medium">
                    SAM 3.1 &middot; <span className="font-mono tnum">{f.boxes.length}</span> blocks in this frame
                  </p>
                )}
                <div className="mx-auto mt-2 h-[3px] w-full overflow-hidden rounded-full bg-white/20">
                  <div className="h-full bg-accent" style={{ width: `${((i + 1) / data.frames.length) * 100}%` }} />
                </div>
              </div>

              {receipt && (
                <div className="animate-rise absolute inset-x-3 bottom-3 rounded-[14px] border border-line bg-surface p-3.5 text-text">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted">{data.milestone}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-medium text-ok">
                      <Check size={11} strokeWidth={2.5} /> Verified
                    </span>
                  </div>
                  <p className="font-mono tnum mt-1.5 text-[26px] font-medium leading-none">
                    {data.confirmed}
                    <span className="text-[15px] text-muted"> / {data.target}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    blocks confirmed &middot; {data.review} to check &middot; code {data.codeRead} read
                  </p>
                  <a href={`/r/${data.visitId}`} className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-accent">
                    Open this report <ArrowUpRight size={13} strokeWidth={2} />
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {data && (
        <p className="mt-3 text-center text-[12px] leading-snug text-muted">
          Replay of a real walk in Kuje,{" "}
          {new Date(data.recordedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}: {data.keyframes} stills,
          every 2nd shown. Boxes are SAM 3.1&rsquo;s output for each frame.
        </p>
      )}
    </div>
  );
}
