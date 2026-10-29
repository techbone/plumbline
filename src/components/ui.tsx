import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "inverse";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-[1.06] active:brightness-95",
  secondary: "bg-surface text-text border border-line hover:bg-surface-2",
  ghost: "text-muted hover:text-text",
  inverse: "bg-white/12 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20",
};

export function Button({
  variant = "primary",
  size = "lg",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "lg"; children: ReactNode }) {
  const sizing = size === "lg" ? "h-[52px] px-5 text-[15px]" : "h-10 px-4 text-sm";
  return (
    <button
      className={`inline-flex w-full select-none items-center justify-center gap-2 rounded-[6px] font-medium transition-[filter,background-color,color] disabled:pointer-events-none disabled:opacity-50 ${sizing} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[12px] font-medium uppercase tracking-[0.08em] text-muted ${className}`}>{children}</p>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[10px] border border-line bg-surface ${className}`}>{children}</div>;
}

export function naira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}
