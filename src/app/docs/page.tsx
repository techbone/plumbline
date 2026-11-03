import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Docs" };

const REPO = "https://github.com/techbone/plumbline";
const VIDEO = "https://youtu.be/xlCYNuYCelE";

const SECTIONS = [
  ["try", "Try it on any wall"],
  ["visit", "What happens on a visit"],
  ["report", "Reading a report"],
  ["count", "How accurate is the count"],
  ["limits", "What it doesn't do"],
  ["data", "Data and privacy"],
  ["built", "Built with"],
] as const;

/** Plain documentation for owners, foremen and anyone judging the app. */
export default function DocsPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-8">
      <header className="flex h-16 items-center justify-between">
        <Link href="/" aria-label="Plumbline home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-[14px]">
          <a href={REPO} className="hidden h-9 items-center rounded-[6px] px-3 text-muted hover:text-text sm:inline-flex">
            Code
          </a>
          <Link href="/new" className="inline-flex h-9 items-center rounded-[6px] border border-line bg-surface px-3 font-medium">
            Set up a site
          </Link>
        </nav>
      </header>

      <div className="grid grid-cols-1 gap-10 pb-20 pt-8 lg:grid-cols-12 lg:pt-12">
        <aside className="hidden lg:col-span-3 lg:block">
          <nav className="sticky top-8 flex flex-col gap-0.5 text-[14px]" aria-label="On this page">
            <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-muted">On this page</p>
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-[6px] py-1.5 text-muted hover:text-text">
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 lg:col-span-9 lg:max-w-[760px]">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">Docs</p>
          <h1 className="font-display mt-3 text-[40px] font-semibold leading-[1.05] tracking-[-0.02em]">How Plumbline works</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">
            Plumbline turns a foreman&rsquo;s phone walk along a wall into a block count the owner can check before sending the next
            payment. This page covers how a visit works, how to read a report, and how far to trust the count.
          </p>

          <Section id="try" title="Try it on any wall">
            <p>You need a phone with a camera, any block wall (a fence, a garden wall, a site down the road), paper and a marker.</p>
            <ol className="mt-4 space-y-3">
              <Step n="1">
                Open <Link href="/new" className="font-medium text-text underline underline-offset-2">Set up a site</Link>. Name the
                wall and enter how many blocks it should have: count the rows and the blocks in one row, and multiply.
              </Step>
              <Step n="2">On the site page, scan the QR code with your phone, or send the link to the foreman. Allow camera and location.</Step>
              <Step n="3">
                Tap Start visit. Write the four-character code on paper, tape it to the wall, film it for two seconds, then walk slowly
                along the wall, one step a second, keeping the wall between the guide lines.
              </Step>
              <Step n="4">Stop at the end. The report is ready about a minute later. Open any frame and count the numbered blocks yourself.</Step>
            </ol>
            <p className="mt-4">
              No install and no account. Test sites, and their reports, are readable by anyone who has the link. To see finished
              reports without walking, open the{" "}
              <Link href="/r/vis_55dbb8c2d7d2" className="font-medium text-text underline underline-offset-2">Karsana report</Link> or the{" "}
              <Link href="/p/demo" className="font-medium text-text underline underline-offset-2">demo site</Link>.
            </p>
          </Section>

          <Section id="visit" title="What happens on a visit">
            <Table
              head={["Step", "What happens", "Done by"]}
              rows={[
                ["Code", "A one-time, four-character code, valid for 30 minutes. Letters that are easy to confuse (0 O Q, 1 I L) are never used.", "Server, signed ticket"],
                ["Walk", "The phone sends a still every half second, never a video: shortest side 540 px, about 170 KB each, up to 240 stills (two minutes).", "Phone"],
                ["Count", "Each still is counted as it arrives, so the count on screen climbs during the walk.", "SAM 3.1, prompt “concrete block”"],
                ["Stitch", "The server reloads every still and count it stored (it never trusts the phone’s numbers), measures how far the wall slid between stills, lays them on one wall and merges sightings of the same block. Close-ups of the code are left out.", "Our code, unit-tested"],
                ["Code check", "Reads the code in the opening stills without being told what it should be, then we compare.", "Muse Spark 1.3"],
                ["Same site", "Compares a still from this visit with one from the last visit to the same site, by fixed landmarks.", "Muse Spark 1.3"],
                ["Site notes", "Looks at four stills spread along the walk and notes the stage of work and anything worth a look, each tied to a frame.", "Muse Spark 1.3"],
                ["Location", "The first visit with a precise GPS fix and a readable code sets the site pin. Later visits are measured against it.", "Phone GPS"],
                ["Verdict", "The release rule below turns all of that into one status.", "Our code, unit-tested"],
              ]}
            />
          </Section>

          <Section id="report" title="Reading a report">
            <p>The verdict comes first. It is decided by a fixed rule, in this order:</p>
            <Table
              head={["Verdict", "When"]}
              rows={[
                [<Chip key="n" tone="bad">Not verified</Chip>, "The code wasn’t read, or was more than one character off. Nothing else matters: an old video can’t carry today’s code."],
                [<Chip key="v" tone="ok">Verified</Chip>, "The code was read and the confirmed blocks meet the milestone target, and no other check is held."],
                [<Chip key="r" tone="warn">Needs a check</Chip>, "The count needs the seen-once blocks to reach the target, or the code was one character off, or a check was held: the phone was far from the site pin or didn’t share its location, or the site looks different from last time."],
                [<Chip key="s" tone="bad">Short of target</Chip>, "Even counting the seen-once blocks, the wall is short of the target."],
              ]}
            />
            <p className="mt-5">
              <b className="font-semibold text-text">Confirmed and seen once.</b> A block seen in two or more stills is confirmed. A block
              seen in only one goes in a separate count for a person to check, because it could be a mis-detection. Only confirmed blocks
              can verify a visit.
            </p>
            <p className="mt-3">
              <b className="font-semibold text-text">The stitched wall.</b> Every still is laid on one wall and every block numbered:
              solid orange is confirmed, amber is seen once. Untick Show photos to see the boxes alone. Frames named in the site notes open at full size.
            </p>
            <p className="mt-3">
              <b className="font-semibold text-text">Site notes</b> never change the verdict. They point at frames worth opening.
            </p>
            <p className="mt-3">
              <b className="font-semibold text-text">Reports are written once.</b> Nobody can edit one after it&rsquo;s issued, including us.
            </p>
          </Section>

          <Section id="count" title="How accurate is the count">
            <p>
              We hand-counted one wall we walked, in Karsana, Abuja: 370 blocks. A first pass had given 340, so a careful hand count of a
              wall this size can vary by about 8%.
            </p>
            <Table
              head={["Count", "Blocks", "Against 370"]}
              mono
              rows={[
                ["Report, stitched and confirmed", "372", "+0.5%"],
                ["Overlapping boxes merged", "357", "−3.5%"],
                ["Our geometry estimate, before the hand count", "~330", "−11%"],
              ]}
            />
            <p className="mt-4">
              The report matched. We say it plainly anyway: where the foreman stood further back, some boxes overlap and may count a block
              twice, and SAM skips some dirty or shaded blocks. On this wall the two cancelled out; on another they may not. It is one wall,
              counted by the person who built the tool. The other walks have no hand count.
            </p>
          </Section>

          <Section id="limits" title="What it doesn't do">
            <ul className="space-y-2">
              <Bullet>Counts blocks in walls you walk along. Columns, openings and roofs aren&rsquo;t counted.</Bullet>
              <Bullet>Assumes you walk parallel to the wall. Turning a corner or filming at a steep angle can double count or miss.</Bullet>
              <Bullet>Moves no money. The report is a recommendation for the owner, not a payment.</Bullet>
              <Bullet>GPS comes from the phone and can be faked by a determined foreman; the code and the same-site check carry more weight.</Bullet>
              <Bullet>No accounts. A site is protected only by its unguessable link.</Bullet>
              <Bullet>Spoken codes in Yoruba, Hausa, Igbo or Pidgin aren&rsquo;t supported: the code is written, not spoken.</Bullet>
            </ul>
          </Section>

          <Section id="data" title="Data and privacy">
            <ul className="space-y-2">
              <Bullet>Stored for each visit: the stills, SAM&rsquo;s boxes for each, the report, and the phone&rsquo;s best GPS fix. The first located visit&rsquo;s coordinates are kept, privately, as the site pin.</Bullet>
              <Bullet>A report shows the distance from the site pin and the GPS accuracy, never coordinates.</Bullet>
              <Bullet>Stills and reports are readable by anyone with the link. Don&rsquo;t film people or anything private.</Bullet>
            </ul>
          </Section>

          <Section id="built" title="Built with">
            <Table
              head={["Model", "Used for", "Model ID"]}
              rows={[
                ["SAM 3.1", "Finding every block in every still", <code key="s" className="font-mono text-[12px] sm:text-[13px]">sam-3.1</code>],
                ["Muse Spark 1.3", "Reading the code, same-site check, site notes", <code key="m" className="font-mono text-[12px] sm:text-[13px]">muse-spark-1.3</code>],
              ]}
            />
            <p className="mt-4">
              Both through Meta&rsquo;s Model API, <code className="font-mono text-[13px]">POST /v1/responses</code>. Next.js on Vercel, stills and reports in Cloudflare R2, no database. Built for the Meta Global AI Developer Hackathon.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={VIDEO} className="inline-flex h-11 items-center gap-2 rounded-[6px] bg-accent px-4 text-[15px] font-medium text-accent-ink">
                Watch the demo <ArrowUpRight size={17} strokeWidth={1.75} />
              </a>
              <a href={REPO} className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-line bg-surface px-4 text-[15px] font-medium">
                Source and architecture <ArrowUpRight size={17} strokeWidth={1.75} />
              </a>
              <Link href="/new" className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-line bg-surface px-4 text-[15px] font-medium">
                Set up a site <ArrowRight size={17} strokeWidth={1.75} />
              </Link>
            </div>
          </Section>
        </article>
      </div>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-6 border-t border-line pt-8 text-[15px] leading-relaxed text-muted">
      <h2 className="font-display mb-4 text-[28px] font-semibold tracking-[-0.02em] text-text">{title}</h2>
      {children}
    </section>
  );
}

