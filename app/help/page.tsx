import type { Metadata } from "next";
import { Footer, TopNav } from "@/components/ui/shell";

export const metadata: Metadata = { title: "Help" };

// Stub: the real text is written with the rest of the should-haves.
export default function Page() {
  return (
    <>
      <TopNav />
      <main id="main" className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-4 px-4 py-14">
        <h1 className="text-xl md:text-2xl">Help</h1>
        <p className="text-text-muted">This page is not written yet.</p>
        <p>Your files never leave this device. Every tool does its work inside this browser tab, and nothing is uploaded or stored.</p>
      </main>
      <Footer />
    </>
  );
}
