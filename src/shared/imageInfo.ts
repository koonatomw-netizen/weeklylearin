/**
 * Identify an uploaded image from its bytes (never from the file name or the browser's
 * declared type) and read its pixel size from the header. Only PNG, JPEG and WebP are
 * accepted; SVG and everything else is rejected because it could carry script.
 */

export type ImageMime = "image/png" | "image/jpeg" | "image/webp";
export interface ImageInfo { mime: ImageMime; width: number | null; height: number | null }

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_SIDE = 12_000;

const ascii = (bytes: Uint8Array, start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));

export function detectImage(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length >= 24 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return ascii(bytes, 12, 4) === "IHDR" ? { mime: "image/png", width: view.getUint32(16), height: view.getUint32(20) } : { mime: "image/png", width: null, height: null };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ...jpegSize(bytes) };
  if (bytes.length >= 30 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return { mime: "image/webp", ...webpSize(bytes) };
  return null;
}

function jpegSize(bytes: Uint8Array): { width: number | null; height: number | null } {
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (length < 2) break;
    i += 2 + length;
  }
  return { width: null, height: null };
}

function webpSize(b: Uint8Array): { width: number | null; height: number | null } {
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8X") return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
  if (chunk === "VP8 ") return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
  if (chunk === "VP8L") return { width: 1 + (((b[22] & 0x3f) << 8) | b[21]), height: 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)) };
  return { width: null, height: null };
}

/** Fit an image of the given pixel size inside a box on the canvas, keeping its aspect ratio. */
export function fitWithin(width: number | null, height: number | null, maxW: number, maxH: number): { w: number; h: number } {
  if (!width || !height) return { w: Math.round(maxW * 0.6), h: Math.round(maxH * 0.6) };
  const scale = Math.min(maxW / width, maxH / height, 1);
  return { w: Math.max(8, Math.round(width * scale)), h: Math.max(8, Math.round(height * scale)) };
}
