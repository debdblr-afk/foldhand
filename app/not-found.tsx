import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Footer, TopNav } from "@/components/ui/shell";

export default function NotFound() {
  return (
    <>
      <TopNav />
      <main id="main" className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <FileQuestion aria-hidden className="size-12 text-text-muted" />
        <h1 className="text-xl">That page is not here</h1>
        <p className="text-text-muted">The link may be old or mistyped. Every tool is on the home page.</p>
        <Link href="/" className="inline-flex h-11 items-center rounded-pill bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover">See all tools</Link>
      </main>
      <Footer slim />
    </>
  );
}
