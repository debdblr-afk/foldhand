import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrganizeWorkspace } from "@/components/tool/organize-workspace";
import { ToolWorkspace } from "@/components/tool/tool-workspace";
import { Footer, TopNav } from "@/components/ui/shell";
import { CATEGORY_TINT, TOOLS, type ToolSlug } from "@/lib/tools";
import { cn } from "@/lib/cn";

/** Tools with a working screen. The rest show a notice until they are built. */
const BUILT: ToolSlug[] = ["merge", "split", "compress", "jpg-to-pdf"];

type Params = Promise<{ tool: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ tool: t.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tool: slug } = await params;
  const tool = TOOLS.find((t) => t.slug === slug);
  return tool ? { title: tool.name, description: tool.description } : {};
}

export default async function ToolPage({ params }: { params: Params }) {
  const { tool: slug } = await params;
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) notFound();
  const Icon = tool.icon;
  return (
    <>
      <TopNav current={tool.slug} />
      {tool.slug === "organize" ? (
        <OrganizeWorkspace />
      ) : BUILT.includes(tool.slug) ? (
        <ToolWorkspace slug={tool.slug} />
      ) : (
        // Stub until this tool is built. See replica-ilovepdf/build-log.md.
        <main id="main" className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center gap-4 px-4 py-14 text-center">
          <span className={cn("grid size-12 place-items-center rounded-md", CATEGORY_TINT[tool.category])}><Icon aria-hidden className="size-6" /></span>
          <h1 className="text-xl md:text-2xl">{tool.name}</h1>
          <p className="text-md text-text-muted">{tool.description}</p>
          <p className="rounded-md bg-warning-soft px-4 py-3 text-sm">This tool is not built yet.</p>
          <Link href="/" className="font-semibold text-accent underline">See the tools that are ready</Link>
        </main>
      )}
      <Footer slim />
    </>
  );
}
