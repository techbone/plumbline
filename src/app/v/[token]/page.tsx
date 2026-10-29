import { notFound } from "next/navigation";
import { CaptureFlow } from "@/components/capture/capture-flow";
import { milestonesFor, projectByToken } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Site visit" };

export default async function CapturePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = projectByToken(token);
  if (!project) notFound();
  const milestones = milestonesFor(project.id);

  return (
    <CaptureFlow
      token={token}
      project={{ name: project.name, site: project.site, owner: project.owner_name }}
      milestones={milestones.map((m) => ({ id: m.id, title: m.title, kind: m.kind, target: m.target, tranche: m.tranche_ngn }))}
    />
  );
}
