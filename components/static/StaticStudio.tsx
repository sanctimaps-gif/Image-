"use client";

import dynamic from "next/dynamic";

/** Chargé uniquement dans le navigateur : Worker, WebGPU et IndexedDB n'existent pas au build. */
export const StaticStudio = dynamic(() => import("@/components/static/BrowserStudio"), {
  ssr: false,
  loading: () => <div className="mx-auto min-h-[60vh] max-w-3xl px-4 pt-16" aria-busy="true" />,
});
