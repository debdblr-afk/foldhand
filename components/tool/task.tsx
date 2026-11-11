"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/feedback";
import { explain } from "@/lib/pdf/messages";
import { ToolError, type OutputFile } from "@/lib/pdf/types";

type Phase = "idle" | "processing" | "done";

/** The life of one run of a tool: idle, working with progress, then results. Shared by every workspace. */
export function useTask() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [outputs, setOutputs] = useState<OutputFile[]>([]);
  const [saved, setSaved] = useState(false);

  // Nothing is stored anywhere, so warn before a reload throws away work in progress or an unsaved result.
  useEffect(() => {
    if (phase !== "processing" && !(phase === "done" && !saved)) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase, saved]);

  /** Runs the work. Resolves to an error message for the person, or null when it worked. */
  async function start(work: (onProgress: (fraction: number) => void) => Promise<OutputFile[]>): Promise<string | null> {
    if (phase === "processing") return null;
    setProgress(0);
    setPhase("processing");
    try {
      setOutputs(await work(setProgress));
      setSaved(false);
      setPhase("done");
      return null;
    } catch (e) {
      setPhase("idle");
      return e instanceof ToolError ? explain(e.code, e.fileName, e.detail) : explain("unknown");
    }
  }

  function reset() {
    setOutputs([]);
    setPhase("idle");
  }

  return { phase, progress, outputs, start, reset, markSaved: () => setSaved(true) };
}

export function Processing({ title, step, progress }: { title: string; step: string; progress: number }) {
  return (
    <main id="main" className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-xl">{title}</h1>
      <Progress label={progress < 0.2 ? "Reading files" : progress < 0.95 ? step : "Finishing"} value={progress} />
      <p className="text-sm text-text-muted">This happens on your device. Keep this tab open.</p>
    </main>
  );
}
