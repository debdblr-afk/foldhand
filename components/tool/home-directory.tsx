"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/button";
import { ToolCard } from "@/components/ui/tool-card";
import { CATEGORIES, TOOLS, type Category } from "@/lib/tools";

/** The tool directory (S01): filter chips over a grid of cards. */
export function HomeDirectory() {
  const [category, setCategory] = useState<Category | "all">("all");
  const shown = TOOLS.filter((t) => category === "all" || t.category === category);
  return (
    <>
      <div role="group" aria-label="Filter tools" className="flex flex-wrap justify-center gap-2">
        <Chip selected={category === "all"} onClick={() => setCategory("all")}>All</Chip>
        {CATEGORIES.map((c) => <Chip key={c.id} selected={category === c.id} onClick={() => setCategory(c.id)}>{c.label}</Chip>)}
      </div>
      <p aria-live="polite" className="sr-only">{shown.length} tools shown</p>
      <section aria-label="All tools" className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((t) => <ToolCard key={t.slug} tool={t} />)}
      </section>
    </>
  );
}
