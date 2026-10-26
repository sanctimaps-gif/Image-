import { describe, expect, it } from "vitest";
import { detectImageMime, readImageSize } from "@/lib/image-format";
import { fakePng } from "./support/fixtures";

describe("detectImageMime / readImageSize", () => {
  it("reconnaît un PNG et lit ses dimensions", () => {
    const png = fakePng(1536, 1024);
    expect(detectImageMime(png)).toBe("image/png");
    expect(readImageSize(png)).toEqual({ width: 1536, height: 1024 });
  });

  it("reconnaît JPEG et WebP", () => {
    expect(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectImageMime(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1"))).toBe("image/webp");
  });

  it("lit les dimensions d'un JPEG (marqueur SOF0)", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x03, 0x60, 0x06, 0x00, 0x03, 0x01, 0x22, 0x00]);
    expect(readImageSize(jpeg)).toEqual({ width: 1536, height: 864 });
  });

  it("rejette des données qui ne sont pas une image", () => {
    expect(detectImageMime(Buffer.from("<html>error</html>"))).toBeNull();
  });
});
