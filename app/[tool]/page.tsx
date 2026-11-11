import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrganizeWorkspace } from "@/components/tool/organize-workspace";
import { ToolWorkspace } from "@/components/tool/tool-workspace";
import { Footer, TopNav } from "@/components/ui/shell";
import { TOOLS } from "@/lib/tools";

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
  return (
    <>
      <TopNav current={tool.slug} />
      {tool.slug === "organize" ? <OrganizeWorkspace /> : <ToolWorkspace slug={tool.slug} />}
      <Footer slim />
    </>
  );
}
