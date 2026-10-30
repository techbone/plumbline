import { notFound } from "next/navigation";
import { CaptureFlow } from "@/components/capture/capture-flow";
import { getProject } from "@/lib/projects";

export const metadata = { title: "Site visit" };

export default async function CapturePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await getProject(token);
  if (!project) notFound();

  return (
    <CaptureFlow
      token={token}
      project={{ name: project.name, site: project.site, owner: project.owner }}
      milestones={project.milestones.map((m) => ({ id: m.id, title: m.title, kind: m.kind, target: m.target, tranche: m.trancheNgn }))}
    />
  );
}
