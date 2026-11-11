"use client";

import type { ComponentType } from "react";
import { Combine, FileOutput, Minimize2, Scissors, type LucideIcon } from "lucide-react";
import { Checkbox, Segmented, TextField } from "@/components/ui/fields";
import { plural } from "@/lib/format";
import { parseRanges } from "@/lib/pdf/ranges";
import type { BuiltTool, CompressOptions, ImagesOptions, InputFile, SplitOptions, ToolOptions } from "@/lib/pdf/types";
import type { ToolSlug } from "@/lib/tools";

export type OptionsProps<O> = { value: O; onChange: (value: O) => void; files: InputFile[]; error: string | null };

/** Everything that differs between the tools that share the file workspace. */
export type ToolConfig<T extends BuiltTool = BuiltTool> = {
  slug: T;
  title: string;
  pitch: string;
  buttonLabel: string;
  accept: string;
  /** Plain words for what the tool takes, used when a file is skipped. */
  acceptLabel: string;
  kind: "pdf" | "image";
  multiple: boolean;
  minFiles: number;
  /** Whether the order of the files matters, so tiles can be dragged and sorted. */
  ordered: boolean;
  actionLabel: string;
  ActionIcon: LucideIcon;
  busyTitle: (files: number) => string;
  busyStep: string;
  doneHeadline: (outputs: number) => string;
  zipName: string;
  next: ToolSlug[];
  panelTitle: string;
  panelHint: string;
  initial: ToolOptions[T];
  Options?: ComponentType<OptionsProps<ToolOptions[T]>>;
  /** Returns a message when the options cannot be used as they are. */
  check?: (options: ToolOptions[T], files: InputFile[]) => string | null;
};

const PDF_ACCEPT = "application/pdf,.pdf";

function SplitPanel({ value, onChange, files, error }: OptionsProps<SplitOptions>) {
  const count = files[0]?.pageCount;
  const hint = count ? `This file has ${plural(count, "page")}.` : undefined;
  return (
    <>
      <Segmented
        label="How to split"
        value={value.mode}
        onChange={(mode) => onChange(mode === "ranges" ? { mode, ranges: "", mergeIntoOne: false } : mode === "every" ? { mode, n: 1 } : { mode, pages: "" })}
        options={[
          { value: "ranges", label: "Pick pages", description: "Keep the pages or ranges you type" },
          { value: "every", label: "Equal parts", description: "Start a new file every few pages" },
          { value: "remove", label: "Remove pages", description: "Keep everything except the pages you type" },
        ]}
      />
      {value.mode === "ranges" && (
        <>
          <TextField label="Pages to keep" placeholder="1-3, 5" inputMode="text" autoComplete="off" value={value.ranges} onChange={(e) => onChange({ ...value, ranges: e.target.value })} hint={hint ? `${hint} Each range becomes its own file.` : undefined} error={error} />
          <Checkbox label="Put all the ranges in one file" checked={value.mergeIntoOne} onChange={(mergeIntoOne) => onChange({ ...value, mergeIntoOne })} />
        </>
      )}
      {value.mode === "every" && (
        <TextField label="Pages in each file" type="number" min={1} max={count ?? undefined} inputMode="numeric" value={String(value.n || "")} onChange={(e) => onChange({ mode: "every", n: Number(e.target.value) })} hint={hint} error={error} />
      )}
      {value.mode === "remove" && (
        <TextField label="Pages to remove" placeholder="2, 4-6" autoComplete="off" value={value.pages} onChange={(e) => onChange({ mode: "remove", pages: e.target.value })} hint={hint} error={error} />
      )}
    </>
  );
}

function checkSplit(options: SplitOptions, files: InputFile[]): string | null {
  const count = files[0]?.pageCount ?? 0;
  if (options.mode === "every") {
    if (!Number.isInteger(options.n) || options.n < 1) return "Type a whole number, 1 or more.";
    if (options.n >= count) return `This file has ${plural(count, "page")}, so that would not split it. Use a smaller number.`;
    return null;
  }
  const parsed = parseRanges(options.mode === "ranges" ? options.ranges : options.pages, count);
  if (!parsed.ok) return parsed.message;
  if (options.mode === "remove" && new Set(parsed.groups.flat()).size >= count) return "That would remove every page. Keep at least one.";
  return null;
}

function CompressPanel({ value, onChange }: OptionsProps<CompressOptions>) {
  return (
    <>
      <Segmented
        label="How much to shrink"
        value={value.level}
        onChange={(level) => onChange({ level })}
        options={[
          { value: "extreme", label: "Smallest", description: "Lowest picture quality" },
          { value: "recommended", label: "Balanced", description: "Good quality, good saving" },
          { value: "less", label: "Light", description: "Best quality, smallest saving" },
        ]}
      />
      <p className="text-sm text-text-muted">This shrinks the photos and scans inside the file. Text stays sharp. A file that is mostly text will not get much smaller.</p>
    </>
  );
}

