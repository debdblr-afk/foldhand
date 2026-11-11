import type { HTMLAttributes, ReactNode, Ref } from "react";
import { Lock, RotateCw, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";

type Status = "ready" | "reading" | "locked" | "error";

type Props = {
  name: string;
  /** Second line: "12 pages · 1.4 MB", or "Page 3". */
  meta?: string;
  /** The page preview. Falls back to a blank sheet. */
  preview?: ReactNode;
  rotation?: 0 | 90 | 180 | 270;
  status?: Status;
  /** Short reason shown for the error state. */
  problem?: string;
  dragging?: boolean;
  selected?: boolean;
  onRemove?: () => void;
  onRotate?: () => void;
  /** For drag-to-reorder: the list item's ref and the drag attributes and listeners. */
  itemRef?: Ref<HTMLLIElement>;
  itemProps?: HTMLAttributes<HTMLLIElement>;
};

/** One file or one page in the workspace. The tools are always in the tab order and always visible on touch. */
export function FileTile({ name, meta, preview, rotation = 0, status = "ready", problem, dragging, selected, onRemove, onRotate, itemRef, itemProps }: Props) {
  return (
    <li
      ref={itemRef}
      {...itemProps}
      className={cn(
        "group relative flex w-[148px] flex-col gap-2 rounded-md border bg-surface p-2 transition-[box-shadow,border-color] duration-(--t-motion-fast)",
        itemProps && "cursor-grab touch-manipulation active:cursor-grabbing",
        status === "error" ? "border-danger" : selected ? "border-accent ring-2 ring-accent" : "border-border",
        dragging ? "z-10 shadow-pop" : "shadow-card",
      )}
    >
      <div className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-sm bg-page-well p-3">
        {status === "reading" ? (
          <div className="h-full w-4/5 animate-pulse rounded-sm bg-page-paper" />
        ) : (
          <div
            className="grid h-full w-4/5 place-items-center rounded-[2px] bg-page-paper shadow-card transition-transform duration-(--t-motion-base)"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {preview}
          </div>
        )}
        {status === "locked" && (
          <span className="absolute inset-0 grid place-items-center bg-scrim text-on-ink"><Lock aria-hidden className="size-6" /></span>
        )}
        <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity duration-(--t-motion-fast) group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100">
          {onRotate && <IconButton size="sm" variant="outline" label={`Rotate ${name}`} onClick={onRotate}><RotateCw aria-hidden className="size-4" /></IconButton>}
          {onRemove && <IconButton size="sm" variant="outline" label={`Remove ${name}`} onClick={onRemove}><X aria-hidden className="size-4" /></IconButton>}
        </div>
      </div>
      <div className="min-w-0 px-0.5">
        <p className="truncate text-sm font-semibold" title={name}>{name}</p>
        {status === "error" ? (
          <p className="flex items-center gap-1 text-xs text-danger"><TriangleAlert aria-hidden className="size-3.5 shrink-0" />{problem ?? "Could not read this file"}</p>
        ) : status === "locked" ? (
          <p className="text-xs text-text-muted">Needs its password</p>
        ) : (
          <p className="tabnums truncate text-xs font-normal text-text-muted">{status === "reading" ? "Reading…" : meta}</p>
        )}
      </div>
    </li>
  );
}
