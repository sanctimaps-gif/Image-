/**
 * Analyse des pixels d'une image (comme l'exercice Python « Pillow + NumPy ») :
 * dimensions, couleur moyenne et couleurs dominantes (k-moyennes sur un échantillon).
 */
export interface DominantColor {
  rgb: [number, number, number];
  /** Part de l'image, entre 0 et 1. */
  share: number;
}

export interface ImageAnalysis {
  width: number;
  height: number;
  pixels: number;
  channels: 3;
  /** Taille non compressée en octets (largeur × hauteur × 3). */
  rawBytes: number;
  firstPixel: [number, number, number];
  mean: [number, number, number];
  dominant: DominantColor[];
}

/** `data` au format RGBA (ImageData.data), comme le renvoie un canvas. */
export function analyzePixels(data: Uint8ClampedArray, width: number, height: number, k = 4): ImageAnalysis {
  const count = width * height;
  const sum = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    sum[0]! += data[i * 4]!;
    sum[1]! += data[i * 4 + 1]!;
    sum[2]! += data[i * 4 + 2]!;
  }
  const mean = sum.map((s) => Math.round(s / Math.max(1, count))) as [number, number, number];

  // Échantillon régulier (≤ 4096 pixels) pour garder l'analyse instantanée.
  const step = Math.max(1, Math.floor(count / 4096));
  const samples: [number, number, number][] = [];
  for (let i = 0; i < count; i += step) samples.push([data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!]);

  return {
    width,
    height,
    pixels: count,
    channels: 3,
    rawBytes: count * 3,
    firstPixel: [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0],
    mean,
    dominant: kMeans(samples, Math.min(k, samples.length)),
  };
}

/** K-moyennes déterministes (initialisation répartie sur l'échantillon trié par luminosité). */
export function kMeans(samples: [number, number, number][], k: number, iterations = 12): DominantColor[] {
  if (samples.length === 0 || k <= 0) return [];
  const sorted = [...samples].sort((a, b) => luminance(a) - luminance(b));
  let centers = Array.from({ length: k }, (_, i) => [...sorted[Math.floor(((i + 0.5) * sorted.length) / k)]!] as number[]);
  let assignment = new Array<number>(samples.length).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    assignment = samples.map((s) => nearest(s, centers));
    const next = centers.map(() => [0, 0, 0, 0]);
    samples.forEach((s, i) => {
      const c = next[assignment[i]!]!;
      c[0]! += s[0];
      c[1]! += s[1];
      c[2]! += s[2];
      c[3]! += 1;
    });
    centers = next.map((c, i) => (c[3] ? [c[0]! / c[3], c[1]! / c[3], c[2]! / c[3]] : centers[i]!));
  }

  const counts = new Array<number>(k).fill(0);
  assignment.forEach((a) => counts[a]!++);
  return centers
    .map((c, i) => ({ rgb: c.map(Math.round) as [number, number, number], share: counts[i]! / samples.length }))
    .filter((d) => d.share > 0)
    .sort((a, b) => b.share - a.share);
}

function nearest(s: [number, number, number], centers: number[][]): number {
  let best = 0;
  let bestDist = Infinity;
  centers.forEach((c, i) => {
    const d = (s[0] - c[0]!) ** 2 + (s[1] - c[1]!) ** 2 + (s[2] - c[2]!) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

function luminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