function ImagesPanel({ value, onChange, files }: OptionsProps<ImagesOptions>) {
  return (
    <>
      <Segmented label="Page size" value={value.pageSize} onChange={(pageSize) => onChange({ ...value, pageSize })} options={[{ value: "fit", label: "Same as image" }, { value: "a4", label: "A4" }, { value: "letter", label: "Letter" }]} />
      {value.pageSize !== "fit" && (
        <Segmented label="Page direction" value={value.orientation} onChange={(orientation) => onChange({ ...value, orientation })} options={[{ value: "portrait", label: "Upright" }, { value: "landscape", label: "Sideways" }]} />
      )}
      <Segmented label="Margin" value={value.margin} onChange={(margin) => onChange({ ...value, margin })} options={[{ value: "none", label: "None" }, { value: "small", label: "Small" }, { value: "big", label: "Wide" }]} />
      {files.length > 1 && <Checkbox label="Put all images in one PDF" checked={value.oneFile} onChange={(oneFile) => onChange({ ...value, oneFile })} />}
    </>
  );
}

const merge: ToolConfig<"merge"> = {
  slug: "merge", title: "Merge PDFs", pitch: "Join several PDFs into one file, in the order you choose.", buttonLabel: "Choose PDF files",
  accept: PDF_ACCEPT, acceptLabel: "PDF files", kind: "pdf", multiple: true, minFiles: 2, ordered: true,
  actionLabel: "Merge files", ActionIcon: Combine, busyTitle: (n) => `Joining ${plural(n, "file")}`, busyStep: "Joining pages",
  doneHeadline: () => "Your merged PDF is ready", zipName: "merged.zip", next: ["compress", "organize", "page-numbers", "protect"],
  panelTitle: "Join in this order", panelHint: "Drag the files into the order you want. The first file becomes the first pages.", initial: {},
};

const split: ToolConfig<"split"> = {
  slug: "split", title: "Split a PDF", pitch: "Pull out a page range, or cut one PDF into smaller files.", buttonLabel: "Choose a PDF file",
  accept: PDF_ACCEPT, acceptLabel: "PDF files", kind: "pdf", multiple: false, minFiles: 1, ordered: false,
  actionLabel: "Split file", ActionIcon: Scissors, busyTitle: () => "Splitting your file", busyStep: "Cutting pages",
  doneHeadline: (n) => (n === 1 ? "Your new PDF is ready" : `Your ${n} PDFs are ready`), zipName: "split.zip", next: ["merge", "compress", "organize"],
  panelTitle: "Split options", panelHint: "", initial: { mode: "ranges", ranges: "", mergeIntoOne: false },
  Options: SplitPanel, check: checkSplit,
};

const compress: ToolConfig<"compress"> = {
  slug: "compress", title: "Compress PDFs", pitch: "Make a PDF smaller so it fits an upload limit or an email.", buttonLabel: "Choose PDF files",
  accept: PDF_ACCEPT, acceptLabel: "PDF files", kind: "pdf", multiple: true, minFiles: 1, ordered: false,
  actionLabel: "Compress", ActionIcon: Minimize2, busyTitle: (n) => `Shrinking ${plural(n, "file")}`, busyStep: "Shrinking pictures",
  doneHeadline: (n) => (n === 1 ? "Your smaller PDF is ready" : `Your ${n} smaller PDFs are ready`), zipName: "compressed.zip", next: ["merge", "split", "protect"],
  panelTitle: "Compress options", panelHint: "", initial: { level: "recommended" }, Options: CompressPanel,
};

const images: ToolConfig<"jpg-to-pdf"> = {
  slug: "jpg-to-pdf", title: "Images to PDF", pitch: "Turn photos and scans into a PDF, one image per page.", buttonLabel: "Choose images",
  accept: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp", acceptLabel: "JPG, PNG and WebP images", kind: "image", multiple: true, minFiles: 1, ordered: true,
  actionLabel: "Make PDF", ActionIcon: FileOutput, busyTitle: (n) => `Turning ${plural(n, "image")} into a PDF`, busyStep: "Placing images",
  doneHeadline: (n) => (n === 1 ? "Your PDF is ready" : `Your ${n} PDFs are ready`), zipName: "images.zip", next: ["merge", "compress", "organize"],
  panelTitle: "Page options", panelHint: "Drag the images into the order you want.", initial: { orientation: "portrait", pageSize: "a4", margin: "small", oneFile: true },
  Options: ImagesPanel,
};

/** Tools that use the shared file workspace. Arrange pages has its own screen. */
// The registry holds configs of different option types; each one is typed where it is defined above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CONFIGS: Partial<Record<ToolSlug, ToolConfig<any>>> = { merge, split, compress, "jpg-to-pdf": images };
