"use client";

import { useState } from "react";
import Link from "next/link";
import { FileStack, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { TOOLS, type ToolSlug } from "@/lib/tools";

const DIRECT: ToolSlug[] = ["merge", "split", "compress"];
const linkClass = "text-xs uppercase tracking-[.02em] hover:text-accent transition-colors duration-(--t-motion-fast)";

/** Sticky header. Working wordmark until /replica-brand. */
export function TopNav({ current }: { current?: ToolSlug }) {
  const [open, setOpen] = useState(false);
  return (
    <header onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }} className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex h-[60px] max-w-page items-center gap-6 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg">
          <span className="grid size-8 place-items-center rounded-md bg-accent text-on-accent"><FileStack aria-hidden className="size-5" /></span>
          PDF tools
        </Link>
        <nav aria-label="Tools" className="hidden items-center gap-5 md:flex">
          {TOOLS.filter((t) => DIRECT.includes(t.slug)).map((t) => (
            <Link key={t.slug} href={`/${t.slug}`} aria-current={current === t.slug ? "page" : undefined} className={cn(linkClass, current === t.slug && "text-accent")}>
              {t.name}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="all-tools"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto inline-flex h-11 items-center gap-2 rounded-pill px-3 text-xs uppercase tracking-[.02em] hover:bg-surface-hover"
        >
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          All tools
        </button>
      </div>
      {open && (
        <nav
          id="all-tools"
          aria-label="All tools"
          className="absolute inset-x-0 top-full border-b border-border bg-surface shadow-raised"
        >
          <ul className="mx-auto grid max-w-page grid-cols-1 gap-1 p-4 sm:grid-cols-2 md:grid-cols-4 md:px-6">
            {TOOLS.map((t) => (
              <li key={t.slug}>
                <Link href={`/${t.slug}`} onClick={() => setOpen(false)} className="flex h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold hover:bg-surface-hover">
                  <t.icon aria-hidden className="size-4 text-text-muted" /> {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

export function Footer({ slim }: { slim?: boolean }) {
  return (
    <footer className="border-t border-border bg-surface text-sm text-text-muted">
      <div className={cn("mx-auto flex max-w-page flex-wrap items-center gap-x-6 gap-y-2 px-4 md:px-6", slim ? "h-12" : "py-8")}>
        <span>Files stay on this device.</span>
        {!slim && (
          <nav aria-label="About" className="ml-auto flex gap-6">
            <Link href="/help" className="hover:text-text">Help</Link>
            <Link href="/privacy" className="hover:text-text">Privacy</Link>
            <Link href="/terms" className="hover:text-text">Terms</Link>
          </nav>
        )}
      </div>
    </footer>
  );
}
