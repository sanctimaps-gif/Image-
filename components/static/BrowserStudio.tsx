"use client";

import { useMemo, useSyncExternalStore } from "react";
import { BackendProvider } from "@/components/BackendProvider";
import { ApiKeyPanel } from "@/components/static/ApiKeyPanel";
import { Studio } from "@/components/studio/Studio";
import { BrowserEngine } from "@/lib/browser/engine";

const KEY_STORAGE = "visionai-openai-key";
const listeners = new Set<() => void>();

function readKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

function writeKey(key: string | null) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // Stockage indisponible (navigation privée) : la clé ne sera pas conservée.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Version statique (GitHub Pages) : tout se passe dans le navigateur. */
export function BrowserStudio() {
  // null pendant le rendu statique : le studio n'est monté qu'une fois dans le navigateur.
  const apiKey = useSyncExternalStore<string | null>(subscribe, readKey, () => null);
  const engine = useMemo(() => (apiKey === null ? null : new BrowserEngine(apiKey || null)), [apiKey]);

  if (!engine) {
    return <div className="mx-auto min-h-[60vh] max-w-3xl px-4 pt-16" aria-busy="true" />;
  }

  return (
    <BackendProvider backend={engine}>
      <Studio
        config={engine.getConfig()}
        renderProviderSetup={(providerId, configured) => (
          <ApiKeyPanel providerId={providerId} configured={configured} onSave={writeKey} onClear={() => writeKey(null)} />
        )}
      />
    </BackendProvider>
  );
}
