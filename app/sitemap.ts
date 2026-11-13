import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", ...TOOLS.map((t) => `/${t.slug}`), "/help", "/privacy", "/terms"];
  return pages.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "monthly", priority: path === "" ? 1 : path.startsWith("/help") || path === "/privacy" || path === "/terms" ? 0.3 : 0.8 }));
}
