"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { ArrowDownAZ, ArrowUpZA, Plus } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Alert } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";
import { runTool } from "@/lib/pdf/client";
import { inspect } from "@/lib/pdf/inspect";
import { explain } from "@/lib/pdf/messages";
import type { InputFile, Rotation } from "@/lib/pdf/types";
import type { ToolSlug } from "@/lib/tools";
import { CONFIGS } from "./configs";
import { FileGrid } from "./file-grid";
import { ResultCard } from "./result-card";
import { Processing, useTask } from "./task";

/** Does a dropped or picked file match an accept list such as "application/pdf,.pdf"? */
export function accepts(file: File, accept: string): boolean {
  return accept.split(",").some((a) => (a.startsWith(".") ? file.name.toLowerCase().endsWith(a) : file.type === a));
}

/** The shared screen for tools that take whole files: add, arrange, set options, run, download. */
export function ToolWorkspace({ slug }: { slug: ToolSlug }) {
  const config = CONFIGS[slug]!;
  const task = useTask();
  const [files, setFiles] = useState<InputFile[]>([]);
  const [options, setOptions] = useState(config.initial);
  const [optionError, setOptionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "danger"; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // Every preview URL made in this session, so they can all be released.
  const urls = useRef(new Set<string>());

  useEffect(() => {
    const made = urls.current;
    return () => made.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const skipped = (n: number) => ({ tone: "danger" as const, text: `${n === 1 ? "One file was" : `${n} files were`} skipped. This tool takes ${config.acceptLabel}.` });

  const addFiles = useCallback((incoming: File[]) => {
    const good = incoming.filter((f) => accepts(f, config.accept));
    const bad = incoming.length - good.length;
    const taken = config.multiple ? good : good.slice(0, 1);
    setNotice(bad ? skipped(bad) : !config.multiple && good.length > 1 ? { tone: "info", text: "This tool works on one file at a time, so only the first was added." } : null);
    if (!taken.length) return;
    const added: InputFile[] = taken.map((file) => {
      const isImage = config.kind === "image";
      const thumbnailUrl = isImage ? URL.createObjectURL(file) : null;
      if (thumbnailUrl) urls.current.add(thumbnailUrl);
      return { id: crypto.randomUUID(), file, name: file.name, size: file.size, kind: config.kind, pageCount: null, rotation: 0, status: isImage ? "ready" : "reading", thumbnailUrl };
    });
    setFiles((current) => (config.multiple ? [...current, ...added] : added));
    setOptionError(null);
    if (config.kind === "image") return;
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
    // The config for a slug never changes while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const remove = (id: string) => setFiles((current) => current.filter((f) => f.id !== id));
  const rotate = (id: string, rotation: Rotation) => setFiles((current) => current.map((f) => (f.id === id ? { ...f, rotation } : f)));
  const sort = (direction: 1 | -1) =>
    setFiles((current) => [...current].sort((a, b) => direction * a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })));

  const reading = files.some((f) => f.status === "reading");
  const blocked = files.find((f) => f.status === "locked" || f.status === "damaged");

  async function run() {
    if (files.length < config.minFiles) return setNotice({ tone: "info", text: config.minFiles > 1 ? explain("too-few-files") : "Add a file first." });
    if (blocked) return setNotice({ tone: "danger", text: explain(blocked.status === "locked" ? "locked-file" : "damaged-file", blocked.name) });
    const problem = config.check?.(options, files) ?? null;
    setOptionError(problem);
    if (problem) {
      // Take the person to the field that needs fixing.
      panel.current?.querySelector<HTMLElement>("[aria-invalid=true], input")?.focus();
      return;
    }
    setNotice(null);
    const error = await task.start((onProgress) => runTool(config.slug, files, options, onProgress));
    if (error) setNotice({ tone: "danger", text: error });
  }

  function startOver() {
    setFiles([]);
    setOptions(config.initial);
    setOptionError(null);
    setNotice(null);
    task.reset();
  }

  function onDrop(e: DragEvent) {
    // Only react to files from outside the page, not to tiles being rearranged.
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  if (task.phase === "done") {
    return (
      <main id="main" className="mx-auto w-full max-w-page flex-1 px-4 md:px-6">
        <ResultCard headline={config.doneHeadline(task.outputs.length)} outputs={task.outputs} zipName={config.zipName} next={config.next} onSaved={task.markSaved} onStartOver={startOver} />
      </main>
    );
  }

  if (task.phase === "processing") return <Processing title={config.busyTitle(files.length)} step={config.busyStep} progress={task.progress} />;

  if (files.length === 0) {
    return (
      <main id="main" className="mx-auto flex w-full max-w-page flex-1 flex-col px-4 pt-8 md:px-6 md:pt-14">
        <Dropzone
          title={config.title}
          pitch={config.pitch}
          buttonLabel={config.buttonLabel}
          accept={config.accept}
          acceptLabel={config.acceptLabel}
          multiple={config.multiple}
          onFiles={addFiles}
          onRejected={(n) => setNotice(skipped(n))}
        />
      </main>
    );
  }

  const pages = files.reduce((n, f) => n + (f.pageCount ?? 0), 0);
  const Options = config.Options;
  const ActionIcon = config.ActionIcon;
  const summary = `${plural(files.length, config.kind === "image" ? "image" : "file")}${pages ? ` · ${plural(pages, "page")}` : ""}`;
  const action = (className: string, iconSize: string) => (
    <Button size={className.includes("h-12") ? "md" : "lg"} className={className} loading={reading} icon={<ActionIcon aria-hidden className={iconSize} />} onClick={run}>{config.actionLabel}</Button>
  );

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
        accept={config.accept}
        multiple={config.multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
      />

      <section aria-label="Files" className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-lg">{config.title}</h1>
          {config.ordered && files.length > 1 && (
            <>
              <Button size="sm" variant="ghost" icon={<ArrowDownAZ aria-hidden className="size-4" />} onClick={() => sort(1)}>A to Z</Button>
              <Button size="sm" variant="ghost" icon={<ArrowUpZA aria-hidden className="size-4" />} onClick={() => sort(-1)}>Z to A</Button>
            </>
          )}
          {config.multiple
            ? <IconButton label="Add more files" variant="solid" onClick={() => picker.current?.click()}><Plus aria-hidden className="size-5" /></IconButton>
            : <Button size="sm" variant="outline" onClick={() => picker.current?.click()}>Choose another file</Button>}
        </div>
        {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
        <FileGrid files={files} sortable={config.ordered} onReorder={setFiles} onRemove={remove} onRotate={config.slug === "compress" ? undefined : rotate} />
      </section>

      <aside className="flex shrink-0 flex-col gap-5 border-t border-border bg-surface p-4 pb-28 md:w-[340px] md:border-l md:border-t-0 md:p-6">
        <h2 className="text-lg">{config.panelTitle}</h2>
        {config.panelHint && <p className="text-sm text-text-muted">{config.panelHint}</p>}
        {Options && (
          <form ref={panel as never} className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); run(); }}>
            <Options value={options} onChange={(value: typeof options) => { setOptions(value); setOptionError(null); }} files={files} error={optionError} />
          </form>
        )}
        <p className="tabnums text-sm text-text-muted">{summary}</p>
        {action("mt-auto hidden w-full md:inline-flex", "size-6")}
      </aside>

      {/* On phones the main button stays under the thumb. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex h-[76px] items-center gap-3 border-t border-border bg-surface px-4 md:hidden">
        <span className="tabnums text-sm text-text-muted">{plural(files.length, config.kind === "image" ? "image" : "file")}</span>
        {action("h-12 flex-1", "size-5")}
      </div>

      <div aria-hidden className={cn("pointer-events-none absolute inset-2 z-30 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-dropzone-active text-lg text-accent transition-opacity duration-(--t-motion-fast)", dragOver ? "opacity-100" : "opacity-0")}>
        Drop to add
      </div>
    </main>
  );
}
