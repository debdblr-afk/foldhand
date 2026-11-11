// Makes the small PDFs the tests use. Run: node scripts/make-fixtures.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";

async function make(label, pages, size = [420, 595], color = rgb(0.2, 0.25, 0.8)) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage(size);
    page.drawRectangle({ x: 0, y: size[1] - 90, width: size[0], height: 90, color });
    page.drawText(`${label}${i}`, { x: 40, y: size[1] / 2, size: 96, font, color: rgb(0.1, 0.1, 0.12) });
  }
  return doc;
}

const out = new URL("../e2e/fixtures/", import.meta.url);
writeFileSync(new URL("alpha.pdf", out), await (await make("A", 2)).save());
writeFileSync(new URL("bravo.pdf", out), await (await make("B", 3, [595, 420], rgb(0.1, 0.55, 0.3))).save());
writeFileSync(new URL("charlie-10.pdf", out), await (await make("C", 1, [420, 595], rgb(0.8, 0.3, 0.1))).save());
const locked = await make("L", 1);
await locked.encrypt({ userPassword: "open-sesame", ownerPassword: "owner-sesame" });
writeFileSync(new URL("locked.pdf", out), await locked.save());
writeFileSync(new URL("broken.pdf", out), "this is not a pdf at all\n");
writeFileSync(new URL("notes.txt", out), "plain text\n");
writeFileSync(new URL("long-12.pdf", out), await (await make("P", 12, [420, 595], rgb(0.4, 0.2, 0.6))).save());

// A "scan": two pages, each a full-page photo. photo.jpg is checked in (made once with sips from a generated bitmap).
const scan = await PDFDocument.create();
const photo = await scan.embedJpg(readFileSync(new URL("photo.jpg", out)));
for (let i = 0; i < 2; i++) scan.addPage([595, 446]).drawImage(photo, { x: 0, y: 0, width: 595, height: 446 });
writeFileSync(new URL("scan.pdf", out), await scan.save());
console.log("fixtures written");
