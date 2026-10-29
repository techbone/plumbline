"use client";

import { Check, Circle, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, Eyebrow } from "@/components/ui";
import type { MilestoneView } from "./capture-flow";

type StepView = {
  name: string;
  label: string;
  status: "pending" | "running" | "passed" | "failed" | "review";
  detail: Record<string, unknown> | null;
};
type VisitView = {
  id: string;
  status: "awaiting_video" | "processing" | "done" | "failed";
  code: string;
  steps: StepView[];
  result: {
    durationS: number;
    keyframes: number;
    confirmed: number;
    review: number;
    code: { status: string; read: string | null; frame: number | null; note: string };
    verdict: { status: "verified" | "short" | "review" | "not_verified"; headline: string; reasons: string[] };
  } | null;
};

/** Upload with real progress, then follow the pipeline step by step. */
export function Processing({ visitId, video, milestone }: { visitId: string; video: Blob; milestone?: MilestoneView }) {
  const [sent, setSent] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [visit, setVisit] = useState<VisitView | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/visits/${visitId}/video`);
    xhr.setRequestHeader("content-type", video.type || "video/mp4");
    xhr.upload.onprogress = (e) => e.lengthComputable && setSent(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) setUploaded(true);
      else setUploadError(safeError(xhr.responseText) ?? `Upload failed (${xhr.status})`);
    };
    xhr.onerror = () => setUploadError("Upload failed. Check your connection and try again.");
    xhr.send(video);
  }, [visitId, video]);

  useEffect(() => {
    if (!uploaded) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/visits/${visitId}`, { cache: "no-store" });
        if (res.ok) {
          const v: VisitView = await res.json();
          if (!stop) setVisit(v);
          if (v.status === "done" || v.status === "failed") return;
        }
      } catch {}
      if (!stop) setTimeout(tick, 1200);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [uploaded, visitId]);

  const count = visit?.steps.find((s) => s.name === "count");
  const done = Number(count?.detail?.done ?? 0);
  const total = Number(count?.detail?.total ?? 0);

  if (visit?.status === "done" && visit.result) return <Receipt visit={visit} milestone={milestone} />;

  return (
    <section className="animate-rise flex flex-1 flex-col pt-6">
      <Eyebrow>Step 3 of 3</Eyebrow>
      <h1 className="font-display mt-2 text-[28px] font-semibold leading-[1.1]">
        {!uploaded ? "Sending video" : visit?.status === "failed" ? "Something went wrong" : "Counting the wall"}
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        {!uploaded
          ? "Keep this page open until the upload finishes."
          : "SAM 3.1 is finding every block in every frame. You can close this page; the owner still gets the report."}
      </p>

      {!uploaded && (
        <Card className="mt-6 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[14px]">Uploading</span>
            <span className="font-mono tnum text-[14px]">{Math.round(sent * 100)}%</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${sent * 100}%` }} />
          </div>
          <p className="mt-2 font-mono tnum text-[12px] text-muted">
            {((sent * video.size) / 1e6).toFixed(1)} of {(video.size / 1e6).toFixed(1)} MB
          </p>
          {uploadError && <p className="mt-3 text-[14px] text-bad">{uploadError}</p>}
        </Card>
      )}

      {uploaded && (
        <>
          <Card className="mt-6 overflow-hidden">
            <div className="flex items-end justify-between p-4">
              <div>
                <p className="text-[13px] text-muted">Frames counted</p>
                <p className="font-mono tnum mt-1 text-[40px] font-medium leading-none">
                  {done}
                  <span className="text-muted">/{total || "–"}</span>
                </p>
              </div>
              <p className="font-mono tnum text-right text-[13px] text-muted">
                {count?.detail?.lastCount !== undefined ? `${count.detail.lastCount} blocks in last frame` : ""}
              </p>
            </div>
            <FrameStrip visitId={visitId} done={done} total={total} />
          </Card>

          <ol className="mt-5 divide-y divide-line rounded-[10px] border border-line bg-surface">
            {(visit?.steps ?? []).map((s) => (
              <li key={s.name} className="flex items-center gap-3 px-4 py-3">
                <StepIcon status={s.status} />
                <span className={`flex-1 text-[14px] ${s.status === "pending" ? "text-muted" : ""}`}>{s.label}</span>
                <span className="font-mono tnum text-[12px] text-muted">{stepNote(s)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

/** Thumbnails of frames as SAM finishes them; the strip scrolls with the walk. */
function FrameStrip({ visitId, done, total }: { visitId: string; done: number; total: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ left: ref.current.scrollWidth, behavior: "smooth" });
  }, [done]);
  if (!total) {
    return <div className="h-[84px] border-t border-line bg-surface-2" />;
  }
  return (
    <div ref={ref} className="flex h-[84px] gap-1 overflow-x-auto border-t border-line bg-surface-2 p-1.5 [scrollbar-width:none]">
      {Array.from({ length: total }, (_, k) => (
        <div key={k} className="relative h-full aspect-[9/16] shrink-0 overflow-hidden rounded-[3px] bg-line">
          {k < done && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/visits/${visitId}/frames/${k}`} alt="" className="animate-rise h-full w-full object-cover" />
          )}
        </div>
      ))}
    </div>
  );
}

