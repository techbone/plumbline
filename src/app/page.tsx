import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { WalkReplay } from "@/components/home/walk-replay";
import { Logo } from "@/components/logo";

const REPO = "https://github.com/techbone/plumbline";

/** What each step of a visit does, and the Meta model behind it. */
const STEPS = [
  {
    n: "01",
    title: "A code on the wall",
    body: "The visit opens with a one-time code written on a block. Muse Spark reads it blind, never told what to expect, so an old video can't pass as today's.",
    model: "muse-spark-1.3",
  },
  {
    n: "02",
    title: "Every still, counted while walking",
    body: "The phone sends a still every half second instead of a video. SAM 3.1 finds each block in each still as it arrives, so counting is done when the walk ends.",
    model: "sam-3.1",
  },
  {
    n: "03",
    title: "One wall, each block once",
    body: "The stills are laid side by side into one wall and sightings of the same block merged. Seen in two frames counts; seen once goes to a person to check.",
    model: "deterministic, tested",
  },
  {
    n: "04",
    title: "Checks before money moves",
    body: "GPS against the site pin, the same landmarks as the last visit, and site notes on cracks or unfinished work. A held check means review, never verified.",
    model: "muse-spark-1.3 · gps",
  },
];

/** Real walks recorded on the deployed app, including the ones that didn't pass. */
const WALKS = [
  { id: "vis_77d1c43227e3", what: "Boundary wall, 58 s walk", frames: 117, mb: 31.5, confirmed: 236, review: 21, code: "VRKE read", verdict: "Verified", tone: "ok" },
  { id: "vis_62077ef1a92a", what: "Boundary wall, 44 s walk", frames: 88, mb: 24.4, confirmed: 245, review: 35, code: "74RV read", verdict: "Verified", tone: "ok" },
  { id: "vis_60c648d2e671", what: "Boundary wall, 34 s walk", frames: 68, mb: 16.9, confirmed: 141, review: 13, code: "G3QH read as G3PH", verdict: "Short", tone: "bad" },
] as const;

export default function Home() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-8">
      <header className="flex h-16 items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-1 text-[14px]">
          <Link href="/p/demo" className="hidden h-9 items-center rounded-[6px] px-3 text-muted hover:text-text sm:inline-flex">
            Demo site
          </Link>
          <a href={REPO} className="hidden h-9 items-center rounded-[6px] px-3 text-muted hover:text-text sm:inline-flex">
            Code
          </a>
          <Link href="/new" className="inline-flex h-9 items-center rounded-[6px] border border-line bg-surface px-3 font-medium">
            Set up a site
          </Link>
        </nav>
      </header>

      <section className="grid grid-cols-1 items-center gap-12 pb-16 pt-8 lg:grid-cols-12 lg:pt-14">
        <div className="lg:col-span-7">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">For owners building from abroad</p>
          <h1 className="font-display mt-3 max-w-[15ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.02em] sm:text-[56px]">
            The contractor&rsquo;s video becomes the receipt.
          </h1>
          <p className="mt-5 max-w-[54ch] text-[17px] leading-relaxed text-muted">
            You&rsquo;re in London, the house is in Abuja, and the foreman says the wall is done. Plumbline turns their phone walk into a
            block count you can audit, frame by frame, before you send the next payment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/new" className="inline-flex h-11 items-center gap-2 rounded-[6px] bg-accent px-4 text-[15px] font-medium text-accent-ink">
              Try it on any block wall <ArrowRight size={17} strokeWidth={1.75} />
            </Link>
            <Link href={`/r/${WALKS[0].id}`} className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-line bg-surface px-4 text-[15px] font-medium">
              Read a real report
            </Link>
          </div>
          <dl className="mt-10 grid max-w-[560px] grid-cols-3 border-y border-line">
            <Stat label="Blocks counted on one walk" value="236" />
            <Stat label="Stills sent a second, never a video" value="2" />
            <Stat label="Report after stopping" value="~1 min" />
          </dl>
        </div>
        <div className="lg:col-span-5">
          <WalkReplay />
        </div>
      </section>

      <section className="border-t border-line py-14">
        <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em]">What happens on a visit</h2>
        <ol className="mt-8 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="border-t border-line pt-4">
              <p className="font-mono tnum text-[12px] text-muted">{s.n}</p>
              <h3 className="mt-2 text-[16px] font-semibold">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.body}</p>
              <p className="font-mono mt-3 text-[12px] text-accent">{s.model}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-line py-14">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em]">Walks recorded so far</h2>
          <p className="text-[14px] text-muted">On the live app, with a phone. The failed one stays in.</p>
        </div>
        <div className="mt-6 overflow-x-auto rounded-[10px] border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="border-b border-line text-[12px] text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Walk</th>
                <th className="px-4 py-2.5 text-right font-medium">Stills</th>
                <th className="px-4 py-2.5 text-right font-medium">Sent</th>
                <th className="px-4 py-2.5 text-right font-medium">Confirmed</th>
                <th className="px-4 py-2.5 text-right font-medium">To check</th>
                <th className="px-4 py-2.5 font-medium">Visit code</th>
                <th className="px-4 py-2.5 font-medium">Verdict</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {WALKS.map((w) => (
                <tr key={w.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    {w.what}
                    <span className="font-mono block text-[12px] text-muted">{w.id}</span>
                  </td>
                  <td className="font-mono tnum px-4 py-3 text-right">{w.frames}</td>
                  <td className="font-mono tnum px-4 py-3 text-right">{w.mb} MB</td>
                  <td className="font-mono tnum px-4 py-3 text-right">{w.confirmed}</td>
                  <td className="font-mono tnum px-4 py-3 text-right">{w.review}</td>
                  <td className="font-mono px-4 py-3 text-[13px]">{w.code}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium ${w.tone === "ok" ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>
                      {w.verdict}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a href={`/r/${w.id}`} className="inline-flex items-center gap-1 text-[13px] font-medium">
                      Report <ArrowUpRight size={14} strokeWidth={1.75} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-[80ch] text-[13px] leading-relaxed text-muted">
          The short walk failed for two reasons: a hand-written Q read as P (the code check did its job), and the walk covered less of the
          wall. Reports are saved once and never edited, so earlier ones keep the numbers they were issued with.
        </p>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-8 text-[13px] text-muted">
        <span>Built for the Meta Global AI Developer Hackathon with SAM 3.1 and Muse Spark.</span>
        <a href={REPO} className="inline-flex items-center gap-1 hover:text-text">
          Source on GitHub <ArrowUpRight size={14} strokeWidth={1.75} />
        </a>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse py-4 pr-4">
      <dt className="mt-1 text-[12px] leading-snug text-muted">{label}</dt>
      <dd className="font-mono tnum text-[22px] font-medium">{value}</dd>
    </div>
  );
}
