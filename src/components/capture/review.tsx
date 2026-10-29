"use client";

import { RotateCcw, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Eyebrow } from "@/components/ui";

export function Review({ video, onRetake, onSend }: { video: Blob; onRetake: () => void; onSend: () => void }) {
  const url = useMemo(() => URL.createObjectURL(video), [video]);
  const [duration, setDuration] = useState<number | null>(null);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const mb = (video.size / 1e6).toFixed(1);
  const tooShort = duration !== null && duration < 4;

  return (
    <section className="animate-rise flex flex-1 flex-col pt-6">
      <Eyebrow>Step 2 of 3</Eyebrow>
      <h1 className="font-display mt-2 text-[28px] font-semibold leading-[1.1]">Check the video</h1>
      <p className="mt-2 text-[15px] text-muted">The code should be readable at the start, and the wall in frame the whole way.</p>

      <div className="mt-5 overflow-hidden rounded-[10px] border border-line bg-black">
        <video
          src={url}
          controls
          playsInline
          className="max-h-[52dvh] w-full object-contain"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d)) setDuration(d);
          }}
        />
      </div>
      <p className="mt-2 font-mono tnum text-[13px] text-muted">
        {duration !== null ? `${duration.toFixed(1)} s · ` : ""}
        {mb} MB
      </p>
      {tooShort && <p className="mt-2 text-[14px] text-bad">That&rsquo;s under 4 seconds. Record a longer walk.</p>}

      <div className="mt-auto space-y-2 pt-8">
        <Button onClick={onSend} disabled={tooShort}>
          <Send size={17} strokeWidth={1.75} />
          Send to the owner
        </Button>
        <Button variant="secondary" size="md" onClick={onRetake}>
          <RotateCcw size={16} strokeWidth={1.75} />
          Retake
        </Button>
      </div>
    </section>
  );
}
