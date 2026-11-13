import Link from "next/link";
import { ChevronDown, Combine, FolderInput, Gift, KeyRound, Languages, Layers, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The part of the home page for someone who stops to ask "what is the catch?". Every claim here is one the
 * product has been tested against (see test-plan.md in the planning folder); nothing aspirational, no
 * testimonials, no counts. Copy follows the voice guide in brand.md.
 */

function Section({ id, title, children, className }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn("mx-auto flex w-full max-w-[960px] flex-col gap-6 border-t border-border pt-12", className)}>
      <h2 id={id} className="text-xl">{title}</h2>
      {children}
    </section>
  );
}

const DIFFERENT: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Gift, title: "Free with no catch", text: "No account, no limit on files, no payment step and no ads." },
  { icon: ShieldCheck, title: "Files stay on your device", text: "Nothing is uploaded. Not even to a server that promises to delete it afterwards." },
  { icon: KeyRound, title: "Locked files are fine", text: "Type the password when asked. It is used on this device and goes nowhere." },
  { icon: Layers, title: "Keep going without starting over", text: "The result moves into the next tool in one click, several files at once." },
  { icon: FolderInput, title: "Big files, tested", text: "A 96 MB, 42-page scan was shrunk to about 10 MB in a few seconds on a laptop." },
  { icon: Languages, title: "Watermarks in your language", text: "Hindi, Odia, Tamil, Russian, Greek and more, as well as English." },
];

const FAQ: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "Is it really free? Who pays for it?",
    a: "Yes. Your own device does the work, so there are no servers processing files and running it costs very little. If that ever changes, this page will say so before it does. Some other tools are free too, funded by ads and by processing your files on their servers; this one has neither.",
  },
  { q: "Are my files uploaded anywhere?", a: "No. The tools run in this browser tab, and nothing you add is sent anywhere. The Privacy page has the details." },
  {
    q: "Is there a limit on file size or number of files?",
    a: "Not one that we set. The limit is your device's memory. A 96 MB, 42-page scan worked on a laptop; phones have less room, so a warning appears before a very large job.",
  },
  {
    q: "Why did Compress barely shrink my file?",
    a: "Compress shrinks the photos and scans inside a PDF. A file that is mostly text is already small, and some scanners store pages in a way this tool leaves alone. It tells you when a file could not be made smaller.",
  },
  { q: "Can I use it on my phone?", a: "The pages fit a phone screen and the tools work there, but it has been tested at phone size on a computer, not yet on many real phones. Very large files are safer on a computer." },
  { q: "Does it work with password-protected PDFs?", a: <>Yes. You will be asked for the password. To lock a file again afterwards, use <Link href="/protect">Add a password</Link>. Other questions are answered on the <Link href="/help">Help page</Link>.</> },
];

const CANNOT = [
  "Convert PDFs to Word, Excel or PowerPoint, or read the text in scanned pages.",
  "Edit the existing text in a PDF or fill in forms. It can add text as a watermark or page number.",
  "Sign documents or ask other people to sign.",
  "Stamp Chinese, Japanese, Korean, Arabic or Hebrew text yet.",
];

export function LandingSections() {
  return (
    <div className="flex flex-col gap-16 pt-8 [&_a:not([class])]:font-semibold [&_a:not([class])]:text-accent [&_a:not([class])]:underline">
      <Section id="problem" title="Free, until the last step">
        <div className="grid gap-4 md:grid-cols-2">
          <p>Plenty of PDF tools say they are free, let you do all the work, and then ask for money to save the result, or stop you at a small number of files.</p>
          <p>Others sell a yearly plan that is easy to take out, quiet to renew, and hard to get back. And almost all of them want your documents on their servers first.</p>
        </div>
      </Section>

      <Section id="how" title="How it works">
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ["Pick a tool", "Eleven of them, one job each."],
            ["Add your files", "Choose them or drop them on the page. They are read here, in your browser."],
            ["Download", "The result is made on your device, so there is nothing to wait for on a server and nothing to delete afterwards."],
          ].map(([title, text], i) => (
            <li key={title} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
              <span aria-hidden className="grid size-8 place-items-center rounded-pill bg-accent-soft text-sm text-accent">{i + 1}</span>
              <h3 className="text-lg">{title}</h3>
              <p className="text-sm text-text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="different" title="What is different">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFERENT.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
              <Icon aria-hidden className="size-6 text-accent" />
              <h3 className="text-lg">{title}</h3>
              <p className="text-sm text-text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="cost" title="What it costs">
        <p className="max-w-[720px] text-md">
          Nothing. There is one plan and it is free. Your device does the work, so there are no servers to pay for.
          If that ever changes, this page will say so before it does.
        </p>
      </Section>

      <Section id="cannot" title="What it does not do">
        <p className="max-w-[720px] text-text-muted">Better to know now than after you have added your files. Foldhand does not:</p>
        <ul className="flex max-w-[720px] list-disc flex-col gap-2 pl-5">
          {CANNOT.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </Section>

      <Section id="faq" title="Questions">
        <div className="flex max-w-[720px] flex-col gap-3">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-lg border border-border bg-surface px-5 py-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown aria-hidden className="size-5 shrink-0 text-text-muted transition-transform duration-(--t-motion-fast) group-open:rotate-180" />
              </summary>
              <div className="pb-2 pt-1 text-text-muted">{a}</div>
            </details>
          ))}
        </div>
      </Section>

      <Section id="start" title="Fix a PDF now" className="items-center pb-6 text-center">
        <Link
          href="/merge"
          className="inline-flex h-16 items-center justify-center gap-3 rounded-lg bg-accent px-8 text-lg font-semibold text-on-accent shadow-raised transition-colors duration-(--t-motion-fast) hover:bg-accent-hover"
        >
          <Combine aria-hidden className="size-6" /> Start with Merge
        </Link>
        <p className="text-sm text-text-muted">Free, with no limits. Files stay on this device.</p>
      </Section>
    </div>
  );
}
