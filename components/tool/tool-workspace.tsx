"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { ArrowDownAZ, ArrowUpZA, Combine, Plus } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Alert, Progress } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";
import { runMerge } from "@/lib/pdf/client";
import { inspect } from "@/lib/pdf/inspect";
import { ToolError, type ErrorCode, type InputFile, type OutputFile, type Rotation } from "@/lib/pdf/types";
import { FileGrid } from "./file-grid";
import { ResultCard } from "./result-card";

type Phase = "idle" | "processing" | "done";

const skippedText = (n: number) => `${n === 1 ? "One file was" : `${n} files were`} skipped. This tool takes PDF files.`;

const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

function explain(code: ErrorCode, fileName?: string): string {
  switch (code) {
    case "damaged-file": return `${fileName ?? "One file"} is damaged and could not be opened. Remove it and try again.`;
    case "locked-file": return `${fileName ?? "One file"} is locked with a password. Remove it and try again.`;
    case "too-few-files": return "Add at least two files to merge.";
    case "out-of-memory": return "These files are too large for this device to join in one go. Try fewer files at a time.";
    default: return "Something went wrong while joining the files. Nothing was lost; try again.";
  }
}

/** Merge, end to end: add files, arrange them, join them in a worker, download. */
export function MergeWorkspace() {
  const [files, setFiles] = useState<InputFile[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [output, setOutput] = useState<OutputFile | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "danger"; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  // Every thumbnail URL made in this session, so they can all be released.
  const urls = useRef(new Set<string>());

  useEffect(() => {
    const made = urls.current;
    return () => made.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  // Nothing is saved anywhere, so warn before a reload throws away work in progress or an unsaved result.
  useEffect(() => {
    if (phase !== "processing" && !(phase === "done" && !downloaded)) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase, downloaded]);

  const addFiles = useCallback((incoming: File[]) => {
    const pdfs = incoming.filter(isPdf);
    const skipped = incoming.length - pdfs.length;
    setNotice(skipped ? { tone: "danger", text: skippedText(skipped) } : null);
    const added: InputFile[] = pdfs.map((file) => ({
      id: crypto.randomUUID(), file, name: file.name, size: file.size, pageCount: null, rotation: 0, status: "reading", thumbnailUrl: null,
    }));
    if (!added.length) return;
    setFiles((current) => [...current, ...added]);
    // One at a time, so a big batch does not open every file at once.
    (async () => {
      for (const item of added) {
        const { status, pageCount, thumbnail } = await inspect(item.file);
        // If the file was removed while it was being read, these updates find nothing and are dropped.
        setFiles((current) => current.map((f) => (f.id === item.id ? { ...f, status, pageCount } : f)));
        thumbnail.then((thumbnailUrl) => {
          if (!thumbnailUrl) return;
          urls.current.add(thumbnailUrl);
          setFiles((current) => current.map((f) => (f.id === item.id ? { ...f, thumbnailUrl } : f)));
        });
      }
    })();
  }, []);

  const remove = (id: string) => setFiles((current) => current.filter((f) => f.id !== id));
  const rotate = (id: string, rotation: Rotation) => setFiles((current) => current.map((f) => (f.id === id ? { ...f, rotation } : f)));
  const sort = (direction: 1 | -1) =>
    setFiles((current) => [...current].sort((a, b) => direction * a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })));

  const reading = files.some((f) => f.status === "reading");
  const blocked = files.find((f) => f.status === "locked" || f.status === "damaged");

  async function run() {
    if (phase === "processing") return;
    if (files.length < 2) return setNotice({ tone: "info", text: explain("too-few-files") });
    if (blocked) return setNotice({ tone: "danger", text: explain(blocked.status === "locked" ? "locked-file" : "damaged-file", blocked.name) });
    setNotice(null);
    setProgress(0);
    setPhase("processing");
    try {
      const [result] = await runMerge(files, setProgress);
      setOutput(result);
      setDownloaded(false);
      setPhase("done");
    } catch (e) {
      setPhase("idle");
      setNotice({ tone: "danger", text: e instanceof ToolError ? explain(e.code, e.fileName) : explain("unknown") });
    }
  }

  function startOver() {
    setFiles([]);
    setOutput(null);
    setNotice(null);
    setPhase("idle");
  }

  function onDrop(e: DragEvent) {
    // Only react to files from outside the page, not to tiles being rearranged.
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  if (phase === "done" && output) {
    return (
      <main id="main" className="mx-auto w-full max-w-page flex-1 px-4 md:px-6">
        <ResultCard headline="Your merged PDF is ready" output={output} next={["compress", "organize", "page-numbers", "protect"]} onDownloaded={() => setDownloaded(true)} onStartOver={startOver} />
      </main>
    );
  }

  if (phase === "processing") {
    return (
      <main id="main" className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center gap-6 px-4 py-16">
        <h1 className="text-xl">Joining {plural(files.length, "file")}</h1>
        <Progress label={progress < 0.2 ? "Reading files" : progress < 0.95 ? "Joining pages" : "Finishing"} value={progress} />
        <p className="text-sm text-text-muted">This happens on your device. Keep this tab open.</p>
      </main>
    );
  }

  if (files.length === 0) {
    return (
      <main id="main" className="mx-auto flex w-full max-w-page flex-1 flex-col px-4 pt-8 md:px-6 md:pt-14">
        <Dropzone
          title="Merge PDFs"
          pitch="Join several PDFs into one file, in the order you choose."
          buttonLabel="Choose PDF files"
          accept="application/pdf,.pdf"
          acceptLabel="PDF files"
          multiple
          onFiles={addFiles}
          onRejected={(n) => setNotice({ tone: "danger", text: skippedText(n) })}
        />
      </main>
    );
  }

  const pages = files.reduce((n, f) => n + (f.pageCount ?? 0), 0);

  return (
    <main
      id="main"
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={onDrop}
      className="relative mx-auto flex w-full max-w-page flex-1 flex-col md:flex-row"
    >
      <input
        ref={picker}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
      />

      <section aria-label="Files" className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-6 pb-28 md:px-6 md:pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-lg">Merge PDFs</h1>
          <Button size="sm" variant="ghost" icon={<ArrowDownAZ aria-hidden className="size-4" />} onClick={() => sort(1)}>A to Z</Button>
          <Button size="sm" variant="ghost" icon={<ArrowUpZA aria-hidden className="size-4" />} onClick={() => sort(-1)}>Z to A</Button>
          <IconButton label="Add more files" variant="solid" onClick={() => picker.current?.click()}><Plus aria-hidden className="size-5" /></IconButton>
        </div>
        {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
        <FileGrid files={files} onReorder={setFiles} onRemove={remove} onRotate={rotate} />
      </section>

      <aside className="hidden w-[340px] shrink-0 flex-col gap-4 border-l border-border bg-surface p-6 md:flex">
        <h2 className="text-lg">Join in this order</h2>
        <p className="text-sm text-text-muted">Drag the files into the order you want. The first file becomes the first pages.</p>
        <p className="tabnums text-sm text-text-muted">{plural(files.length, "file")}{pages ? ` · ${plural(pages, "page")}` : ""}</p>
        <Button size="lg" className="mt-auto w-full" loading={reading} icon={<Combine aria-hidden className="size-6" />} onClick={run}>Merge files</Button>
      </aside>

      {/* On phones the main button stays under the thumb. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex h-[76px] items-center gap-3 border-t border-border bg-surface px-4 md:hidden">
        <span className="tabnums text-sm text-text-muted">{plural(files.length, "file")}</span>
        <Button className="h-12 flex-1" loading={reading} icon={<Combine aria-hidden className="size-5" />} onClick={run}>Merge files</Button>
      </div>

      <div aria-hidden className={cn("pointer-events-none absolute inset-2 z-30 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-dropzone-active text-lg text-accent transition-opacity duration-(--t-motion-fast)", dragOver ? "opacity-100" : "opacity-0")}>
        Drop to add
      </div>
    </main>
  );
}
