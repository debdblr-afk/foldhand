import type { LucideIcon } from "lucide-react";
import {
  Combine, Scissors, Minimize2, LayoutGrid, RotateCw, ImagePlus, Images, Hash, Stamp, Lock, LockOpen,
} from "lucide-react";

export type ToolSlug =
  | "merge" | "split" | "compress" | "organize" | "rotate"
  | "jpg-to-pdf" | "pdf-to-jpg" | "page-numbers" | "watermark" | "protect" | "unlock";

export type Category = "organize" | "optimize" | "convert" | "edit" | "security";

export type ToolDef = {
  slug: ToolSlug;
  name: string;
  description: string;
  category: Category;
  icon: LucideIcon;
  accepts: "pdf" | "image";
  multiple: boolean;
  minFiles: number;
  output: "pdf" | "images";
};

export const CATEGORIES: Array<{ id: Category; label: string }> = [
  { id: "organize", label: "Organise" },
  { id: "optimize", label: "Shrink" },
  { id: "convert", label: "Convert" },
  { id: "edit", label: "Stamp" },
  { id: "security", label: "Lock" },
];

export const TOOLS: ToolDef[] = [
  { slug: "merge", name: "Merge", description: "Join several PDFs into one file, in the order you choose.", category: "organize", icon: Combine, accepts: "pdf", multiple: true, minFiles: 2, output: "pdf" },
  { slug: "split", name: "Split", description: "Pull out a page range, or cut one PDF into smaller files.", category: "organize", icon: Scissors, accepts: "pdf", multiple: false, minFiles: 1, output: "pdf" },
  { slug: "compress", name: "Compress", description: "Make a PDF smaller so it fits an upload limit or an email.", category: "optimize", icon: Minimize2, accepts: "pdf", multiple: true, minFiles: 1, output: "pdf" },
  { slug: "organize", name: "Arrange pages", description: "Reorder, turn, delete or add pages, one page at a time.", category: "organize", icon: LayoutGrid, accepts: "pdf", multiple: true, minFiles: 1, output: "pdf" },
  { slug: "rotate", name: "Rotate", description: "Turn whole PDFs the right way up, several at once.", category: "organize", icon: RotateCw, accepts: "pdf", multiple: true, minFiles: 1, output: "pdf" },
  { slug: "jpg-to-pdf", name: "Images to PDF", description: "Turn photos and scans into a PDF, one image per page.", category: "convert", icon: ImagePlus, accepts: "image", multiple: true, minFiles: 1, output: "pdf" },
  { slug: "pdf-to-jpg", name: "PDF to images", description: "Save every page as a JPG picture.", category: "convert", icon: Images, accepts: "pdf", multiple: false, minFiles: 1, output: "images" },
  { slug: "page-numbers", name: "Page numbers", description: "Print page numbers where you want them, from any starting number.", category: "edit", icon: Hash, accepts: "pdf", multiple: true, minFiles: 1, output: "pdf" },
  { slug: "watermark", name: "Watermark", description: "Stamp text such as DRAFT or your name across the pages.", category: "edit", icon: Stamp, accepts: "pdf", multiple: true, minFiles: 1, output: "pdf" },
  { slug: "protect", name: "Add a password", description: "Lock a PDF so it only opens with the password you set.", category: "security", icon: Lock, accepts: "pdf", multiple: true, minFiles: 1, output: "pdf" },
  { slug: "unlock", name: "Remove a password", description: "Save an unlocked copy of a PDF whose password you know.", category: "security", icon: LockOpen, accepts: "pdf", multiple: true, minFiles: 1, output: "pdf" },
];

/** Tailwind classes for the icon square of each category. Kept as full strings so Tailwind can see them. */
export const CATEGORY_TINT: Record<Category, string> = {
  organize: "bg-cat-organize-soft text-cat-organize",
  optimize: "bg-cat-optimize-soft text-cat-optimize",
  convert: "bg-cat-convert-soft text-cat-convert",
  edit: "bg-cat-edit-soft text-cat-edit",
  security: "bg-cat-security-soft text-cat-security",
};
