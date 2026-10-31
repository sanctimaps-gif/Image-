"use client";

import { useEffect, useState } from "react";
import { analyzePixels, toHex, type ImageAnalysis } from "@/lib/training/image-analysis";

const fmt = new Intl.NumberFormat("fr-FR");

/** Lit les pixels réels de l'image (canvas) et affiche sa composition numérique. */
export function ImageAnalysisPanel({ src }: { src: string }) {
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return setFailed(true);
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (!cancelled) setAnalysis(analyzePixels(data, canvas.width, canvas.height));
    };
    img.onerror = () => !cancelled && setFailed(true);
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (failed) return <p className="text-xs text-muted">Analyse impossible : image indisponible.</p>;
  if (!analysis) return <p className="text-xs text-muted">Analyse des pixels…</p>;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-bg p-3 text-xs">
      <p className="font-medium text-fg">Composition numérique de l&apos;image</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted">
        <dt>Dimensions</dt>
        <dd className="text-fg">
          {analysis.width} × {analysis.height} px
        </dd>
        <dt>Pixels</dt>
        <dd className="text-fg">{fmt.format(analysis.pixels)}</dd>
        <dt>Canaux</dt>
        <dd className="text-fg">3 (R, V, B)</dd>
        <dt>Taille brute</dt>
        <dd className="text-fg">{fmt.format(analysis.rawBytes)} octets</dd>
        <dt>Premier pixel</dt>
        <dd className="font-mono text-fg">RGB({analysis.firstPixel.join(", ")})</dd>
        <dt>Couleur moyenne</dt>
        <dd className="flex items-center gap-1.5 font-mono text-fg">
          <span className="inline-block h-3 w-3 rounded-sm border border-border" style={{ background: toHex(analysis.mean) }} />
          RGB({analysis.mean.join(", ")})
        </dd>
      </dl>
      <div>
        <p className="mb-1 text-muted">Couleurs dominantes</p>
        <div className="flex h-5 overflow-hidden rounded-md border border-border" aria-hidden>
          {analysis.dominant.map((d) => (
            <span key={toHex(d.rgb)} style={{ background: toHex(d.rgb), width: `${d.share * 100}%` }} />
          ))}
        </div>
        <ul className="mt-1 flex flex-wrap gap-x-3 font-mono text-muted">
          {analysis.dominant.map((d) => (
            <li key={toHex(d.rgb)}>
              {toHex(d.rgb)} · {Math.round(d.share * 100)} %
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
