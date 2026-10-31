import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Report } from "@/components/report/report";
import { headlineText } from "@/lib/pipeline/verdict";
import { getResult } from "@/lib/pipeline/visit";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = /^vis_[0-9a-f]{12}$/.test(id) ? await getResult(id) : null;
  return {
    title: r ? `${r.meta.milestoneTitle}: ${headlineText(r.verdict)}` : "Report",
    description: r ? `Site visit report for ${r.meta.projectName}, ${r.meta.site}` : undefined,
  };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^vis_[0-9a-f]{12}$/.test(id)) notFound();
  const result = await getResult(id);
  if (!result) notFound();
  return <Report result={result} />;
}
