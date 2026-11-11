"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FilePlus2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Alert } from "@/components/ui/feedback";
import { FileTile } from "@/components/ui/file-tile";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";
import { runTool } from "@/lib/pdf/client";
import { openPdf, type OpenPdf } from "@/lib/pdf/inspect";
import { explain } from "@/lib/pdf/messages";
import type { InputFile, PageRef, Rotation } from "@/lib/pdf/types";
import { ResultCard } from "./result-card";
import { Processing, useTask } from "./task";
import { accepts } from "./tool-workspace";

const ACCEPT = "application/pdf,.pdf";

/** One page in the arrangement: a page of an added file, or a blank sheet. */
type Page = { id: string; fileId: string | null; pageIndex: number; rotation: Rotation };

type PageTileProps = {
  page: Page;
  label: string;
  position: number;
  total: number;
  /** Draws the page and resolves to an image URL. Called once, when the tile first comes into view. */
  load: () => Promise<string | null>;
  cached: string | undefined;
  onRemove: () => void;
  onRotate: () => void;
  onInsertAfter: () => void;
};

function PageTile({ page, label, position, total, load, cached, onRemove, onRotate, onInsertAfter }: PageTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const [url, setUrl] = useState(cached);
  const node = useRef<HTMLLIElement | null>(null);

  // Only pages that scroll into view are drawn, so a 300-page file does not draw 300 pictures up front.
  useEffect(() => {
    if (url || page.fileId === null || !node.current) return;
    let live = true;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      load().then((made) => { if (live && made) setUrl(made); });
    }, { rootMargin: "300px" });
    observer.observe(node.current);
    return () => { live = false; observer.disconnect(); };
    // `load` is a fresh function each render but always draws the same page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, page.fileId]);

  return (
    <FileTile
      itemRef={(el) => { node.current = el; setNodeRef(el); }}
      itemProps={{
        ...attributes,
        ...listeners,
        style: { transform: CSS.Translate.toString(transform), transition },
        "aria-label": `${label}, position ${position} of ${total}`,
        "aria-roledescription": "sortable page",
      }}
      name={label}
      meta={`Position ${position}`}
      rotation={page.rotation}
      status={page.fileId !== null && !url ? "reading" : "ready"}
      dragging={isDragging}
      preview={url ? (
        // A blob URL made in this tab, so next/image has nothing to optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" draggable={false} className="h-full w-full object-contain" />
      ) : undefined}
      onRemove={onRemove}
      onRotate={onRotate}
      onInsertAfter={onInsertAfter}
    />
  );
}

