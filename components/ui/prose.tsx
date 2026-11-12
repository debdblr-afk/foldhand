import type { ReactNode } from "react";
import { Footer, TopNav } from "./shell";

/** Layout for the text pages: help, privacy, terms. */
export function ProsePage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <>
      <TopNav />
      <main id="main" className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 py-10 md:py-14">
        <h1 className="text-xl md:text-2xl">{title}</h1>
        <p className="text-md text-text-muted">{intro}</p>
        {children}
      </main>
      <Footer />
    </>
  );
}

export function Topic({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg">{title}</h2>
      <div className="flex flex-col gap-2 text-base [&_a]:font-semibold [&_a]:text-accent [&_a]:underline [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  );
}
