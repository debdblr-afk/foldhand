"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { FilePlus2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

type Props = {
  title: string;
  pitch: string;
  buttonLabel: string;
  /** Value for the file input's accept attribute, e.g. "application/pdf". */
  accept: string;
  /** Plain words for the accepted types, used in the rejection message, e.g. "PDF files". */
  acceptLabel: string;
  multiple?: boolean;
  busy?: boolean;
  onFiles: (files: File[]) => void;
  /** Called after onFiles with how many files were the wrong type, so a parent that replaces this view can still say so. */
  onRejected?: (count: number) => void;
};

function matches(file: File, accept: string) {
  return accept.split(",").map((a) => a.trim()).some((a) =>
    a.endsWith("/*") ? file.type.startsWith(a.slice(0, -1)) : a.startsWith(".") ? file.name.toLowerCase().endsWith(a) : file.type === a,
  );
}

/** The empty state of a tool page: one big button, and the whole area accepts dropped files. */
export function Dropzone({ title, pitch, buttonLabel, accept, acceptLabel, multiple, busy, onFiles, onRejected }: Props) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  function take(list: FileList | null) {
    const all = Array.from(list ?? []);
    const ok = all.filter((f) => matches(f, accept));
    const bad = all.length - ok.length;
    setRejected(bad ? `${bad === 1 ? "One file was" : `${bad} files were`} skipped. This tool takes ${acceptLabel}.` : null);
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
    if (bad) onRejected?.(bad);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files);
  }

  return (
    <section
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "mx-auto flex w-full max-w-[640px] flex-col items-center gap-4 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors duration-(--t-motion-fast)",
        over ? "border-accent bg-dropzone-active" : rejected ? "border-danger" : "border-transparent",
      )}
    >
      <h1 className="text-xl md:text-2xl">{title}</h1>
      <p className="text-md text-text-muted">{pitch}</p>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => { take(e.target.files); e.target.value = ""; }}
      />
      <Button size="lg" loading={busy} icon={<FilePlus2 aria-hidden className="size-6" />} className="mt-2 w-full max-w-[320px]" onClick={() => input.current?.click()}>
        {buttonLabel}
      </Button>
      <p className="text-sm text-text-muted">{over ? "Drop to add" : "or drop them anywhere here"}</p>
      <p className="inline-flex items-center gap-1.5 text-sm text-success">
        <ShieldCheck aria-hidden className="size-4" /> Files stay on this device. Nothing is uploaded.
      </p>
      <p role="alert" className="min-h-5 text-sm text-danger">{rejected}</p>
    </section>
  );
}