/** Arrange pages (S04): every page of the added files as a tile to move, turn, delete, or pad with blanks. */
export function OrganizeWorkspace() {
  const task = useTask();
  const [files, setFiles] = useState<InputFile[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [opening, setOpening] = useState(0);
  const [notice, setNotice] = useState<{ tone: "info" | "danger"; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  // Open documents and drawn previews live outside React state: they are caches, not things to render from.
  const docs = useRef(new Map<string, OpenPdf>());
  const previews = useRef(new Map<string, string>());

  useEffect(() => {
    const open = docs.current;
    const drawn = previews.current;
    return () => {
      open.forEach((d) => d.close());
      drawn.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const addFiles = useCallback(async (incoming: File[]) => {
    const good = incoming.filter((f) => accepts(f, ACCEPT));
    const bad = incoming.length - good.length;
    let problem = bad ? `${bad === 1 ? "One file was" : `${bad} files were`} skipped. This tool takes PDF files.` : null;
    setOpening((n) => n + good.length);
    for (const file of good) {
      const pdf = await openPdf(file);
      setOpening((n) => n - 1);
      if (pdf.status !== "ready") {
        problem = explain(pdf.status === "locked" ? "locked-file" : "damaged-file", file.name).replace(" Remove it and try again.", " It was not added.");
        continue;
      }
      const id = crypto.randomUUID();
      docs.current.set(id, pdf);
      setFiles((current) => [...current, { id, file, name: file.name, size: file.size, kind: "pdf", pageCount: pdf.pageCount, rotation: 0, status: "ready", thumbnailUrl: null }]);
      setPages((current) => [...current, ...Array.from({ length: pdf.pageCount }, (_, pageIndex) => ({ id: crypto.randomUUID(), fileId: id, pageIndex, rotation: 0 as Rotation }))]);
    }
    setNotice(problem ? { tone: "danger", text: problem } : null);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    setPages((current) => arrayMove(current, current.findIndex((p) => p.id === active.id), current.findIndex((p) => p.id === over.id)));
  }

  const several = files.length > 1;
  const labelOf = (p: Page) => {
    if (p.fileId === null) return "Blank page";
    const name = files.find((f) => f.id === p.fileId)?.name ?? "";
    return several ? `Page ${p.pageIndex + 1} of ${name}` : `Page ${p.pageIndex + 1}`;
  };
  const positionOf = (id: string | number) => pages.findIndex((p) => p.id === id) + 1;
  const spoken = (id: string | number) => { const p = pages.find((x) => x.id === id); return p ? labelOf(p) : "Page"; };

  const remove = (id: string) => {
    if (pages.length === 1) return setNotice({ tone: "info", text: explain("no-pages-left") });
    setPages((current) => current.filter((p) => p.id !== id));
  };
  const rotate = (id: string) => setPages((current) => current.map((p) => (p.id === id ? { ...p, rotation: ((p.rotation + 90) % 360) as Rotation } : p)));
  const insertAfter = (id: string) => setPages((current) => {
    const at = current.findIndex((p) => p.id === id);
    return [...current.slice(0, at + 1), { id: crypto.randomUUID(), fileId: null, pageIndex: 0, rotation: 0 }, ...current.slice(at + 1)];
  });

  async function run() {
    if (!pages.some((p) => p.fileId !== null)) return setNotice({ tone: "info", text: "Add a PDF first." });
    setNotice(null);
    // Only send the files that still have a page in the arrangement.
    const used = files.filter((f) => pages.some((p) => p.fileId === f.id));
    const refs: PageRef[] = pages.map((p) => ({ source: p.fileId === null ? "blank" : used.findIndex((f) => f.id === p.fileId), pageIndex: p.pageIndex, rotation: p.rotation }));
    const error = await task.start((onProgress) => runTool("organize", used, { pages: refs }, onProgress));
    if (error) setNotice({ tone: "danger", text: error });
  }

  function startOver() {
    docs.current.forEach((d) => d.close());
    docs.current.clear();
    previews.current.forEach((u) => URL.revokeObjectURL(u));
    previews.current.clear();
    setFiles([]);
    setPages([]);
    setNotice(null);
    task.reset();
  }

  function onDrop(e: DragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  if (task.phase === "done") {
    return (
      <main id="main" className="mx-auto w-full max-w-page flex-1 px-4 md:px-6">
        <ResultCard headline="Your rearranged PDF is ready" outputs={task.outputs} zipName="arranged.zip" next={["compress", "merge", "split"]} onSaved={task.markSaved} onStartOver={startOver} />
      </main>
    );
  }

  if (task.phase === "processing") return <Processing title={`Putting ${plural(pages.length, "page")} together`} step="Placing pages" progress={task.progress} />;

  if (pages.length === 0) {
    return (
      <main id="main" className="mx-auto flex w-full max-w-page flex-1 flex-col gap-4 px-4 pt-8 md:px-6 md:pt-14">
        <Dropzone
          title="Arrange pages"
          pitch="Reorder, turn, delete or add pages, one page at a time."
          buttonLabel="Choose PDF files"
          accept={ACCEPT}
          acceptLabel="PDF files"
          multiple
          busy={opening > 0}
          onFiles={addFiles}
        />
        {notice && <div className="mx-auto w-full max-w-[640px]"><Alert tone={notice.tone}>{notice.text}</Alert></div>}
      </main>
    );
  }

  const action = (className: string, size: "md" | "lg") => (
    <Button size={size} className={className} loading={opening > 0} icon={<Save aria-hidden className={size === "lg" ? "size-6" : "size-5"} />} onClick={run}>Save PDF</Button>
  );

  return (
    <main
      id="main"
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={onDrop}
      className="relative mx-auto flex w-full max-w-page flex-1 flex-col md:flex-row"
    >
      <input ref={picker} type="file" accept={ACCEPT} multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />

      <section aria-label="Pages" className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-lg">Arrange pages</h1>
          <Button size="sm" variant="outline" icon={<FilePlus2 aria-hidden className="size-4" />} onClick={() => picker.current?.click()}>Add another PDF</Button>
        </div>
        {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
        <DndContext
          id="page-grid"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            screenReaderInstructions: { draggable: "Press Space to pick up this page. Use the arrow keys to move it, Space to put it down, Escape to cancel." },
            announcements: {
              onDragStart: ({ active }) => `Picked up ${spoken(active.id)}, position ${positionOf(active.id)} of ${pages.length}.`,
              onDragOver: ({ active, over }) => (over ? `${spoken(active.id)} is over position ${positionOf(over.id)} of ${pages.length}.` : undefined),
              onDragEnd: ({ active, over }) => (over ? `${spoken(active.id)} moved to position ${positionOf(over.id)} of ${pages.length}.` : `${spoken(active.id)} put back.`),
              onDragCancel: ({ active }) => `Move cancelled. ${spoken(active.id)} put back.`,
            },
          }}
        >
          <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
            <ul aria-label="Pages, in order" className="flex flex-wrap content-start gap-4">
              {pages.map((p, i) => {
                const key = `${p.fileId}:${p.pageIndex}`;
                return (
                  <PageTile
                    key={p.id}
                    page={p}
                    label={labelOf(p)}
                    position={i + 1}
                    total={pages.length}
                    cached={previews.current.get(key)}
                    load={async () => {
                      const made = (await docs.current.get(p.fileId!)?.renderPage(p.pageIndex)) ?? null;
                      if (made) previews.current.set(key, made);
                      return made;
                    }}
                    onRemove={() => remove(p.id)}
                    onRotate={() => rotate(p.id)}
                    onInsertAfter={() => insertAfter(p.id)}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      </section>

      <aside className="flex shrink-0 flex-col gap-4 border-t border-border bg-surface p-4 pb-28 md:w-[340px] md:border-l md:border-t-0 md:p-6">
        <h2 className="text-lg">Your new file</h2>
        <p className="text-sm text-text-muted">Drag pages to move them. Each page has buttons to turn it, delete it, or add a blank page after it.</p>
        <p className="tabnums text-sm text-text-muted">{plural(pages.length, "page")}{several ? ` from ${plural(files.length, "file")}` : ""}</p>
        {action("mt-auto hidden w-full md:inline-flex", "lg")}
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-20 flex h-[76px] items-center gap-3 border-t border-border bg-surface px-4 md:hidden">
        <span className="tabnums text-sm text-text-muted">{plural(pages.length, "page")}</span>
        {action("h-12 flex-1", "md")}
      </div>

      <div aria-hidden className={cn("pointer-events-none absolute inset-2 z-30 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-dropzone-active text-lg text-accent transition-opacity duration-(--t-motion-fast)", dragOver ? "opacity-100" : "opacity-0")}>
        Drop to add
      </div>
    </main>
  );
}
