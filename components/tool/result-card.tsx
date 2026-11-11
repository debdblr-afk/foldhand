"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, Download, FileArchive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolCard } from "@/components/ui/tool-card";
import { formatBytes, plural } from "@/lib/format";
import { zipOutputs } from "@/lib/pdf/client";
import type { OutputFile } from "@/lib/pdf/types";
import { TOOLS, type ToolSlug } from "@/lib/tools";

type Props = {
  headline: string;
  outputs: OutputFile[];
  /** Name for the zip when there are several files. */
  zipName: string;
  /** Tools worth offering next. */
  next: ToolSlug[];
  onSaved: () => void;
  onStartOver: () => void;
};

const big = "inline-flex h-16 w-full max-w-[320px] items-center justify-center gap-3 rounded-lg bg-accent px-8 text-lg text-on-accent shadow-raised transition-colors duration-(--t-motion-fast) hover:bg-accent-hover";

/** Makes download links for the files and releases them when the screen goes away. */
function useLinks(blobs: Blob[]): string[] {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const made = blobs.map((b) => URL.createObjectURL(b));
    setUrls(made);
    return () => made.forEach((u) => URL.revokeObjectURL(u));
  }, [blobs]);
  return urls;
}

/** The result screen (S06): one download button, or a list with "download all", then ways to carry on. */
export function ResultCard({ headline, outputs, zipName, next, onSaved, onStartOver }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [blobs] = useState(() => outputs.map((o) => o.blob));
  const urls = useLinks(blobs);
  const [zipping, setZipping] = useState(false);
  // Move focus to the result so keyboard and screen-reader users land on it.
  useEffect(() => heading.current?.focus(), []);

  async function downloadAll() {
    setZipping(true);
    try {
      const url = URL.createObjectURL(await zipOutputs(outputs));
      const a = document.createElement("a");
      a.href = url;
      a.download = zipName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      onSaved();
    } finally {
      setZipping(false);
    }
  }

  const single = outputs.length === 1 ? outputs[0] : null;

  return (
    <section className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-4 py-10 text-center">
      <CircleCheck aria-hidden className="size-12 text-success" />
      <h1 ref={heading} tabIndex={-1} className="text-xl outline-none md:text-2xl">{headline}</h1>
      {single ? (
        <>
          <p className="tabnums text-md text-text-muted"><span className="break-all">{single.name}</span> · {formatBytes(single.size)}</p>
          {single.detail && <p className="tabnums text-sm">{single.detail}</p>}
          <a href={urls[0]} download={single.name} onClick={onSaved} className={`mt-2 ${big}`}>
            <Download aria-hidden className="size-6" /> Download
          </a>
        </>
      ) : (
        <>
          <p className="tabnums text-md text-text-muted">{plural(outputs.length, "file")} · {formatBytes(outputs.reduce((n, o) => n + o.size, 0))}</p>
          <Button size="lg" loading={zipping} icon={<FileArchive aria-hidden className="size-6" />} className="mt-2 w-full max-w-[320px]" onClick={downloadAll}>
            Download all (zip)
          </Button>
          <ul aria-label="Files" className="mt-2 flex w-full flex-col gap-2 text-left">
            {outputs.map((o, i) => (
              <li key={o.name} className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" title={o.name}>{o.name}</p>
                  <p className="tabnums text-xs font-normal text-text-muted">{o.detail ?? formatBytes(o.size)}</p>
                </div>
                <a href={urls[i]} download={o.name} aria-label={`Download ${o.name}`} className="grid size-11 shrink-0 place-items-center rounded-pill text-accent hover:bg-surface-hover">
                  <Download aria-hidden className="size-5" />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
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
