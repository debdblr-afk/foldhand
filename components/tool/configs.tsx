"use client";

import type { ComponentType } from "react";
import { Combine, FileOutput, Hash, Images, Lock, LockOpen, Minimize2, RotateCw, Scissors, Stamp, type LucideIcon } from "lucide-react";
import { Checkbox, PositionGrid, Segmented, TextField } from "@/components/ui/fields";
import { plural } from "@/lib/format";
import { pdfToImages } from "@/lib/pdf/client";
import { canPrint } from "@/lib/pdf/fonts";
import { parseRanges } from "@/lib/pdf/ranges";
import type {
  BuiltTool, CompressOptions, ImagesOptions, ImagesOutOptions, InputFile, OutputFile, PageNumberOptions, ProtectOptions, RotateOptions, SplitOptions, ToolOptions, WatermarkOptions,
} from "@/lib/pdf/types";
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
  /** Whether each file gets a turn button. */
  rotatable: boolean;
  /** For tools that do their work on the page instead of in the shared worker. */
  run?: (files: InputFile[], options: ToolOptions[T], onProgress: (fraction: number) => void) => Promise<OutputFile[]>;
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
  accept: PDF_ACCEPT, acceptLabel: "PDF files", kind: "pdf", multiple: true, minFiles: 2, ordered: true, rotatable: true,
  actionLabel: "Merge files", ActionIcon: Combine, busyTitle: (n) => `Joining ${plural(n, "file")}`, busyStep: "Joining pages",
  doneHeadline: () => "Your merged PDF is ready", zipName: "merged.zip", next: ["compress", "organize", "page-numbers", "protect"],
  panelTitle: "Join in this order", panelHint: "Drag the files into the order you want. The first file becomes the first pages.", initial: {},
};

const split: ToolConfig<"split"> = {
  slug: "split", title: "Split a PDF", pitch: "Pull out a page range, or cut one PDF into smaller files.", buttonLabel: "Choose a PDF file",
  accept: PDF_ACCEPT, acceptLabel: "PDF files", kind: "pdf", multiple: false, minFiles: 1, ordered: false, rotatable: true,
  actionLabel: "Split file", ActionIcon: Scissors, busyTitle: () => "Splitting your file", busyStep: "Cutting pages",
  doneHeadline: (n) => (n === 1 ? "Your new PDF is ready" : `Your ${n} PDFs are ready`), zipName: "split.zip", next: ["merge", "compress", "organize"],
  panelTitle: "Split options", panelHint: "", initial: { mode: "ranges", ranges: "", mergeIntoOne: false },
  Options: SplitPanel, check: checkSplit,
};

const compress: ToolConfig<"compress"> = {
  slug: "compress", title: "Compress PDFs", pitch: "Make a PDF smaller so it fits an upload limit or an email.", buttonLabel: "Choose PDF files",
  accept: PDF_ACCEPT, acceptLabel: "PDF files", kind: "pdf", multiple: true, minFiles: 1, ordered: false, rotatable: false,
  actionLabel: "Compress", ActionIcon: Minimize2, busyTitle: (n) => `Shrinking ${plural(n, "file")}`, busyStep: "Shrinking pictures",
  doneHeadline: (n) => (n === 1 ? "Your smaller PDF is ready" : `Your ${n} smaller PDFs are ready`), zipName: "compressed.zip", next: ["merge", "split", "protect"],
  panelTitle: "Compress options", panelHint: "", initial: { level: "recommended" }, Options: CompressPanel,
};

