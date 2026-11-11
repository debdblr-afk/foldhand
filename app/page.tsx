import { HomeDirectory } from "@/components/tool/home-directory";
import { Footer, TopNav } from "@/components/ui/shell";

export default function Home() {
  return (
    <>
      <TopNav />
      <main id="main" className="mx-auto flex w-full max-w-page flex-1 flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <div className="mx-auto flex max-w-[720px] flex-col gap-3 text-center">
          <h1 className="text-xl md:text-display">PDF tools that run on your device</h1>
          <p className="text-md text-text-muted">Join, cut, shrink and tidy PDFs right in this tab. Nothing is uploaded, and there is no account to make.</p>
        </div>
        <HomeDirectory />
      </main>
      <Footer />
    </>
  );
}
