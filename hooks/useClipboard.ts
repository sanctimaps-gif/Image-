"use client";

import { useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

export function useClipboard() {
  const toast = useToast();

  return useCallback(
    async (text: string, successMessage = "Copié dans le presse-papiers") => {
      try {
        await navigator.clipboard.writeText(text);
        toast.show(successMessage, "success");
      } catch {
        toast.show("Impossible de copier automatiquement. Sélectionnez le texte manuellement.", "error");
      }
    },
    [toast],
  );
}
