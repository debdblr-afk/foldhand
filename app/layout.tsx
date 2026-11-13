import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: { default: "Foldhand: free PDF tools that run on your device", template: "%s · Foldhand" },
  description: "Merge, split, shrink and tidy PDFs for free. No account, no limits, and your files never leave your device.",
};

export const viewport: Viewport = { themeColor: "#f5f6f8", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