const images: ToolConfig<"jpg-to-pdf"> = {
  slug: "jpg-to-pdf", title: "Images to PDF", pitch: "Turn photos and scans into a PDF, one image per page.", buttonLabel: "Choose images",
  accept: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp", acceptLabel: "JPG, PNG and WebP images", kind: "image", multiple: true, minFiles: 1, ordered: true, rotatable: true,
  actionLabel: "Make PDF", ActionIcon: FileOutput, busyTitle: (n) => `Turning ${plural(n, "image")} into a PDF`, busyStep: "Placing images",
  doneHeadline: (n) => (n === 1 ? "Your PDF is ready" : `Your ${n} PDFs are ready`), zipName: "images.zip", next: ["merge", "compress", "organize"],
  panelTitle: "Page options", panelHint: "Drag the images into the order you want.", initial: { orientation: "portrait", pageSize: "a4", margin: "small", oneFile: true },
  Options: ImagesPanel,
};

/** Checks a "which pages" field against every file. Empty means all pages, which is always fine. */
function checkPages(text: string, files: InputFile[]): string | null {
  if (!text.trim()) return null;
  for (const f of files) {
    const parsed = parseRanges(text, f.pageCount ?? 0);
    if (!parsed.ok) return files.length > 1 ? `${f.name}: ${parsed.message}` : parsed.message;
  }
  return null;
}

function RotatePanel({ value, onChange, error }: OptionsProps<RotateOptions>) {
  return (
    <>
    <Segmented
      label="Turn every file"
      value={String(value.turn) as "0" | "90" | "180" | "270"}
      onChange={(turn) => onChange({ turn: Number(turn) as RotateOptions["turn"] })}
      options={[{ value: "0", label: "Not at all", description: "Only the turns set on each file" }, { value: "90", label: "Right", description: "A quarter turn clockwise" }, { value: "180", label: "Upside down", description: "A half turn" }, { value: "270", label: "Left", description: "A quarter turn anticlockwise" }]}
    />
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </>
  );
}

function NumbersPanel({ value, onChange, error }: OptionsProps<PageNumberOptions>) {
  return (
    <>
      <PositionGrid label="Where on the page" value={value.position} onChange={(position) => onChange({ ...value, position })} />
      <Segmented label="What to print" value={value.style} onChange={(style) => onChange({ ...value, style })} options={[{ value: "n", label: "1" }, { value: "page-n", label: "Page 1" }, { value: "n-of-total", label: "1 of 9" }]} />
      <TextField label="First number" type="number" min={1} inputMode="numeric" value={String(value.start || "")} onChange={(e) => onChange({ ...value, start: Number(e.target.value) })} />
      <TextField label="Text size" type="number" min={6} max={48} inputMode="numeric" value={String(value.size || "")} onChange={(e) => onChange({ ...value, size: Number(e.target.value) })} hint="From 6 to 48. Body text is usually 11 or 12." />
      <TextField label="Pages to number" placeholder="All pages" autoComplete="off" value={value.pages} onChange={(e) => onChange({ ...value, pages: e.target.value })} hint="Leave empty for every page, or type a range such as 2-10." error={error} />
      <Checkbox label="The first page is a cover (no number)" checked={value.skipFirst} onChange={(skipFirst) => onChange({ ...value, skipFirst })} />
    </>
  );
}

const WM_EMPTY = "Type the text to stamp.";
const WM_LETTERS = "That text has letters this tool cannot print yet, such as Chinese, Arabic or emoji.";

function WatermarkPanel({ value, onChange, error }: OptionsProps<WatermarkOptions>) {
  const textError = error === WM_EMPTY || error === WM_LETTERS ? error : null;
  return (
    <>
      <TextField label="Text" placeholder="DRAFT" maxLength={60} value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} error={textError} />
      <PositionGrid label="Where on the page" value={value.position} onChange={(position) => onChange({ ...value, position })} />
      <Segmented label="Direction" value={String(value.angle) as "0" | "45"} onChange={(angle) => onChange({ ...value, angle: Number(angle) as 0 | 45 })} options={[{ value: "45", label: "Diagonal" }, { value: "0", label: "Flat" }]} />
      <Segmented label="Size" value={value.size} onChange={(size) => onChange({ ...value, size })} options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]} />
      <Segmented label="How visible" value={value.strength} onChange={(strength) => onChange({ ...value, strength })} options={[{ value: "light", label: "Faint" }, { value: "medium", label: "Medium" }, { value: "strong", label: "Bold" }]} />
      <Segmented label="Colour" value={value.color} onChange={(color) => onChange({ ...value, color })} options={[{ value: "grey", label: "Grey" }, { value: "red", label: "Red" }, { value: "blue", label: "Blue" }]} />
      <TextField label="Pages to stamp" placeholder="All pages" autoComplete="off" value={value.pages} onChange={(e) => onChange({ ...value, pages: e.target.value })} hint="Leave empty for every page." error={textError ? null : error} />
    </>
  );
}

