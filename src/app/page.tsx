import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[1200px] flex-col px-4 py-5 sm:px-8">
      <header className="flex h-11 items-center">
        <Logo />
      </header>
      <section className="flex flex-1 flex-col justify-center py-16">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">For owners building from abroad</p>
        <h1 className="font-display mt-3 max-w-[16ch] text-[44px] font-semibold leading-[1.02] sm:text-[64px]">
          The contractor&rsquo;s video becomes the receipt.
        </h1>
        <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-muted">
          The foreman walks the wall with a one-time code. SAM 3.1 finds every block in every frame, we stitch the walk into one
          wall and count each block once, and the milestone pays only when the count is there.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/new" className="inline-flex h-11 items-center gap-2 rounded-[6px] bg-accent px-4 text-[15px] font-medium text-accent-ink">
            Try it on any block wall <ArrowRight size={17} strokeWidth={1.75} />
          </Link>
          <Link href="/p/demo" className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-line bg-surface px-4 text-[15px] font-medium">
            See the demo site
          </Link>
        </div>
        <p className="mt-4 max-w-[60ch] text-[13px] leading-relaxed text-muted">
          Trying it: set up a test site, scan the foreman link with your phone, write the code on paper, and walk any block wall for
          20 to 40 seconds. The report is ready about a minute after you stop.
        </p>
      </section>
    </main>
  );
}
