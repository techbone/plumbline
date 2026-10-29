/** Plumb bob on its line: the mark. Wordmark is lowercase Archivo. */
export function LogoMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
      <path d="M16 2v10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 12.5l6 7.4L16 30l-6-10.1z" fill="var(--accent)" />
      <path d="M16 12.5l6 7.4H10z" fill="#ff8a4c" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-text ${className}`}>
      <LogoMark size={22} />
      <span className="font-display text-[17px] font-semibold leading-none tracking-[-0.03em]">plumbline</span>
    </span>
  );
}