function ProtectPanel({ value, onChange, error }: OptionsProps<ProtectOptions>) {
  const mismatch = error && /match/i.test(error) ? error : null;
  return (
    <>
      <TextField label="Password" type="password" autoComplete="new-password" value={value.password} onChange={(e) => onChange({ ...value, password: e.target.value })} error={mismatch ? null : error} />
      <TextField label="Password again" type="password" autoComplete="new-password" value={value.repeat} onChange={(e) => onChange({ ...value, repeat: e.target.value })} error={mismatch} />
      <p className="text-sm text-text-muted">Keep this password somewhere safe. Nobody, including this tool, can open the file without it.</p>
    </>
  );
}

function ImagesOutPanel({ value, onChange }: OptionsProps<ImagesOutOptions>) {
  return (
    <Segmented label="Picture quality" value={value.quality} onChange={(quality) => onChange({ quality })} options={[{ value: "normal", label: "Normal", description: "Good for screens and sharing" }, { value: "high", label: "High", description: "Sharper and larger, good for printing" }]} />
  );
}

const pdfTool = { accept: PDF_ACCEPT, acceptLabel: "PDF files", kind: "pdf" as const, minFiles: 1, ordered: false, panelHint: "" };

const rotate: ToolConfig<"rotate"> = {
  ...pdfTool, slug: "rotate", title: "Rotate PDFs", pitch: "Turn whole PDFs the right way up, several at once.", buttonLabel: "Choose PDF files",
  multiple: true, rotatable: true, actionLabel: "Rotate", ActionIcon: RotateCw, busyTitle: (n) => `Turning ${plural(n, "file")}`, busyStep: "Turning pages",
  doneHeadline: (n) => (n === 1 ? "Your rotated PDF is ready" : `Your ${n} rotated PDFs are ready`), zipName: "rotated.zip", next: ["merge", "organize", "compress"],
  panelTitle: "Rotate options", panelHint: "Turn one file with the button on its tile, or turn them all here.", initial: { turn: 90 }, Options: RotatePanel,
  check: (o, files) => (o.turn === 0 && files.every((f) => f.rotation === 0) ? "Nothing is turned yet. Pick a direction, or turn a file with the button on its tile." : null),
};

const numbers: ToolConfig<"page-numbers"> = {
  ...pdfTool, slug: "page-numbers", title: "Add page numbers", pitch: "Print page numbers where you want them, from any starting number.", buttonLabel: "Choose PDF files",
  multiple: true, rotatable: false, actionLabel: "Add numbers", ActionIcon: Hash, busyTitle: (n) => `Numbering ${plural(n, "file")}`, busyStep: "Printing numbers",
  doneHeadline: (n) => (n === 1 ? "Your numbered PDF is ready" : `Your ${n} numbered PDFs are ready`), zipName: "numbered.zip", next: ["merge", "compress", "protect"],
  panelTitle: "Number options", initial: { position: { vertical: "bottom", horizontal: "center" }, pages: "", start: 1, style: "n", size: 12, skipFirst: false },
  Options: NumbersPanel,
  check: (o, files) => (!Number.isInteger(o.start) || o.start < 1 ? "The first number must be a whole number, 1 or more." : !(o.size >= 6 && o.size <= 48) ? "Text size must be from 6 to 48." : checkPages(o.pages, files)),
};

