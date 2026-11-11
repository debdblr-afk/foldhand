import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ink" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  ink: "bg-ink text-on-ink hover:bg-ink-hover",
  outline: "bg-surface text-text border border-border-input hover:bg-surface-hover",
  ghost: "text-text hover:bg-surface-hover",
  danger: "bg-danger text-on-accent hover:opacity-90",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 gap-1.5 text-sm rounded-pill pointer-coarse:h-11",
  md: "h-11 px-4 gap-2 text-base rounded-pill",
  lg: "h-16 px-8 gap-3 text-lg rounded-lg shadow-raised",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center font-semibold whitespace-nowrap select-none",
        "transition-[background-color,transform,opacity] duration-(--t-motion-fast) active:translate-y-px",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANT[variant], SIZE[size], className,
      )}
    >
      {loading ? <Loader2 aria-hidden className="size-[1.1em] animate-[spin_.8s_linear_infinite]" /> : icon}
      {children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: "ghost" | "outline" | "solid";
  size?: "sm" | "md";
};

export function IconButton({ label, variant = "ghost", size = "md", className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid place-items-center rounded-pill shrink-0 transition-colors duration-(--t-motion-fast)",
        "disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" ? "size-9 pointer-coarse:size-11" : "size-11",
        variant === "ghost" && "text-text hover:bg-surface-hover",
        variant === "outline" && "bg-surface text-text border border-border-input hover:bg-surface-hover",
        variant === "solid" && "bg-accent text-on-accent hover:bg-accent-hover shadow-raised",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Chip({ selected, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      aria-pressed={!!selected}
      className={cn(
        "h-9 px-4 rounded-pill text-sm font-semibold border transition-colors duration-(--t-motion-fast) pointer-coarse:h-11",
        selected ? "bg-ink text-on-ink border-ink" : "bg-surface text-text border-border hover:bg-surface-hover",
        className,
      )}
    >
      {children}
    </button>
  );
}
