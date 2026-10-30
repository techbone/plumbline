"use client";

import { ArrowRight, CameraOff, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { FRAME_FPS, MAX_FRAMES, grabFrame } from "@/lib/client/frames";
import type { Uploader } from "@/lib/client/uploader";

const HOLD_ON_CODE_S = 2.5;
const MIN_SECONDS = 4;

type Phase = "starting" | "ready" | "recording" | "error";

/**
 * Full-screen camera with the walk guides drawn over the preview. While
 * recording it grabs a still every half second and hands it to the uploader, so
 * SAM is counting blocks while the foreman is still walking. No video is
 * recorded or sent: a 30 s walk is about 9 MB of stills.
 */
export function Camera({
  code,
  uploader,
  onDone,
  onCancel,
  onFallback,
  liveCount,
  counted,
}: {
  code: string;
  uploader: Uploader;
  onDone: () => void;
  onCancel: () => void;
  onFallback: () => void;
  liveCount: number | null;
  counted: number;
}) {
  const videoEl = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const startedAt = useRef(0);
  const [phase, setPhase] = useState<Phase>("starting");
  const phaseRef = useRef<Phase>("starting");
  phaseRef.current = phase;
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sized, setSized] = useState(false);

  async function openCamera() {
    stream.current?.getTracks().forEach((t) => t.stop());
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser can't open the camera here.");
    const s = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
      audio: false,
    });
    stream.current = s;
    if (videoEl.current) {
      videoEl.current.srcObject = s;
      await videoEl.current.play().catch(() => {});
    }
    return s;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await openCamera();
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        canvas.current = document.createElement("canvas");
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

  // Size the preview to cover the screen by hand, checked every frame. iOS Safari
  // doesn't reliably apply object-fit to a camera stream, and both the stream
  // size and the visible screen change (toolbar, rotation, returning to the tab).
  // The preview stays hidden until the first measurement so it never flashes small.
  useEffect(() => {
    let raf = 0;
    let last = "";
    const tick = () => {
      const v = videoEl.current;
      if (v && v.videoWidth && v.videoHeight) {
        const sw = window.innerWidth;
        const sh = window.innerHeight;
        const key = `${v.videoWidth}x${v.videoHeight}@${sw}x${sh}`;
        if (key !== last) {
          last = key;
          const scale = Math.max(sw / v.videoWidth, sh / v.videoHeight);
          v.style.width = `${Math.ceil(v.videoWidth * scale)}px`;
          v.style.height = `${Math.ceil(v.videoHeight * scale)}px`;
          setSized(true);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // iOS stops the camera while the page is hidden. Mid-walk, end the walk with
  // the frames already sent rather than stitching across a gap; otherwise
  // restart the camera when the page comes back.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (phaseRef.current === "recording") finish();
        return;
      }
      const track = stream.current?.getVideoTracks()[0];
      if (track?.readyState === "live" && videoEl.current && !videoEl.current.paused) return;
      openCamera().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    stream.current?.getTracks().forEach((t) => t.stop());
    onDone();
  }

  // A still every half second by the wall clock. After a slow tick take one
  // still, not a burst: several grabs of the same video frame add nothing.
  useEffect(() => {
    if (phase !== "recording") return;
    let slot = 0;
    let taken = 0;
    const t = setInterval(async () => {
      const s = (performance.now() - startedAt.current) / 1000;
      setElapsed(s);
      const due = Math.floor(s * FRAME_FPS) + 1;
      if (due > slot && taken < MAX_FRAMES) {
        slot = due;
        taken++;
        if (videoEl.current && canvas.current) {
          const blob = await grabFrame(videoEl.current, canvas.current);
          if (blob) uploader.add(blob);
        }
      }
      if (taken >= MAX_FRAMES || uploader.fatal) finish();
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function record() {
    startedAt.current = performance.now();
    setElapsed(0);
    setPhase("recording");
    navigator.vibrate?.(20);
  }

  const onCode = phase === "recording" && elapsed < HOLD_ON_CODE_S;
  const walking = phase === "recording" && elapsed >= HOLD_ON_CODE_S;
  const beat = Math.floor(elapsed) % 4;
  const mm = String(Math.floor(elapsed / 60));
  const ss = String(Math.floor(elapsed % 60)).padStart(2, "0");

  if (phase === "error") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-[#0c0c0b] px-6 text-center text-white">
        <CameraOff size={28} strokeWidth={1.5} className="text-white/60" />
        <div>
          <p className="font-display text-[22px] font-semibold">Camera unavailable</p>
          <p className="mt-1.5 text-[14px] text-white/60">{error} Record with your phone&rsquo;s camera app and pick the video instead.</p>
        </div>
        <div className="w-full max-w-[360px] space-y-2">
          <Button onClick={onFallback}>
            <Upload size={18} strokeWidth={1.75} />
            Pick a video
          </Button>
          <Button variant="inverse" size="md" onClick={onCancel}>Back</Button>
        </div>
      </main>
    );
  }

  return (
    <main
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 touch-manipulation select-none overflow-hidden bg-black text-white [-webkit-touch-callout:none]"
    >
      <video
        ref={videoEl}
        muted
        playsInline
        autoPlay
        className={`absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ${sized ? "opacity-100" : "opacity-0"}`}
      />

      <div className="pointer-events-none absolute inset-x-0 top-[16%] border-t border-dashed border-white/45">
        <span className="absolute top-1.5 left-4 text-[11px] uppercase tracking-[0.08em] text-white/70">Top of wall</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[64%] border-t border-dashed border-white/45">
        <span className="absolute -top-6 left-4 text-[11px] uppercase tracking-[0.08em] text-white/70">Ground</span>
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pb-10 pt-[max(14px,env(safe-area-inset-top))]">
        <button
          onClick={phase === "recording" ? undefined : onCancel}
          aria-label="Close camera"
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-black/35 ${phase === "recording" ? "opacity-0" : ""}`}
        >
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

      {/* Live count: proof the walk is being read while it happens. */}
      {phase === "recording" && counted > 0 && (
        <div className="absolute right-4 top-[calc(max(14px,env(safe-area-inset-top))+56px)] rounded-[10px] bg-black/50 px-3 py-2 text-right backdrop-blur-sm">
          <p className="font-mono tnum text-[22px] font-medium leading-none">{liveCount ?? "–"}</p>
          <p className="mt-1 text-[11px] text-white/60">blocks in view</p>
        </div>
      )}

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
            <button
              onClick={record}
              disabled={phase !== "ready"}
              aria-label="Start recording"
              className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] border-white disabled:opacity-40"
            >
              <span className="h-[58px] w-[58px] rounded-full bg-[#ff4d3a]" />
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={elapsed < MIN_SECONDS}
              aria-label="Stop recording"
              className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] border-white disabled:opacity-60"
            >
              <span className="h-7 w-7 rounded-[6px] bg-[#ff4d3a]" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
