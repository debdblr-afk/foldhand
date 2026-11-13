import { LandingSections } from "@/components/home/landing-sections";
import { HomeDirectory } from "@/components/tool/home-directory";
import { Footer, TopNav } from "@/components/ui/shell";

export default function Home() {
  return (
    <>
      <TopNav />
      <main id="main" className="mx-auto flex w-full max-w-page flex-1 flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <div className="mx-auto flex max-w-[720px] flex-col gap-3 text-center">
          <h1 className="text-xl md:text-display">Free PDF tools. Nothing to pay, nothing uploaded.</h1>
          <p className="text-md text-text-muted">Merge, split, shrink and tidy PDFs right in this tab. No account, no limit on files, and nothing asked for at the end. It can be free because your own device does the work.</p>
        </div>
        <HomeDirectory />
        <LandingSections />
      </main>
      <Footer />
    </>
  );
}
