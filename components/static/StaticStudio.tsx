"use client";

import dynamic from "next/dynamic";

const placeholder = () => <div className="mx-auto min-h-[60vh] max-w-3xl px-4 pt-16" aria-busy="true" />;

/** Chargés uniquement dans le navigateur : Worker, WebGPU et IndexedDB n'existent pas au build. */
export const StaticStudio = dynamic(() => import("@/components/static/BrowserStudio"), { ssr: false, loading: placeholder });
export const StaticTraining = dynamic(() => import("@/components/static/BrowserTraining"), { ssr: false, loading: placeholder });
