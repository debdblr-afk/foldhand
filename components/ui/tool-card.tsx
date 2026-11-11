import Link from "next/link";
import { cn } from "@/lib/cn";
import { CATEGORY_TINT, type ToolDef } from "@/lib/tools";

/** A tool in the directory. `compact` is the one-line version used on the result screen. */
export function ToolCard({ tool, compact }: { tool: ToolDef; compact?: boolean }) {
  const Icon = tool.icon;
  const descId = `tool-${tool.slug}-desc`;
  if (compact) {
    return (
      <Link
        href={`/${tool.slug}`}
        className="inline-flex h-11 items-center gap-2 rounded-pill border border-border bg-surface pl-1.5 pr-4 text-sm font-semibold hover:border-border-input hover:bg-surface-hover transition-colors duration-(--t-motion-fast)"
      >
        <span className={cn("grid size-8 place-items-center rounded-pill", CATEGORY_TINT[tool.category])}>
          <Icon aria-hidden className="size-4" />
        </span>
        {tool.name}
      </Link>
    );
  }
  return (
    <Link
      href={`/${tool.slug}`}
      aria-describedby={descId}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-card transition-[border-color,box-shadow] duration-(--t-motion-fast) hover:border-border-input hover:shadow-raised"
    >
      <span className={cn("grid size-10 place-items-center rounded-md", CATEGORY_TINT[tool.category])}>
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="text-lg">{tool.name}</span>
      <span id={descId} className="text-sm text-text-muted">{tool.description}</span>
    </Link>
  );
}
