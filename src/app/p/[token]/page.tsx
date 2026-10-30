import Link from "next/link";
import { ArrowUpRight, MapPin, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Logo } from "@/components/logo";
import { CopyLink } from "@/components/owner/copy-link";
import { Card, Eyebrow, naira } from "@/components/ui";
import { projectHistory, sitePinned, type VisitSummary } from "@/lib/pipeline/visit";
import { getProject } from "@/lib/projects";
import { formatDistance } from "@/lib/verify/geo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const project = await getProject((await params).token);
  return { title: project ? `${project.name}: visits` : "Site" };
}

const TONE: Record<VisitSummary["status"], { chip: string; label: string }> = {
  verified: { chip: "bg-ok-soft text-ok", label: "Verified" },
  review: { chip: "bg-warn-soft text-warn", label: "Needs a check" },
  short: { chip: "bg-bad-soft text-bad", label: "Short" },
  not_verified: { chip: "bg-bad-soft text-bad", label: "Not verified" },
};

/** The owner's page for one site: the foreman's link, and every visit with its verdict. */
export default async function OwnerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await getProject(token);
  if (!project) notFound();

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const captureUrl = `${origin}/v/${project.captureToken}`;
  const [visits, pinned, qr] = await Promise.all([
    projectHistory(project.id),
    sitePinned(project.id),
    QRCode.toString(captureUrl, { type: "svg", margin: 0, color: { dark: "#1c1b19", light: "#ffffff" } }),
  ]);
  const paid = visits.filter((v) => v.status === "verified").length;

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[1200px] px-4 pb-16 pt-5 sm:px-8">
      <header className="flex h-11 items-center">
        <Link href="/" aria-label="Plumbline home">
          <Logo />
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-8 pt-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="min-w-0">
          <Eyebrow>
            {project.site} &middot; for {project.owner}
            {project.sandbox ? " · test site" : ""}
          </Eyebrow>
          <h1 className="font-display mt-2 text-[34px] font-semibold leading-[1.05] sm:text-[40px]">{project.name}</h1>
          <p className="mt-3 flex items-center gap-1.5 text-[14px] text-muted">
            <MapPin size={15} strokeWidth={1.75} />
            {pinned ? "Site pinned by the first located visit" : "Not pinned yet: the first visit with GPS sets the pin"}
          </p>

          <div className="mt-6 overflow-x-auto rounded-[10px] border border-line bg-surface">
            <table className="w-full min-w-[560px] text-left text-[14px]">
              <thead className="border-b border-line text-[12px] text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Milestone</th>
                  <th className="px-4 py-2.5 font-medium">Payment</th>
                  <th className="px-4 py-2.5 text-right font-medium">Block target</th>
                </tr>
              </thead>
              <tbody>
                {project.milestones.map((m) => (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">{m.title}</td>
                    <td className="font-mono tnum px-4 py-3">{naira(m.trancheNgn)}</td>
                    <td className="font-mono tnum px-4 py-3 text-right">{m.target.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex items-baseline justify-between">
            <h2 className="font-display text-[20px] font-semibold">Visits</h2>
            <p className="font-mono tnum text-[13px] text-muted">
              {visits.length} recorded &middot; {paid} verified
            </p>
          </div>
          {visits.length === 0 ? (
            <Card className="mt-3 p-6 text-center">
              <p className="text-[15px] font-medium">No visits yet</p>
              <p className="mt-1 text-[14px] text-muted">Send the foreman link. Each visit lands here with its verdict.</p>
            </Card>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-[10px] border border-line bg-surface">
              <table className="w-full min-w-[640px] whitespace-nowrap text-left text-[14px]">
                <thead className="border-b border-line text-[12px] text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">When</th>
                    <th className="px-4 py-2.5 font-medium">Milestone</th>
                    <th className="px-4 py-2.5 font-medium">Verdict</th>
                    <th className="px-4 py-2.5 text-right font-medium">Blocks</th>
                    <th className="px-4 py-2.5 text-right font-medium">From pin</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.visitId} className="border-b border-line last:border-0">
                      <td className="font-mono tnum whitespace-nowrap px-4 py-3 text-[13px] text-muted">
                        {new Date(v.finishedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })}
                      </td>
                      <td className="px-4 py-3">{v.milestoneTitle}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium ${TONE[v.status].chip}`}>
                          {TONE[v.status].label}
                        </span>
                      </td>
                      <td className="font-mono tnum px-4 py-3 text-right">
                        {v.confirmed.toLocaleString()}
                        <span className="text-muted"> / {v.target.toLocaleString()}</span>
                      </td>
                      <td className="font-mono tnum px-4 py-3 text-right text-muted">{v.distanceM === null ? "–" : formatDistance(v.distanceM)}</td>
                      <td className="px-4 py-3 text-right">
                        <a href={`/r/${v.visitId}`} className="inline-flex items-center gap-1 text-[13px] font-medium">
                          Report <ArrowUpRight size={14} strokeWidth={1.75} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="min-w-0">
          <Card className="p-5">
            <Eyebrow className="flex items-center gap-1.5">
              <Smartphone size={14} strokeWidth={1.75} /> Foreman&rsquo;s link
            </Eyebrow>
            <div className="mt-4 flex gap-5">
              <div
                className="h-[132px] w-[132px] shrink-0 rounded-[6px] border border-line bg-white p-2.5 [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
              <p className="text-[14px] leading-snug text-muted">
                Scan with a phone at the wall, or send the link on WhatsApp. It opens the camera flow; no app, no account.
              </p>
            </div>
            <p className="font-mono mt-4 break-all rounded-[6px] bg-surface-2 px-3 py-2 text-[12px]">{captureUrl}</p>
            <div className="mt-3 flex gap-2">
              <CopyLink url={captureUrl} />
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Site visit for ${project.name}: open this at the wall and follow the steps ${captureUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] border border-line bg-surface px-3.5 text-[14px] font-medium"
              >
                Send on WhatsApp
              </a>
            </div>
          </Card>
          <p className="mt-3 text-[12px] leading-snug text-muted">
            In this build the foreman&rsquo;s link and this page share one key, so anyone with either can see the visits.
          </p>
        </aside>
      </section>
    </main>
  );
}
