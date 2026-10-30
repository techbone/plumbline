"use client";

import { ArrowRight, Footprints, KeyRound, Send, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { Button, Card, Eyebrow, naira } from "@/components/ui";
import { Camera } from "./camera";
import { Processing } from "./processing";
import { framesFromFile } from "@/lib/client/frames";
import { Uploader } from "@/lib/client/uploader";
import { watchLocation, type Fix } from "@/lib/client/location";

export type MilestoneView = { id: string; title: string; kind: string; target: number; tranche: number };
type Visit = { visitId: string; code: string; expiresAt: string; ticket: string };
type Stage = "intro" | "code" | "camera" | "finish";

export function CaptureFlow({
  token,
  project,
  milestones,
}: {
  token: string;
  project: { name: string; site: string; owner: string };
  milestones: MilestoneView[];
}) {
  const [stage, setStage] = useState<Stage>("intro");
  const [milestoneId, setMilestoneId] = useState(milestones[0]?.id);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [, force] = useState(0);
  const [reading, setReading] = useState<{ done: number; total: number } | null>(null);
  const uploader = useRef<Uploader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const fix = useRef<Fix | null>(null);
  const stopWatch = useRef<(() => void) | null>(null);
  const milestone = milestones.find((m) => m.id === milestoneId);

  useEffect(() => () => stopWatch.current?.(), []);

  async function start() {
    setStarting(true);
    setError(null);
    // Ask for location on the tap (iOS wants a gesture) and keep the best fix
    // while the foreman walks; it goes with the finished visit.
    stopWatch.current?.();
    fix.current = null;
    stopWatch.current = watchLocation((f) => (fix.current = f));
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, milestoneId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't start the visit");
      setVisit(body);
      uploader.current?.dispose();
      uploader.current = new Uploader(body.visitId, body.ticket, () => force((n) => n + 1));
      setStage("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the visit");
    } finally {
      setStarting(false);
    }
  }

  async function picked(file: File | undefined) {
    if (!file || !uploader.current) return;
    const up = uploader.current;
    setReading({ done: 0, total: 1 });
    setStage("finish");
    try {
      const frames = await framesFromFile(file, (done, total) => setReading({ done, total }));
      frames.forEach((f) => up.add(f.blob));
    } catch (e) {
      up.fatal = e instanceof Error ? e.message : "Couldn't read that video";
    }
    setReading(null);
    force((n) => n + 1);
  }

  if (stage === "camera" && visit && uploader.current) {
    const up = uploader.current;
    const lastFrame = [...up.frames].reverse().find((f) => f.blocks !== undefined);
    return (
      <Camera
        code={visit.code}
        uploader={up}
        liveCount={lastFrame?.blocks ?? null}
        counted={up.counted}
        onCancel={() => setStage("code")}
        onDone={() => setStage("finish")}
        onFallback={() => fileInput.current?.click()}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
      <header className="flex h-11 items-center justify-between">
        <Logo />
        <span className="rounded-full border border-line px-2.5 py-1 text-[12px] text-muted">Site visit</span>
      </header>

      <input
        ref={fileInput}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => void picked(e.target.files?.[0])}
      />

      {stage === "intro" && (
        <section key="intro" className="animate-rise flex flex-1 flex-col pt-8">
          <Eyebrow>{project.site}</Eyebrow>
          <h1 className="font-display mt-2 text-[30px] font-semibold leading-[1.1]">Record today&rsquo;s site visit</h1>
          <p className="mt-2 text-[15px] text-muted">
            {project.name} &middot; for {project.owner}
          </p>

          <div className="mt-6 space-y-2">
            <Eyebrow>This visit is for</Eyebrow>
            <div className="space-y-2">
              {milestones.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMilestoneId(m.id)}
                  className={`flex w-full items-center justify-between rounded-[10px] border px-4 py-3 text-left transition-colors ${
                    m.id === milestoneId ? "border-accent bg-accent-soft" : "border-line bg-surface"
                  }`}
                >
                  <span>
                    <span className="block text-[15px] font-medium">{m.title}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">
                      {m.kind === "openings" ? "Openings" : "Blocks"} target{" "}
                      <span className="font-mono tnum text-text">{m.target.toLocaleString()}</span>
                    </span>
                  </span>
                  <span className="font-mono tnum text-[13px] text-muted">{naira(m.tranche)}</span>
                </button>
              ))}
            </div>
          </div>

          <ol className="mt-7 space-y-4">
            <HowTo n={1} icon={<KeyRound size={16} strokeWidth={1.75} />} title="Get a one-time code">
              Write it on a block with chalk or marker.
            </HowTo>
            <HowTo n={2} icon={<Footprints size={16} strokeWidth={1.75} />} title="Show the code, then walk the wall">
              One slow step a second, phone upright, wall filling the screen.
            </HowTo>
            <HowTo n={3} icon={<Send size={16} strokeWidth={1.75} />} title="Send">
              Counting runs while you walk, and {project.owner} gets the report. The phone&rsquo;s location is sent with it.
            </HowTo>
          </ol>

          <div className="mt-auto space-y-3 pt-8">
            {error && <p className="text-[14px] text-bad">{error}</p>}
            <Button onClick={start} disabled={starting || !milestone}>
              {starting ? "Starting…" : "Start visit"}
              <ArrowRight size={18} strokeWidth={1.75} />
            </Button>
            {milestone && (
              <p className="text-center text-[12px] text-muted">
                {naira(milestone.tranche)} is released when this visit is verified.
              </p>
            )}
          </div>
        </section>
      )}

      {stage === "code" && visit && (
        <CodeStep
          visit={visit}
          onCamera={() => setStage("camera")}
          onUpload={() => fileInput.current?.click()}
        />
      )}

      {stage === "finish" && visit && uploader.current && (
        <Processing
          visitId={visit.visitId}
          ticket={visit.ticket}
          uploader={uploader.current}
          tick={uploader.current.frames.length + uploader.current.counted}
          reading={reading}
          location={() => fix.current}
        />
      )}
    </main>
  );
}

