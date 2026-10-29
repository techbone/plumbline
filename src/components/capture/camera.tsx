"use client";

import { ArrowRight, CameraOff, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

const MAX_SECONDS = 120;
const HOLD_ON_CODE_S = 2.5;
const MIN_SECONDS = 4;

const MIME_TYPES = [
  "video/mp4;codecs=avc1.640028",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

type Phase = "starting" | "ready" | "recording" | "error";

/**
 * Full-screen camera with the walk guides drawn over the preview: framing
 * lines for the top of the wall and the ground, a hold-on-the-code countdown,
 * then a one-step-per-second pace beat while walking.
 */
export function Camera({
  code,
  onDone,
  onCancel,
  onFallback,
}: {
  code: string;
  onDone: (video: Blob) => void;
  onCancel: () => void;
  onFallback: () => void;
}) {
  const videoEl = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser can't open the camera here.");
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
          audio: false,
        });
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (videoEl.current) {
          videoEl.current.srcObject = s;
          await videoEl.current.play().catch(() => {});
        }
        setPhase("ready");
      } catch (e) {
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Camera permission was declined."
            : e instanceof Error
              ? e.message
              : "Couldn't open the camera.",
        );
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => {
      const s = (performance.now() - startedAt.current) / 1000;
      setElapsed(s);
      if (s >= MAX_SECONDS) stop();
    }, 100);
    return () => clearInterval(t);
  }, [phase, stop]);

  function record() {
    if (!stream.current) return;
    const mimeType = MIME_TYPES.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
    const r = new MediaRecorder(stream.current, { mimeType, videoBitsPerSecond: 8_000_000 });
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      const blob = new Blob(chunks.current, { type: (r.mimeType || mimeType || "video/mp4").split(";")[0] });
      stream.current?.getTracks().forEach((t) => t.stop());
      onDone(blob);
    };
    r.start(1000);
    recorder.current = r;
    startedAt.current = performance.now();
    setElapsed(0);
    setPhase("recording");
    navigator.vibrate?.(20);
  }

  const onCode = phase === "recording" && elapsed < HOLD_ON_CODE_S;
  const walking = phase === "recording" && elapsed >= HOLD_ON_CODE_S;
  const beat = Math.floor(elapsed) % 4;
  const mm = String(Math.floor(elapsed / 60)).padStart(1, "0");
  const ss = String(Math.floor(elapsed % 60)).padStart(2, "0");

  if (phase === "error") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-[#0c0c0b] px-6 text-center text-white">
        <CameraOff size={28} strokeWidth={1.5} className="text-white/60" />
        <div>
          <p className="font-display text-[22px] font-semibold">Camera unavailable</p>
          <p className="mt-1.5 text-[14px] text-white/60">{error} Record with your phone&rsquo;s camera app and upload the video instead.</p>
        </div>
        <div className="w-full max-w-[360px] space-y-2">
          <Button onClick={onFallback}>
            <Upload size={18} strokeWidth={1.75} />
            Upload a video
          </Button>
          <Button variant="inverse" size="md" onClick={onCancel}>Back</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      <video ref={videoEl} muted playsInline autoPlay className="absolute inset-0 h-full w-full object-cover" />

      {/* Framing guides: top of the wall near the upper line, ground near the lower. */}
      <div className="pointer-events-none absolute inset-x-0 top-[24%] border-t border-dashed border-white/45">
        <span className="absolute -top-6 left-4 text-[11px] uppercase tracking-[0.08em] text-white/70">Top of wall</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[76%] border-t border-dashed border-white/45">
        <span className="absolute top-1.5 left-4 text-[11px] uppercase tracking-[0.08em] text-white/70">Ground</span>
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pb-10 pt-[max(14px,env(safe-area-inset-top))]">
        <button onClick={phase === "recording" ? undefined : onCancel} aria-label="Close camera"
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-black/35 ${phase === "recording" ? "opacity-0" : ""}`}>
          <X size={20} strokeWidth={1.75} />
        </button>
        <span className="rounded-full bg-black/45 px-3 py-1.5 text-[13px]">
          Code <span className="font-mono font-semibold tracking-[0.12em]">{code}</span>
        </span>
        <span className="flex h-10 min-w-10 items-center justify-end gap-1.5 font-mono tnum text-[14px]">
          {phase === "recording" && <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff4d3a]" />}
          {phase === "recording" ? `${mm}:${ss}` : ""}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-5 pb-[max(22px,env(safe-area-inset-bottom))] pt-16">
        <div className="mb-6 min-h-[64px] text-center" aria-live="polite">
          {phase === "starting" && <p className="text-[15px] text-white/80">Opening camera…</p>}
          {phase === "ready" && (
            <>
              <p className="font-display text-[19px] font-semibold">Point at the code first</p>
              <p className="mt-1 text-[14px] text-white/70">Then press record and hold still for two seconds.</p>
            </>
          )}
          {onCode && (
            <>
              <p className="font-display text-[19px] font-semibold">Hold on the code…</p>
              <div className="mx-auto mt-3 h-1 w-40 overflow-hidden rounded-full bg-white/20">
                <div className="h-full bg-accent transition-[width] duration-100" style={{ width: `${(elapsed / HOLD_ON_CODE_S) * 100}%` }} />
              </div>
            </>
          )}
          {walking && (
            <>
              <p className="font-display flex items-center justify-center gap-2 text-[19px] font-semibold">
                Walk slowly along the wall <ArrowRight size={18} strokeWidth={2} />
              </p>
              <div className="mt-3 flex items-center justify-center gap-2" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-2 w-6 rounded-full transition-colors duration-150 ${i === beat ? "bg-accent" : "bg-white/25"}`} />
                ))}
              </div>
              <p className="mt-2 text-[12px] text-white/60">One step per beat &middot; keep the wall between the lines</p>
            </>
          )}
        </div>

        <div className="flex items-center justify-center">
          {phase !== "recording" ? (
            <button onClick={record} disabled={phase !== "ready"} aria-label="Start recording"
              className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] border-white disabled:opacity-40">
              <span className="h-[58px] w-[58px] rounded-full bg-[#ff4d3a]" />
            </button>
          ) : (
            <button onClick={stop} disabled={elapsed < MIN_SECONDS} aria-label="Stop recording"
              className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] border-white disabled:opacity-60">
              <span className="h-7 w-7 rounded-[6px] bg-[#ff4d3a]" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
