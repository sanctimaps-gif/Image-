"use client";

import { createContext, useContext, type ReactNode } from "react";
import { serverBackend, type StudioBackend } from "@/lib/backend";

const BackendContext = createContext<StudioBackend>(serverBackend);

export function BackendProvider({ backend, children }: { backend: StudioBackend; children: ReactNode }) {
  return <BackendContext.Provider value={backend}>{children}</BackendContext.Provider>;
}

/** Moteur courant : routes serveur par défaut, moteur navigateur dans la version statique. */
export function useBackend(): StudioBackend {
  return useContext(BackendContext);
}