function HowTo({ n, icon, title, children }: { n: number; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted">
        {icon}
      </span>
      <span>
        <span className="block text-[15px] font-medium">
          <span className="font-mono tnum mr-1.5 text-muted">{n}</span>
          {title}
        </span>
        <span className="mt-0.5 block text-[14px] leading-snug text-muted">{children}</span>
      </span>
    </li>
  );
}

function CodeStep({ visit, onCamera, onUpload }: { visit: Visit; onCamera: () => void; onUpload: () => void }) {
  const left = useCountdown(visit.expiresAt);
  const expired = left <= 0;
  const mm = String(Math.floor(Math.max(left, 0) / 60)).padStart(2, "0");
  const ss = String(Math.max(left, 0) % 60).padStart(2, "0");

  return (
    <section key="code" className="animate-rise flex flex-1 flex-col pt-8">
      <Eyebrow>Step 1 of 3</Eyebrow>
      <h1 className="font-display mt-2 text-[28px] font-semibold leading-[1.1]">Write this code on a block</h1>
      <p className="mt-2 text-[15px] text-muted">Big and clear, on the first block you&rsquo;ll film. It proves this walk was filmed today, for this visit.</p>

      <div className="mt-8 grid grid-cols-4 gap-2" aria-label={`Visit code ${visit.code.split("").join(" ")}`}>
        {visit.code.split("").map((ch, i) => (
          <span
            key={i}
            className="font-mono flex aspect-[4/5] items-center justify-center rounded-[10px] border border-line bg-surface text-[44px] font-medium"
            style={{ animation: `rise 420ms ${80 * i}ms both cubic-bezier(.2,.7,.2,1)` }}
          >
            {ch}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[13px]">
        <span className="text-muted">One-time code</span>
        <span className={`font-mono tnum ${expired ? "text-bad" : "text-muted"}`}>
          {expired ? "Expired" : `Valid for ${mm}:${ss}`}
        </span>
      </div>

      <Card className="mt-6 flex items-center gap-4 p-4">
        <ChalkBlock code={visit.code} />
        <p className="text-[14px] leading-snug text-muted">
          Start the walk on this block. Hold it in frame for two seconds, then walk.
        </p>
      </Card>

      <div className="mt-auto space-y-2 pt-8">
        <Button onClick={onCamera} disabled={expired}>
          It&rsquo;s on the wall, open camera
          <ArrowRight size={18} strokeWidth={1.75} />
        </Button>
        <Button variant="ghost" size="md" onClick={onUpload} disabled={expired}>
          <Upload size={16} strokeWidth={1.75} />
          Pick a video instead
        </Button>
      </div>
    </section>
  );
}

/** A sandcrete block with the code chalked on it. */
function ChalkBlock({ code }: { code: string }) {
  return (
    <svg width="104" height="56" viewBox="0 0 104 56" className="shrink-0" aria-hidden>
      <rect x="1" y="1" width="102" height="54" rx="3" fill="#8f8c86" />
      <g fill="#7d7a74">
        {Array.from({ length: 28 }, (_, i) => (
          <circle key={i} cx={(i * 37) % 100 + 2} cy={(i * 23) % 52 + 2} r={i % 3 === 0 ? 1.4 : 0.9} />
        ))}
      </g>
      <text
        x="52"
        y="35"
        textAnchor="middle"
        fontFamily="var(--font-plex-mono), monospace"
        fontSize="19"
        fontWeight="600"
        fill="#f4f2ec"
        transform="rotate(-4 52 30)"
        letterSpacing="2"
      >
        {code}
      </text>
    </svg>
  );
}

function useCountdown(iso: string): number {
  const [left, setLeft] = useState(() => Math.round((Date.parse(iso) - Date.now()) / 1000));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.round((Date.parse(iso) - Date.now()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [iso]);
  return left;
}
