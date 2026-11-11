export type Rotation = 0 | 90 | 180 | 270;

export type FileStatus = "reading" | "ready" | "locked" | "damaged";

/** One file the user has added. Lives in memory for the session only. */
export type InputFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number | null;
  rotation: Rotation;
  status: FileStatus;
  /** Object URL of the first-page preview, once rendered. */
  thumbnailUrl: string | null;
};

export type OutputFile = { name: string; blob: Blob; size: number };

export type ErrorCode = "damaged-file" | "locked-file" | "too-few-files" | "out-of-memory" | "unknown";

/** What a processor is given for each file: raw bytes plus what the user chose for it. */
export type SourceFile = { name: string; bytes: Uint8Array; rotation: Rotation };

export type WorkerRequest = { id: number; tool: "merge"; files: SourceFile[] };

export type WorkerResponse =
  | { id: number; type: "progress"; done: number; total: number }
  | { id: number; type: "done"; outputs: Array<{ name: string; bytes: Uint8Array }> }
  | { id: number; type: "error"; code: ErrorCode; fileName?: string };

/** Thrown by processors so the page can show a specific message. */
export class ToolError extends Error {
  constructor(public code: ErrorCode, public fileName?: string) {
    super(code);
  }
}
