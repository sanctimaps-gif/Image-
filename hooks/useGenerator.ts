"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBackend } from "@/components/BackendProvider";
import { ApiClientError } from "@/lib/api-client";
import type { GenerateRequestInput } from "@/lib/validation";
import type { Generation, GenerationProgressInfo } from "@/types/generation";

/** Au-delà, la requête est abandonnée côté navigateur (le serveur coupe à 5 minutes). */
const CLIENT_TIMEOUT_MS = 6 * 60 * 1000;

export type GeneratorState =
  | { status: "idle" }
  | { status: "loading"; request: GenerateRequestInput; startedAt: number; progress: GenerationProgressInfo | null }
  | { status: "success"; generation: Generation }
  | { status: "error"; error: ApiClientError; request: GenerateRequestInput }
  | { status: "cancelled"; request: GenerateRequestInput };

/**
 * Machine à états d'une génération : empêche les doubles soumissions,
 * permet l'annulation et conserve la dernière requête pour « Réessayer ».
 */
export function useGenerator(onSuccess: (generation: Generation) => void) {
  const [state, setState] = useState<GeneratorState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const backend = useBackend();

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const generate = useCallback(async (request: GenerateRequestInput) => {
    if (controllerRef.current) return; // une génération est déjà en cours

    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), CLIENT_TIMEOUT_MS);
    setState({ status: "loading", request, startedAt: Date.now(), progress: null });
    const onProgress = (progress: GenerationProgressInfo) =>
      setState((current) => (current.status === "loading" && current.request === request ? { ...current, progress } : current));

    try {
      const generation = await backend.generate(request, controller.signal, onProgress);
      setState({ status: "success", generation });
      onSuccessRef.current(generation);
    } catch (error) {
      const reason: unknown = controller.signal.reason;
      if (controller.signal.aborted && !(reason instanceof DOMException && reason.name === "TimeoutError")) {
        setState({ status: "cancelled", request });
      } else {
        const apiError =
          error instanceof ApiClientError && !controller.signal.aborted
            ? error
            : controller.signal.aborted
              ? new ApiClientError("La génération a pris trop de temps. Veuillez réessayer.", "TIMEOUT", true)
              : new ApiClientError("Une erreur inattendue est survenue.", "INTERNAL_ERROR", true);
        setState({ status: "error", error: apiError, request });
      }
    } finally {
      clearTimeout(timeout);
      controllerRef.current = null;
    }
  }, [backend]);

  const cancel = useCallback(() => controllerRef.current?.abort(), []);
  const reset = useCallback(() => setState({ status: "idle" }), []);
  const show = useCallback((generation: Generation) => {
    if (!controllerRef.current) setState({ status: "success", generation });
  }, []);

  return { state, generate, cancel, reset, show, isGenerating: state.status === "loading" };
}
