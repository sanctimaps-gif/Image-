"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, deleteGeneration, fetchHistory } from "@/lib/api-client";
import type { Generation } from "@/types/generation";

export type HistoryStatus = "loading" | "ready" | "error";

/** Historique des créations du navigateur courant, persisté côté serveur. */
export function useHistory() {
  const [items, setItems] = useState<Generation[]>([]);
  const [status, setStatus] = useState<HistoryStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    setError(null);
    try {
      const generations = await fetchHistory(signal);
      setItems(generations);
      setStatus("ready");
    } catch (e) {
      if (signal?.aborted) return;
      setError(e instanceof ApiClientError ? e.message : "Impossible de charger l'historique.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Chargement initial de l'historique depuis le serveur.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const add = useCallback((generation: Generation) => {
    setItems((current) => [generation, ...current.filter((g) => g.id !== generation.id)]);
  }, []);

  /** Suppression optimiste, annulée si le serveur échoue. */
  const remove = useCallback(async (id: string) => {
    const snapshot = itemsRef.current;
    const index = snapshot.findIndex((g) => g.id === id);
    const removed = snapshot[index];
    setItems((current) => current.filter((g) => g.id !== id));
    try {
      await deleteGeneration(id);
    } catch (e) {
      if (removed) {
        setItems((current) => {
          if (current.some((g) => g.id === id)) return current;
          const next = [...current];
          next.splice(Math.min(index, next.length), 0, removed);
          return next;
        });
      }
      throw e;
    }
  }, []);

  return { items, status, error, reload: load, add, remove };
}
