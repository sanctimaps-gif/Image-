"use client";

import { ExternalLink, KeyRound, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

interface ApiKeyPanelProps {
  providerId: string;
  configured: boolean;
  onSave: (key: string) => void;
  onClear: () => void;
}

/** Version statique : informations sur le moteur choisi et saisie de la clé OpenAI de l'utilisateur. */
export function ApiKeyPanel({ providerId, configured, onSave, onClear }: ApiKeyPanelProps) {
  const [value, setValue] = useState("");

  if (providerId === "pollinations") {
    return (
      <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        <strong className="font-medium text-fg">Essai gratuit, sans clé.</strong> Les images sont produites par le service
        tiers pollinations.ai (modèle Flux) : une image à la fois, environ toutes les 45 secondes, en définition réduite, et
        le texte écrit sur l&apos;image est peu fiable. Vos descriptions sont envoyées à ce service. Pour des affiches et des
        fiches comme vos exemples, choisissez « OpenAI (votre clé) ».
      </p>
    );
  }

  if (configured) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
        <span className="flex items-center gap-2 text-muted">
          <KeyRound className="h-4 w-4 text-success" aria-hidden />
          Clé OpenAI enregistrée dans ce navigateur uniquement.
        </span>
        <Button size="sm" variant="ghost" onClick={onClear}>
          <Trash2 className="h-4 w-4" aria-hidden />
          Effacer la clé
        </Button>
      </div>
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const key = value.trim();
    if (key) onSave(key);
    setValue("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="key-title"
      className="space-y-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm sm:p-5"
    >
      <h2 id="key-title" className="flex items-center gap-2 font-semibold text-fg">
        <KeyRound className="h-4 w-4 text-warning" aria-hidden />
        Ajoutez votre clé API OpenAI
      </h2>
      <p className="text-muted">
        Créez une clé sur{" "}
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-accent underline-offset-2 hover:underline"
        >
          platform.openai.com/api-keys
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>{" "}
        (un moyen de paiement OpenAI est nécessaire). La clé reste dans ce navigateur et n&apos;est envoyée qu&apos;à OpenAI.
        N&apos;utilisez pas cette page sur un appareil partagé, et fixez une limite de dépenses sur votre compte OpenAI.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="openai-key" className="sr-only">
          Clé API OpenAI
        </label>
        <input
          id="openai-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-elevated px-3 font-mono text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
        />
        <Button type="submit" variant="primary" disabled={!value.trim()}>
          Enregistrer la clé
        </Button>
      </div>
    </form>
  );
}