const watermarkTool: ToolConfig<"watermark"> = {
  ...pdfTool, slug: "watermark", title: "Add a watermark", pitch: "Stamp text such as DRAFT or your name across the pages.", buttonLabel: "Choose PDF files",
  multiple: true, rotatable: false, actionLabel: "Add watermark", ActionIcon: Stamp, busyTitle: (n) => `Stamping ${plural(n, "file")}`, busyStep: "Stamping pages",
  doneHeadline: (n) => (n === 1 ? "Your watermarked PDF is ready" : `Your ${n} watermarked PDFs are ready`), zipName: "watermarked.zip", next: ["protect", "compress", "merge"],
  panelTitle: "Watermark options", initial: { text: "", position: { vertical: "middle", horizontal: "center" }, angle: 45, strength: "medium", size: "large", color: "grey", pages: "" },
  Options: WatermarkPanel,
  check: (o, files) => (!o.text.trim() ? WM_EMPTY : !canPrint(o.text.trim()) ? WM_LETTERS : checkPages(o.pages, files)),
};

const protect: ToolConfig<"protect"> = {
  ...pdfTool, slug: "protect", title: "Add a password", pitch: "Lock a PDF so it only opens with the password you set.", buttonLabel: "Choose PDF files",
  multiple: true, rotatable: false, actionLabel: "Lock files", ActionIcon: Lock, busyTitle: (n) => `Locking ${plural(n, "file")}`, busyStep: "Locking",
  doneHeadline: (n) => (n === 1 ? "Your locked PDF is ready" : `Your ${n} locked PDFs are ready`), zipName: "locked.zip", next: ["merge", "compress"],
  panelTitle: "Set a password", initial: { password: "", repeat: "" }, Options: ProtectPanel,
  check: (o) => (!o.password ? "Type a password." : o.password !== o.repeat ? "The two passwords do not match." : null),
};

const unlock: ToolConfig<"unlock"> = {
  ...pdfTool, slug: "unlock", title: "Remove a password", pitch: "Save an unlocked copy of a PDF whose password you know.", buttonLabel: "Choose PDF files",
  multiple: true, rotatable: false, actionLabel: "Unlock files", ActionIcon: LockOpen, busyTitle: (n) => `Unlocking ${plural(n, "file")}`, busyStep: "Unlocking",
  doneHeadline: (n) => (n === 1 ? "Your unlocked PDF is ready" : `Your ${n} unlocked PDFs are ready`), zipName: "unlocked.zip", next: ["merge", "organize", "compress"],
  panelTitle: "Unlock", panelHint: "You will be asked for each file's password. This tool cannot open a file whose password you do not know.", initial: {},
};

const toImages: ToolConfig<"pdf-to-jpg"> = {
  ...pdfTool, slug: "pdf-to-jpg", title: "PDF to images", pitch: "Save every page as a JPG picture.", buttonLabel: "Choose a PDF file",
  multiple: false, rotatable: true, actionLabel: "Make images", ActionIcon: Images, busyTitle: () => "Turning pages into pictures", busyStep: "Drawing pages",
  doneHeadline: (n) => (n === 1 ? "Your image is ready" : `Your ${n} images are ready`), zipName: "pages.zip", next: ["jpg-to-pdf"],
  panelTitle: "Image options", initial: { quality: "normal" }, Options: ImagesOutPanel,
  run: (files, options, onProgress) => pdfToImages(files[0], options.quality, onProgress),
};

/** Tools that use the shared file workspace. Arrange pages has its own screen. */
// The registry holds configs of different option types; each one is typed where it is defined above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CONFIGS: Partial<Record<ToolSlug, ToolConfig<any>>> = {
  merge, split, compress, "jpg-to-pdf": images, rotate, "page-numbers": numbers, watermark: watermarkTool, protect, unlock, "pdf-to-jpg": toImages,
};
