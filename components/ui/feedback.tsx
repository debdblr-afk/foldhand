"use client";

import { useRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "danger";

const TONE: Record<Tone, { box: string; icon: string; Icon: typeof Info }> = {
  info: { box: "bg-accent-soft", icon: "text-accent", Icon: Info },
  success: { box: "bg-success-soft", icon: "text-success", Icon: CircleCheck },
  warning: { box: "bg-warning-soft", icon: "text-warning", Icon: TriangleAlert },
  danger: { box: "bg-danger-soft", icon: "text-danger", Icon: CircleAlert },
};

export function Alert({ tone = "info", children, action }: { tone?: Tone; children: ReactNode; action?: ReactNode }) {
  const { box, icon, Icon } = TONE[tone];
  return (
    <div role={tone === "danger" || tone === "warning" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-md px-4 py-3 text-sm text-text", box)}>
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", icon)} />
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}

type ProgressProps = {
  /** 0 to 1. Leave out while the amount of work is not known yet. */
  value?: number;
  label: string;
  state?: "running" | "done" | "failed";
};

export function Progress({ value, label, state = "running" }: ProgressProps) {
  const pct = value === undefined ? undefined : Math.round(value * 100);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span aria-live="polite" className="font-semibold">{label}</span>
        {pct !== undefined && <span className="tabnums text-text-muted">{pct}%</span>}
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 overflow-hidden rounded-pill bg-border">
        {pct === undefined ? (
          <div className="h-full w-[30%] rounded-pill bg-accent animate-[slide_1.2s_ease-in-out_infinite]" />
        ) : (
          <div
            className={cn("h-full rounded-pill transition-[width] duration-(--t-motion-slow)", state === "done" ? "bg-success" : state === "failed" ? "bg-danger" : "bg-accent")}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
};

/** Centred dialog on desktop, bottom sheet on phones. Focus trap and Escape come from Radix. */
export function Modal({ open, onOpenChange, title, description, children }: ModalProps) {
  // The dialog is opened from state, not a Radix trigger, so remember what had focus and give it back on close.
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current && typeof document !== "undefined") opener.current = document.activeElement as HTMLElement | null;
  wasOpen.current = open;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim animate-[fade_.2s_ease-out]" />
        <Dialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          onCloseAutoFocus={(e) => { e.preventDefault(); opener.current?.focus(); }}
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-4 rounded-t-xl bg-surface p-6 shadow-pop animate-[rise_.2s_ease-out] md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[420px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg">{title}</Dialog.Title>
            <Dialog.Close aria-label="Close" className="-mr-2 -mt-2 grid size-11 place-items-center rounded-pill text-text-muted hover:bg-surface-hover">
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          {description && <Dialog.Description className="-mt-2 text-sm text-text-muted">{description}</Dialog.Description>}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