function Step({ n, children }: { n: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[28px_1fr] gap-2">
      <span className="font-mono tnum text-[13px] leading-[1.7] text-accent">0{n}</span>
      <span>{children}</span>
    </li>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="grid grid-cols-[16px_1fr] gap-2">
      <span className="mt-[10px] h-1 w-1 rounded-full bg-muted" />
      <span>{children}</span>
    </li>
  );
}

function Chip({ tone, children }: { tone: "ok" | "warn" | "bad"; children: ReactNode }) {
  const c = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad" }[tone];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${c}`}>{children}</span>;
}

function Table({ head, rows, mono = false }: { head: string[]; rows: ReactNode[][]; mono?: boolean }) {
  return (
    <div className="mt-2 overflow-x-auto rounded-[10px] border border-line bg-surface">
      <table className="w-full text-left text-[13px] sm:min-w-[520px] sm:text-[14px]">
        <thead className="border-b border-line text-[12px] text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2.5 font-medium sm:px-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line align-top last:border-0">
              {r.map((cell, j) => (
                <td key={j} className={`px-3 py-3 sm:px-4 ${j === 0 ? "font-medium text-text sm:whitespace-nowrap" : "text-muted"} ${mono && j > 0 ? "font-mono tnum whitespace-nowrap" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
