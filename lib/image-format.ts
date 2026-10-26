/** Détecte le type réel d'une image à partir de sa signature binaire (PNG, JPEG, WebP). */
export function detectImageMime(data: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return "image/png";
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (
    data.length >= 12 &&
    String.fromCharCode(data[0]!, data[1]!, data[2]!, data[3]!) === "RIFF" &&
    String.fromCharCode(data[8]!, data[9]!, data[10]!, data[11]!) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/** Lit les dimensions d'une image PNG, JPEG ou WebP, sans dépendance externe. */
export function readImageSize(data: Uint8Array): { width: number; height: number } | null {
  const mime = detectImageMime(data);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (mime === "image/png" && data.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mime === "image/webp" && data.length >= 30) {
    const chunk = String.fromCharCode(data[12]!, data[13]!, data[14]!, data[15]!);
    if (chunk === "VP8X") {
      return { width: 1 + (data[24]! | (data[25]! << 8) | (data[26]! << 16)), height: 1 + (data[27]! | (data[28]! << 8) | (data[29]! << 16)) };
    }
    if (chunk === "VP8 ") return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    return null;
  }
  if (mime === "image/jpeg") {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) return null;
      const marker = data[offset + 1]!;
      const length = view.getUint16(offset + 2);
      // Marqueurs SOF0–SOF15 (hors DHT/JPG/DAC) contenant les dimensions.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}
