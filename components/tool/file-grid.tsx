"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileTile } from "@/components/ui/file-tile";
import { formatBytes, plural } from "@/lib/format";
import type { InputFile, Rotation } from "@/lib/pdf/types";

type Props = {
  files: InputFile[];
  /** Whether order matters. When it does not, tiles stay put. */
  sortable?: boolean;
  onReorder: (files: InputFile[]) => void;
  onRemove: (id: string) => void;
  onRotate?: (id: string, rotation: Rotation) => void;
};

function Tile({ file, index, total, sortable, onRemove, onRotate }: { file: InputFile; index: number; total: number } & Pick<Props, "sortable" | "onRemove" | "onRotate">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: file.id, disabled: !sortable });
  const meta = file.pageCount === null ? formatBytes(file.size) : `${plural(file.pageCount, "page")} · ${formatBytes(file.size)}`;
  return (
    <FileTile
      itemRef={setNodeRef}
      itemProps={sortable ? {
        ...attributes,
        ...listeners,
        style: { transform: CSS.Translate.toString(transform), transition },
        "aria-label": `${file.name}, position ${index + 1} of ${total}`,
        "aria-roledescription": "sortable file",
      } : undefined}
      name={file.name}
      meta={meta}
      rotation={file.rotation}
      status={file.status === "damaged" ? "error" : file.status}
      problem="Could not open this file"
      dragging={isDragging}
      preview={file.thumbnailUrl ? (
        // A blob URL made in this tab, so next/image has nothing to optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={file.thumbnailUrl} alt="" draggable={false} className="h-full w-full object-contain" />
      ) : undefined}
      onRemove={() => onRemove(file.id)}
      onRotate={onRotate && file.status === "ready" ? () => onRotate(file.id, ((file.rotation + 90) % 360) as Rotation) : undefined}
    />
  );
}

/** The files in the workspace. Drag to reorder, or focus a tile, press Space, move with the arrows, Space again. */
export function FileGrid({ files, sortable = true, onReorder, onRemove, onRotate }: Props) {
  const sensors = useSensors(
    // A small distance before a drag starts, so taps on the tile's buttons still count as clicks.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = files.findIndex((f) => f.id === active.id);
    const to = files.findIndex((f) => f.id === over.id);
    onReorder(arrayMove(files, from, to));
  }

  const position = (id: string | number) => files.findIndex((f) => f.id === id) + 1;
  const nameOf = (id: string | number) => files.find((f) => f.id === id)?.name ?? "File";

  return (
    <DndContext
      id="file-grid"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: "Press Space to pick up this file. Use the arrow keys to move it, Space to put it down, Escape to cancel." },
        announcements: {
          onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}, position ${position(active.id)} of ${files.length}.`,
          onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} is over position ${position(over.id)} of ${files.length}.` : undefined),
          onDragEnd: ({ active, over }) => (over ? `${nameOf(active.id)} moved to position ${position(over.id)} of ${files.length}.` : `${nameOf(active.id)} put back.`),
          onDragCancel: ({ active }) => `Move cancelled. ${nameOf(active.id)} put back.`,
        },
      }}
    >
      <SortableContext items={files.map((f) => f.id)} strategy={rectSortingStrategy}>
        <ul aria-label={sortable ? "Files, in order" : "Files"} className="flex flex-wrap content-start gap-4">
          {files.map((f, i) => <Tile key={f.id} file={f} index={i} total={files.length} sortable={sortable} onRemove={onRemove} onRotate={onRotate} />)}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
