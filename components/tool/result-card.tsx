"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolCard } from "@/components/ui/tool-card";
import { formatBytes } from "@/lib/format";
import type { OutputFile } from "@/lib/pdf/types";
import { TOOLS, type ToolSlug } from "@/lib/tools";

type Props = {
  headline: string;
  output: OutputFile;
  /** Tools worth offering next. */
  next: ToolSlug[];
  onDownloaded: () => void;
  onStartOver: () => void;
};

/** The result screen (S06): one download button, then ways to carry on. */
export function ResultCard({ headline, output, next, onDownloaded, onStartOver }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  // The link is made and released by the same effect, so it is never left pointing at a released file.
  const [url, setUrl] = useState<string | undefined>();
  useEffect(() => {
    const made = URL.createObjectURL(output.blob);
    setUrl(made);
    return () => URL.revokeObjectURL(made);
  }, [output.blob]);
  // Move focus to the result so keyboard and screen-reader users land on it.
  useEffect(() => heading.current?.focus(), []);

  return (
    <section className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-4 py-10 text-center">
      <CircleCheck aria-hidden className="size-12 text-success" />
      <h1 ref={heading} tabIndex={-1} className="text-xl outline-none md:text-2xl">{headline}</h1>
      <p className="tabnums text-md text-text-muted"><span className="break-all">{output.name}</span> · {formatBytes(output.size)}</p>
      <a
        href={url}
        download={output.name}
        onClick={onDownloaded}
        className="mt-2 inline-flex h-16 w-full max-w-[320px] items-center justify-center gap-3 rounded-lg bg-accent px-8 text-lg text-on-accent shadow-raised transition-colors duration-(--t-motion-fast) hover:bg-accent-hover"
      >
        <Download aria-hidden className="size-6" /> Download
      </a>
      <Button variant="ghost" icon={<RotateCcw aria-hidden className="size-4" />} onClick={onStartOver}>Start over</Button>
      <div className="mt-6 flex w-full flex-col items-center gap-3 border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-text-muted">Other tools</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {TOOLS.filter((t) => next.includes(t.slug)).map((t) => <ToolCard key={t.slug} tool={t} compact />)}
        </div>
      </div>
    </section>
  );
}
