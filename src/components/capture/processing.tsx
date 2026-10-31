"use client";

import { Check, Circle, Link2, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, Eyebrow, naira } from "@/components/ui";
import type { Fix } from "@/lib/client/location";
import type { Uploader } from "@/lib/client/uploader";
import { headlineText } from "@/lib/pipeline/verdict";
import type { VisitResult } from "@/lib/pipeline/visit";

type Phase = "counting" | "finishing" | "done" | "failed";

/**
 * After the walk: wait for the last frames to be counted, ask the server to
 * stitch and read the code, then show the receipt. Everything before this point
 * already happened live while the foreman was walking.
 */
export function Processing({
  visitId,
  ticket,
  uploader,
  tick,
  reading,
  location,
}: {
  visitId: string;
  ticket: string;
  uploader: Uploader;
  tick: number;
  reading?: { done: number; total: number } | null;
  location: () => Fix | null;
}) {
  const [phase, setPhase] = useState<Phase>("counting");
  const [result, setResult] = useState<VisitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || reading) return;
    started.current = true;
    (async () => {
      await uploader.whenIdle();
      if (uploader.fatal) {
        setError(uploader.fatal);
        setPhase("failed");
        return;
      }
      setPhase("finishing");
      try {
        const res = await fetch(`/api/visits/${visitId}/finish`, {
          method: "POST",
          headers: { "x-visit-ticket": ticket, "content-type": "application/json" },
          body: JSON.stringify({ location: location() }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Couldn't finish the visit");
        setResult(body);
        setPhase("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't finish the visit");
        setPhase("failed");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploader, visitId, ticket, reading]);

  if (phase === "done" && result) return <Receipt result={result} />;

  const total = uploader.frames.length;
  const counted = uploader.counted;
  const last = [...uploader.frames].reverse().find((f) => f.blocks !== undefined);
  void tick;

  const steps: { label: string; status: "pending" | "running" | "passed" | "failed"; note: string }[] = [
    {
      label: "Walk captured",
      status: reading ? "running" : total ? "passed" : "pending",
      note: reading ? `${reading.done}/${reading.total}` : total ? `${total} frames · ${(uploader.bytes / 1e6).toFixed(1)} MB` : "",
    },
    {
      label: "Blocks counted",
      status: phase === "failed" && counted < total ? "failed" : counted === total && total > 0 && !reading ? "passed" : total ? "running" : "pending",
      note: total ? `${counted}/${total}` : "",
    },
    {
      label: "Visit code checked",
      status: phase === "failed" ? "pending" : phase === "finishing" ? "running" : "pending",
      note: "",
    },
    { label: "Wall stitched", status: phase === "finishing" ? "running" : "pending", note: "" },
    { label: "Location and site checked", status: phase === "finishing" ? "running" : "pending", note: location() ? `GPS ±${Math.round(location()!.accuracy)} m` : "" },
    { label: "Report ready", status: phase === "failed" ? "failed" : "pending", note: "" },
  ];

  return (
    <section className="animate-rise flex flex-1 flex-col pt-6">
      <Eyebrow>Step 3 of 3</Eyebrow>
      <h1 className="font-display mt-2 text-[28px] font-semibold leading-[1.1]">
        {phase === "failed" ? "Something went wrong" : phase === "finishing" ? "Stitching the wall" : "Counting the wall"}
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        {phase === "failed"
          ? error
          : phase === "finishing"
            ? "Joining the walk into one wall, reading the visit code, and checking this is the same site as last time."
            : "SAM 3.1 finds every block in every frame, then we join the walk into one wall and count each block once."}
      </p>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-end justify-between p-4">
          <div>
            <p className="text-[13px] text-muted">Frames counted</p>
            <p className="font-mono tnum mt-1 text-[40px] font-medium leading-none">
              {counted}
              <span className="text-muted">/{total || "–"}</span>
            </p>
          </div>
          <p className="font-mono tnum text-right text-[13px] text-muted">
            {last?.blocks !== undefined ? `${last.blocks} blocks in last frame` : ""}
          </p>
        </div>
        <FrameStrip uploader={uploader} tick={tick} />
      </Card>

      <ol className="mt-5 divide-y divide-line rounded-[10px] border border-line bg-surface">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3 px-4 py-3">
            <StepIcon status={s.status} />
            <span className={`flex-1 text-[14px] ${s.status === "pending" ? "text-muted" : ""}`}>{s.label}</span>
            <span className="font-mono tnum text-[12px] text-muted">{s.note}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The walk as thumbnails; each one lights up as SAM finishes counting it. */
function FrameStrip({ uploader, tick }: { uploader: Uploader; tick: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const counted = uploader.counted;
  useEffect(() => {
    ref.current?.scrollTo({ left: ref.current.scrollWidth, behavior: "smooth" });
  }, [counted, tick]);
  if (!uploader.frames.length) return <div className="h-[84px] border-t border-line bg-surface-2" />;
  return (
    <div ref={ref} className="flex h-[84px] gap-1 overflow-x-auto border-t border-line bg-surface-2 p-1.5 [scrollbar-width:none]">
      {uploader.frames.map((f) => (
        <div key={f.k} className="relative aspect-[9/16] h-full shrink-0 overflow-hidden rounded-[3px] bg-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f.url} alt="" className={`h-full w-full object-cover transition-opacity ${f.status === "counted" ? "opacity-100" : "opacity-40"}`} />
          {f.status === "counted" && (
            <span className="absolute inset-x-0 bottom-0 bg-black/55 text-center font-mono text-[9px] leading-[14px] text-white">{f.blocks}</span>
          )}
          {f.status === "error" && <span className="absolute inset-0 bg-bad/50" />}
        </div>
      ))}
    </div>
  );
}

function StepIcon({ status }: { status: "pending" | "running" | "passed" | "failed" }) {
  if (status === "passed") return <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok text-white"><Check size={12} strokeWidth={3} /></span>;
  if (status === "failed") return <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bad text-white"><X size={12} strokeWidth={3} /></span>;
  if (status === "running") return <LoaderCircle size={16} strokeWidth={2} className="animate-spin text-accent" />;
  return <Circle size={16} strokeWidth={2} className="text-line" />;
}

export function Receipt({ result }: { result: VisitResult }) {
  const r = result;
  const [copied, setCopied] = useState(false);
  const tone = {
    verified: { chip: "bg-ok-soft text-ok", label: "Verified" },
    short: { chip: "bg-bad-soft text-bad", label: "Short" },
    review: { chip: "bg-warn-soft text-warn", label: "Needs a check" },
    not_verified: { chip: "bg-bad-soft text-bad", label: "Not verified" },
  }[r.verdict.status];
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/r/${r.visitId}`;

  return (
    <section className="animate-rise flex flex-1 flex-col pt-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ok text-white">
        <Check size={22} strokeWidth={2.5} />
      </span>
      <h1 className="font-display mt-4 text-[28px] font-semibold leading-[1.1]">Sent to the owner</h1>
      <p className="mt-2 text-[15px] text-muted">Here&rsquo;s what the report says.</p>

      <Card className="mt-6">
        <div className="flex items-start justify-between gap-3 border-b border-dashed border-line p-4">
          <div>
            <p className="text-[13px] text-muted">{r.meta.milestoneTitle}</p>
            <p className="font-display mt-1 text-[19px] font-semibold leading-snug">{headlineText(r.verdict)}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${tone.chip}`}>{tone.label}</span>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-line">
          <Stat label="Blocks confirmed" value={r.confirmed.toLocaleString()} />
          <Stat label="To check" value={r.review.toLocaleString()} />
          <Stat label="Visit code" value={r.code.read ?? "—"} tone={r.code.status === "passed" ? "ok" : "bad"} />
          <Stat label="Sent" value={`${(r.uploadedBytes / 1e6).toFixed(1)} MB`} />
        </dl>
        {r.verdict.reasons.length > 0 && (
          <ul className="space-y-1 border-t border-line p-4 text-[13px] text-muted">
            {r.verdict.reasons.map((x) => <li key={x}>{x}</li>)}
          </ul>
        )}
        <p className="border-t border-dashed border-line px-4 py-3 font-mono text-[12px] text-muted">
          {r.visitId} &middot; {naira(r.meta.trancheNgn)} tranche
        </p>
      </Card>

      <div className="mt-4 flex gap-2">
        <a href={`/r/${r.visitId}`} className="inline-flex h-11 flex-1 items-center justify-center rounded-[6px] bg-accent px-4 text-[14px] font-medium text-accent-ink">
          Open full report
        </a>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {}
          }}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[6px] border border-line bg-surface px-4 text-[14px] font-medium"
        >
          <Link2 size={16} strokeWidth={1.75} />
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
        <TriangleAlert size={13} strokeWidth={1.75} />
        Anyone with the link can read this report.
      </p>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className={`font-mono tnum mt-1 text-[20px] font-medium ${tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : ""}`}>{value}</dd>
    </div>
  );
}
