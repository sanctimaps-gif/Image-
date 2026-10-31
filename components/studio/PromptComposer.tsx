"use client";

import Image from "next/image";
import { CircleStop, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { AdvancedSettings } from "@/components/studio/AdvancedSettings";
import { FormatPicker } from "@/components/studio/FormatPicker";
import { PromptIdeas } from "@/components/studio/PromptIdeas";
import { StylePicker } from "@/components/studio/StylePicker";
import { TemplateFieldsForm } from "@/components/studio/TemplateFieldsForm";
import { TemplatePicker } from "@/components/studio/TemplatePicker";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { ComposerSettings } from "@/lib/settings";
import { getTemplate, validateTemplateFields } from "@/lib/templates";
import type { GeneratedImage, ModelInfo, TemplateFields, TemplateId } from "@/types/generation";

interface PromptComposerProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  settings: ComposerSettings;
  onSettingsChange: (patch: Partial<ComposerSettings>) => void;
  templateFields: TemplateFields;
  onTemplateChange: (id: TemplateId) => void;
  onTemplateFieldChange: (key: string, value: string) => void;
  models: ModelInfo[];
  model: ModelInfo | null;
  maxImages: number;
  maxPromptLength: number;
  configured: boolean;
  isGenerating: boolean;
  variantSource: GeneratedImage | null;
  onClearVariant: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function PromptComposer({
  textareaRef,
  prompt,
  onPromptChange,
  settings,
  onSettingsChange,
  templateFields,
  onTemplateChange,
  onTemplateFieldChange,
  models,
  model,
  maxImages,
  maxPromptLength,
  configured,
  isGenerating,
  variantSource,
  onClearVariant,
  onSubmit,
  onCancel,
}: PromptComposerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const template = getTemplate(settings.template);
  const fieldsError = validateTemplateFields(template.id, templateFields);
  const trimmed = prompt.trim();
  const tooLong = prompt.length > maxPromptLength;
  const tooShort = trimmed.length > 0 && trimmed.length < 3;
  const canSubmit = configured && !isGenerating && trimmed.length >= 3 && !tooLong && !fieldsError;
  const nearLimit = prompt.length > maxPromptLength * 0.8;

  const disabledReason = !configured
    ? "La génération n'est pas encore configurée sur le serveur."
    : trimmed.length === 0
      ? "Décrivez l'image que vous souhaitez obtenir."
      : tooShort
        ? "Ajoutez quelques mots à votre description."
        : tooLong
          ? `Votre description dépasse ${maxPromptLength} caractères.`
          : fieldsError;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (canSubmit) onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Créer une image" className="flex w-full flex-col gap-4">
      <TemplatePicker value={settings.template} onChange={onTemplateChange} />
      <div
        className={cn(
          "overflow-hidden rounded-3xl border bg-elevated shadow-card transition-[border-color,box-shadow] duration-200",
          "focus-within:border-border-strong focus-within:shadow-pop",
          tooLong ? "border-danger" : "border-border",
        )}
      >
        {variantSource && (
          <div className="flex items-center gap-3 border-b border-border bg-accent-soft/50 px-4 py-2.5 sm:px-5">
            <Image
              src={variantSource.url}
              alt="Image d'origine de la variante"
              width={40}
              height={40}
              unoptimized
              className="h-10 w-10 rounded-lg object-cover"
            />
            <p className="min-w-0 flex-1 text-sm text-fg">
              <span className="font-medium">Variante</span>
              <span className="text-muted"> — ajustez la description puis générez.</span>
            </p>
            <Button variant="ghost" size="icon" onClick={onClearVariant} aria-label="Annuler la variante">
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        )}

        <label htmlFor="prompt" className="sr-only">
          Description de l&apos;image
        </label>
        <textarea
          id="prompt"
          ref={textareaRef}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={template.subjectPlaceholder}
          rows={3}
          maxLength={maxPromptLength + 500}
          aria-describedby="prompt-help"
          aria-invalid={tooLong || undefined}
          className="field-sizing-content block max-h-72 min-h-28 w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[16px] leading-relaxed text-fg placeholder:text-subtle focus:outline-none sm:px-5 sm:pt-5 sm:text-[17px]"
        />

        <TemplateFieldsForm template={template} values={templateFields} onChange={onTemplateFieldChange} />
        {template.id === "none" && !variantSource && <PromptIdeas prompt={prompt} onChange={onPromptChange} />}

        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <Button
              variant={showAdvanced ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
              aria-controls="advanced-settings"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Réglages
            </Button>
            <span id="prompt-help" className="hidden text-xs text-subtle md:inline">
              Entrée pour générer · Maj + Entrée pour un saut de ligne
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {nearLimit && (
              <span className={cn("font-mono text-xs", tooLong ? "text-danger" : "text-subtle")} aria-live="polite">
                {prompt.length}/{maxPromptLength}
              </span>
            )}
            {/* Clés distinctes : React ne doit pas réutiliser le bouton « Annuler » comme bouton submit
                pendant le même clic, sinon l'annulation relancerait une génération. */}
            {isGenerating ? (
              <Button key="cancel" variant="secondary" size="md" onClick={onCancel}>
                <CircleStop className="h-4 w-4" aria-hidden />
                Annuler
              </Button>
            ) : (
              <Button
                key="submit"
                type="submit"
                variant="primary"
                size="md"
                disabled={!canSubmit}
                title={disabledReason ?? undefined}
                className="px-5"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {variantSource ? "Créer la variante" : "Générer l'image"}
              </Button>
            )}
          </div>
        </div>

        {showAdvanced && (
          <div id="advanced-settings" className="animate-fade-in">
            <AdvancedSettings
              models={models}
              model={model}
              settings={settings}
              maxImages={maxImages}
              onChange={onSettingsChange}
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 px-1">
        <StylePicker value={settings.style} onChange={(style) => onSettingsChange({ style })} />
        <FormatPicker model={model} value={settings.aspect} hd={settings.resolution === "hd"} onChange={(aspect) => onSettingsChange({ aspect })} />
      </div>
    </form>
  );
}
