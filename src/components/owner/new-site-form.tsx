"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

const FIELDS = [
  { name: "name", label: "Project", placeholder: "Boundary wall and bungalow", initial: "Test wall" },
  { name: "site", label: "Where", placeholder: "Plot 14, Kuje, Abuja", initial: "" },
  { name: "owner", label: "Owner", placeholder: "Your name", initial: "" },
  { name: "milestoneTitle", label: "Milestone", placeholder: "Boundary wall, east run", initial: "Front wall, full run" },
] as const;

export function NewSiteForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, target: Number(form.target), trancheNgn: Number(String(form.trancheNgn).replace(/[^0-9]/g, "")) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't create the site");
      router.push(`/p/${body.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the site");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      {FIELDS.map((f) => (
        <Field key={f.name} label={f.label}>
          <input name={f.name} required maxLength={60} defaultValue={f.initial} placeholder={f.placeholder} className={input} />
        </Field>
      ))}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
        <Field label="Blocks in the wall" hint="Count rows × blocks per row">
          <input name="target" required type="number" inputMode="numeric" min={1} max={20000} defaultValue={100} className={`${input} font-mono tnum`} />
        </Field>
        <Field label="Payment on verify (₦)" hint="Shown on the report">
          <input name="trancheNgn" required inputMode="numeric" defaultValue="500,000" className={`${input} font-mono tnum`} />
        </Field>
      </div>
      {error && <p className="text-[14px] text-bad">{error}</p>}
      <div className="pt-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create site"}
          <ArrowRight size={18} strokeWidth={1.75} />
        </Button>
        <p className="mt-3 text-[12px] leading-snug text-muted">
          Test sites are public to anyone with the link. The first visit with a GPS fix pins the site; later visits are measured
          against it.
        </p>
      </div>
    </form>
  );
}

const input =
  "h-11 w-full min-w-0 rounded-[6px] border border-line bg-surface px-3 text-[15px] outline-none transition-colors placeholder:text-muted/60 focus:border-accent";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[13px] font-medium">{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}
