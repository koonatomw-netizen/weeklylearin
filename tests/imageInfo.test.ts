import { describe, expect, it } from "vitest";
import { detectImage, fitWithin } from "../src/shared/imageInfo";

const b64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
// 1×1 PNG.
const PNG = b64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");

function jpeg(width: number, height: number): Uint8Array {
  // SOI, an APP0 segment, then an SOF0 frame header carrying the size.
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03, 0, 0, 0, 0]);
}

function webpVp8x(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(30);
  bytes.set([..."RIFF"].map((c) => c.charCodeAt(0)), 0);
  bytes.set([..."WEBP"].map((c) => c.charCodeAt(0)), 8);
  bytes.set([..."VP8X"].map((c) => c.charCodeAt(0)), 12);
  const w = width - 1, h = height - 1;
  bytes.set([w & 255, (w >> 8) & 255, (w >> 16) & 255, h & 255, (h >> 8) & 255, (h >> 16) & 255], 24);
  return bytes;
}

describe("detectImage", () => {
  it("identifies PNG, JPEG and WebP by their bytes and reads the size", () => {
    expect(detectImage(PNG)).toEqual({ mime: "image/png", width: 1, height: 1 });
    expect(detectImage(jpeg(1920, 1080))).toEqual({ mime: "image/jpeg", width: 1920, height: 1080 });
    expect(detectImage(webpVp8x(800, 600))).toEqual({ mime: "image/webp", width: 800, height: 600 });
  });

  it("rejects SVG, HTML and other files even if named like images", () => {
    const text = (value: string) => new TextEncoder().encode(value);
    expect(detectImage(text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
    expect(detectImage(text("<!doctype html><script>alert(1)</script>"))).toBeNull();
    expect(detectImage(text("GIF89a......"))).toBeNull();
    expect(detectImage(new Uint8Array())).toBeNull();
  });
});

describe("fitWithin", () => {
  it("keeps aspect ratio and never upscales", () => {
    expect(fitWithin(1920, 1080, 800, 600)).toEqual({ w: 800, h: 450 });
    expect(fitWithin(100, 50, 800, 600)).toEqual({ w: 100, h: 50 });
    expect(fitWithin(null, null, 800, 600)).toEqual({ w: 480, h: 360 });
  });
});
