"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

export function CopyLink({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {}
      }}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] border border-line bg-surface px-3.5 text-[14px] font-medium"
    >
      {copied ? <Check size={16} strokeWidth={1.75} /> : <Link2 size={16} strokeWidth={1.75} />}
      {copied ? "Copied" : label}
    </button>
  );
}
