/// <reference lib="webworker" />
// Image work that needs a browser: decoding and redrawing. Runs inside the worker.
import type { Recode } from "./compress";
import { exifOrientation, type Normalise } from "./images";

async function draw(bitmap: ImageBitmap, width: number, height: number, type: string, quality?: number): Promise<Uint8Array> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  if (type === "image/jpeg") {
    ctx.fillStyle = "#fff"; // JPEG has no transparency; see-through areas become white, not black
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type, quality });
  return new Uint8Array(await blob.arrayBuffer());
}

export const recodeJpeg: Recode = async (jpeg, maxSide, quality) => {
  const bitmap = await createImageBitmap(new Blob([jpeg as BlobPart], { type: "image/jpeg" }));
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  return { bytes: await draw(bitmap, width, height, "image/jpeg", quality), width, height };
};

export const normaliseImage: Normalise = async (file) => {
  const isJpeg = file.bytes[0] === 0xff && file.bytes[1] === 0xd8;
  const isPng = file.bytes[0] === 0x89 && file.bytes[1] === 0x50;
  // Upright JPEGs and all PNGs go in untouched, so nothing is re-compressed without need.
  if (isPng) return { bytes: file.bytes, type: "image/png" };
  if (isJpeg && exifOrientation(file.bytes) <= 1) return { bytes: file.bytes, type: "image/jpeg" };
  const bitmap = await createImageBitmap(new Blob([file.bytes as BlobPart], { type: file.type || "image/jpeg" }), { imageOrientation: "from-image" });
  return { bytes: await draw(bitmap, bitmap.width, bitmap.height, "image/jpeg", 0.92), type: "image/jpeg" };
};
