import Link from "next/link";
import { Logo } from "@/components/logo";
import { NewSiteForm } from "@/components/owner/new-site-form";

export const metadata = { title: "Set up a site" };

export default function NewSitePage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[560px] px-4 pb-16 pt-5 sm:px-8">
      <header className="flex h-11 items-center">
        <Link href="/" aria-label="Plumbline home">
          <Logo />
        </Link>
      </header>
      <section className="pt-8">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">Owner</p>
        <h1 className="font-display mt-2 text-[30px] font-semibold leading-[1.1]">Set up a site</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Name the wall, say how many blocks it should have, and what you pay when it does. You get a link for the foreman and a page
          where every visit lands. Any block wall works for a test: a fence, a garden wall, a site down the road.
        </p>
        <NewSiteForm />
      </section>
    </main>
  );
}