function StepIcon({ status }: { status: StepView["status"] }) {
  const common = { size: 16, strokeWidth: 2 };
  if (status === "passed") return <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok text-white"><Check {...common} size={12} strokeWidth={3} /></span>;
  if (status === "failed") return <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bad text-white"><X {...common} size={12} strokeWidth={3} /></span>;
  if (status === "review") return <TriangleAlert {...common} className="text-warn" />;
  if (status === "running") return <LoaderCircle {...common} className="animate-spin text-accent" />;
  return <Circle {...common} className="text-line" />;
}

function stepNote(s: StepView): string {
  const d = s.detail ?? {};
  switch (s.name) {
    case "received":
      return d.bytes ? `${(Number(d.bytes) / 1e6).toFixed(1)} MB` : "";
    case "frames":
      return d.count ? `${d.count} frames · ${Number(d.durationS).toFixed(0)} s` : "";
    case "code":
      return typeof d.read === "string" ? `read ${d.read}` : s.status === "failed" ? "not seen" : "";
    case "count":
      return d.total ? `${d.done}/${d.total}` : "";
    case "stitch":
      return d.unique !== undefined ? `${d.confirmed} confirmed` : "";
    case "verdict":
      return typeof d.error === "string" ? "error" : "";
    default:
      return "";
  }
}

function Receipt({ visit, milestone }: { visit: VisitView; milestone?: MilestoneView }) {
  const r = visit.result!;
  const tone = {
    verified: { chip: "bg-ok-soft text-ok", label: "Verified" },
    short: { chip: "bg-bad-soft text-bad", label: "Short" },
    review: { chip: "bg-warn-soft text-warn", label: "Needs a check" },
    not_verified: { chip: "bg-bad-soft text-bad", label: "Not verified" },
  }[r.verdict.status];

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
            <p className="text-[13px] text-muted">{milestone?.title ?? "Site visit"}</p>
            <p className="font-display mt-1 text-[19px] font-semibold leading-snug">{r.verdict.headline}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${tone.chip}`}>{tone.label}</span>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-line">
          <Stat label="Blocks confirmed" value={r.confirmed.toLocaleString()} />
          <Stat label="To check" value={r.review.toLocaleString()} />
          <Stat label="Visit code" value={r.code.read ?? "—"} tone={r.code.status === "passed" ? "ok" : "bad"} />
          <Stat label="Filmed" value={`${r.durationS.toFixed(0)} s · ${r.keyframes} fr`} />
        </dl>
        {r.verdict.reasons.length > 0 && (
          <ul className="space-y-1 border-t border-line p-4 text-[13px] text-muted">
            {r.verdict.reasons.map((x) => <li key={x}>{x}</li>)}
          </ul>
        )}
        <p className="border-t border-dashed border-line px-4 py-3 font-mono text-[12px] text-muted">{visit.id}</p>
      </Card>
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

function safeError(text: string): string | null {
  try {
    return JSON.parse(text).error ?? null;
  } catch {
    return null;
  }
}
