import type { ToolSlug } from "@/lib/tools";

export type Rotation = 0 | 90 | 180 | 270;

export type FileStatus = "reading" | "ready" | "locked" | "damaged";

/** One file the user has added. Lives in memory for the session only. */
export type InputFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  kind: "pdf" | "image";
  pageCount: number | null;
  rotation: Rotation;
  status: FileStatus;
  /** The password the person gave for a locked file, once it has been checked. */
  password: string | null;
  /** Object URL of the preview, once there is one. */
  thumbnailUrl: string | null;
};

/** `detail` is an optional second line on the result screen, e.g. the size saved. */
export type OutputFile = { name: string; blob: Blob; size: number; detail?: string };

export type ErrorCode =
  | "damaged-file" | "locked-file" | "too-few-files" | "out-of-range" | "no-pages-left"
  | "unsupported-image" | "unsupported-text" | "font-unavailable" | "out-of-memory" | "unknown";

/** What a processor is given for each file: raw bytes plus what the user chose for it. */
export type SourceFile = { name: string; bytes: Uint8Array; rotation: Rotation; type?: string; password?: string };

/** One page of the output of Arrange pages: a page of a source file, or a blank sheet. */
export type PageRef = { source: number | "blank"; pageIndex: number; rotation: Rotation };

export type SplitOptions =
  | { mode: "ranges"; ranges: string; mergeIntoOne: boolean }
  | { mode: "every"; n: number }
  | { mode: "remove"; pages: string };

export type CompressLevel = "extreme" | "recommended" | "less";
export type CompressOptions = { level: CompressLevel };

export type ImagesOptions = {
  orientation: "portrait" | "landscape";
  pageSize: "fit" | "a4" | "letter";
  margin: "none" | "small" | "big";
  oneFile: boolean;
};

export type OrganizeOptions = { pages: PageRef[] };

/** Where a stamp sits on the page, as the reader sees the page. */
export type Position = { vertical: "top" | "middle" | "bottom"; horizontal: "left" | "center" | "right" };

export type RotateOptions = { turn: Rotation };

export type PageNumberOptions = {
  position: Position;
  /** Pages to number, e.g. "2-10". Empty means every page. */
  pages: string;
  start: number;
  style: "n" | "page-n" | "n-of-total";
  size: number;
  skipFirst: boolean;
};

export type WatermarkOptions = {
  text: string;
  position: Position;
  angle: 0 | 45;
  strength: "light" | "medium" | "strong";
  size: "small" | "medium" | "large";
  color: "grey" | "red" | "blue";
  pages: string;
};

export type ProtectOptions = { password: string; repeat: string };
export type ImagesOutOptions = { quality: "normal" | "high" };

export type ToolOptions = {
  merge: Record<string, never>;
  split: SplitOptions;
  compress: CompressOptions;
  organize: OrganizeOptions;
  "jpg-to-pdf": ImagesOptions;
  rotate: RotateOptions;
  "page-numbers": PageNumberOptions;
  watermark: WatermarkOptions;
  protect: ProtectOptions;
  unlock: Record<string, never>;
  "pdf-to-jpg": ImagesOutOptions;
};
export type BuiltTool = keyof ToolOptions & ToolSlug;

export type RawOutput = { name: string; bytes: Uint8Array; type: string; detail?: string };
export type Progress = (done: number, total: number) => void;

export type WorkerRequest = { id: number; tool: BuiltTool; files: SourceFile[]; options: ToolOptions[BuiltTool] };

export type WorkerResponse =
  | { id: number; type: "progress"; done: number; total: number }
  | { id: number; type: "done"; outputs: RawOutput[] }
  | { id: number; type: "error"; code: ErrorCode; fileName?: string; detail?: string };

/** Thrown by processors so the page can show a specific message. */
export class ToolError extends Error {
  constructor(public code: ErrorCode, public fileName?: string, public detail?: string) {
    super(code);
  }
}

export const PDF = "application/pdf";

/** "report.pdf" -> "report" */
export const baseName = (name: string) => name.replace(/\.[^.]+$/, "");
