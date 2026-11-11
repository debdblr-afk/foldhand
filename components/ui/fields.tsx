"use client";

import { useId, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string | null;
};

/** Text, number or password input with a visible label. Passwords get a show / hide toggle. */
export function TextField({ label, hint, error, type = "text", className, ...rest }: TextFieldProps) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      <div className="relative">
        <input
          {...rest}
          id={id}
          type={isPassword && shown ? "text" : type}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-11 w-full rounded-md border bg-surface px-3 text-base placeholder:text-text-muted",
            "focus-visible:outline-2 focus-visible:outline-offset-0 disabled:opacity-50",
            error ? "border-danger" : "border-border-input",
            isPassword && "pr-11",
          )}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            onClick={() => setShown((s) => !s)}
            className="absolute right-0 top-0 grid size-11 place-items-center rounded-md text-text-muted hover:text-text"
          >
            {shown ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
          </button>
        )}
      </div>
      {error ? <p id={`${id}-error`} className="text-sm text-danger">{error}</p> : hint ? <p id={`${id}-hint`} className="text-sm text-text-muted">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
      <span className="relative grid size-5 place-items-center">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer absolute inset-0 appearance-none rounded-sm border border-border-input bg-surface checked:border-accent checked:bg-accent" />
        <Check aria-hidden className="pointer-events-none relative size-3.5 text-on-accent opacity-0 peer-checked:opacity-100" strokeWidth={3} />
      </span>
      {label}
    </label>
  );
}

export type Option<T extends string> = { value: T; label: string; description?: string };

/** Moves focus and selection with the arrow keys, as a radio group should. */
function useRoving<T extends string>(values: T[], value: T, onChange: (v: T) => void, columns = 1) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function onKeyDown(e: KeyboardEvent) {
    const i = values.indexOf(value);
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const next = columns === 1 ? (i + step + values.length) % values.length : Math.min(values.length - 1, Math.max(0, i + step));
    onChange(values[next]);
    refs.current[next]?.focus();
  }
  return { refs, onKeyDown };
}

/** One choice out of a few. Options with a description render as stacked cards. */
export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: Option<T>[]; value: T; onChange: (v: T) => void }) {
  const { refs, onKeyDown } = useRoving(options.map((o) => o.value), value, onChange);
  const stacked = options.some((o) => o.description);
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={cn("flex gap-2", stacked ? "flex-col" : "flex-row")}>
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(o.value)}
              className={cn(
                "min-h-11 flex-1 rounded-md border-2 px-3 py-2 text-left transition-colors duration-(--t-motion-fast)",
                !stacked && "text-center",
                on ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-surface-hover",
              )}
            >
              <span className="block text-sm font-semibold">{o.label}</span>
              {o.description && <span className="block text-sm text-text-muted">{o.description}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const V = ["top", "middle", "bottom"] as const;
const H = ["left", "center", "right"] as const;
export type Position = { vertical: (typeof V)[number]; horizontal: (typeof H)[number] };

/** 3 x 3 picker for where a stamp sits on the page. */
export function PositionGrid({ label, value, onChange }: { label: string; value: Position; onChange: (p: Position) => void }) {
  const cells = V.flatMap((v) => H.map((h) => `${v}-${h}`));
  const current = `${value.vertical}-${value.horizontal}`;
  const set = (key: string) => { const [vertical, horizontal] = key.split("-") as [Position["vertical"], Position["horizontal"]]; onChange({ vertical, horizontal }); };
  const { refs, onKeyDown } = useRoving(cells, current, set, 3);
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="inline-grid grid-cols-3 gap-1 rounded-md border border-border bg-page-well p-1.5">
        {cells.map((key, i) => {
          const on = key === current;
          return (
            <button
              key={key}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={key.replace("-", " ").replace("middle center", "centre")}
              tabIndex={on ? 0 : -1}
              onClick={() => set(key)}
              className={cn("size-9 rounded-sm border transition-colors duration-(--t-motion-fast)", on ? "border-accent bg-accent" : "border-border bg-surface hover:bg-surface-hover")}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
