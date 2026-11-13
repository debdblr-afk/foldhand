import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

const TITLE = "Foldhand: free PDF tools that run on your device";
const DESCRIPTION = "Merge, split, shrink and tidy PDFs for free. No account, no limits, and your files never leave your device.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · Foldhand" },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "Foldhand", title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#f5f6f8", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
