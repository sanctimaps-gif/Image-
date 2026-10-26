"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorBanner } from "@/components/studio/ErrorBanner";
import { GenerationProgress } from "@/components/studio/GenerationProgress";
import { HistoryGallery } from "@/components/studio/HistoryGallery";
import { ImageLightbox } from "@/components/studio/ImageLightbox";
import { InspirationGallery, type Inspiration } from "@/components/studio/InspirationGallery";
import { PromptComposer } from "@/components/studio/PromptComposer";
import { ResultPanel } from "@/components/studio/ResultPanel";
import { SetupNotice } from "@/components/studio/SetupNotice";
import { useToast } from "@/components/ui/Toast";
import { useClipboard } from "@/hooks/useClipboard";
import { useGenerator } from "@/hooks/useGenerator";
import { useHistory } from "@/hooks/useHistory";
import type { ApiClientError } from "@/lib/api-client";
import {
  applyTemplateDefaults,
  coerceSettings,
  DEFAULT_SETTINGS,
  settingsFromGeneration,
  type ComposerSettings,
} from "@/lib/settings";
import { cleanTemplateFields, getTemplate } from "@/lib/templates";
import type { GenerateRequestInput } from "@/lib/validation";
import type { AppConfig, GeneratedImage, Generation, TemplateFields, TemplateId } from "@/types/generation";

const SETTINGS_KEY = "visionai-settings";

function errorTitle(error: ApiClientError): string {
  switch (error.code) {
    case "CONTENT_POLICY":
      return "Demande refusée par la modération";
    case "RATE_LIMITED":
    case "TOO_MANY_CONCURRENT":
    case "PROVIDER_RATE_LIMITED":
      return "Limite atteinte";
    case "PROVIDER_NOT_CONFIGURED":
    case "PROVIDER_AUTH":
    case "PROVIDER_QUOTA":
    case "PROVIDER_PERMISSION":
      return "Service non disponible";
    case "NETWORK_ERROR":
      return "Problème de connexion";
    case "TIMEOUT":
      return "Délai dépassé";
    default:
      return "La génération a échoué";
  }
}

export function Studio({ config }: { config: AppConfig }) {
  const provider = config.providers.find((p) => p.configured) ?? config.providers[0] ?? null;
  const models = useMemo(() => provider?.models ?? [], [provider]);
  const configured = Boolean(provider?.configured);
  const maxImages = config.limits.maxImagesPerRequest;
  const defaultModel = provider?.defaultModel ?? models[0]?.id ?? "";

  const [prompt, setPrompt] = useState("");
  const [settings, setSettings] = useState<ComposerSettings>({ ...DEFAULT_SETTINGS, model: defaultModel });
  const [templateFields, setTemplateFields] = useState<TemplateFields>({});
  const [variantSource, setVariantSource] = useState<GeneratedImage | null>(null);
  const [lightbox, setLightbox] = useState<{ generation: Generation; index: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();
  const copy = useClipboard();

  const history = useHistory();
  const { add: addToHistory } = history;
  const handleSuccess = useCallback(
    (generation: Generation) => {
      addToHistory(generation);
      // Une variante aboutie : le compositeur revient en mode texte → image.
      if (generation.kind === "variation") setVariantSource(null);
    },
    [addToHistory],
  );
  const generator = useGenerator(handleSuccess);
  const { state } = generator;

  const model = models.find((m) => m.id === settings.model) ?? models[0] ?? null;

  // Restaure les derniers réglages de ce navigateur (simple confort, revalidé contre les capacités du modèle).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null") as Partial<ComposerSettings> | null;
      if (!saved || typeof saved !== "object") return;
      const merged = { ...DEFAULT_SETTINGS, model: defaultModel, ...saved };
      const savedModel = models.find((m) => m.id === merged.model) ?? models.find((m) => m.id === defaultModel);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedModel) setSettings(coerceSettings(merged, savedModel, maxImages));
    } catch {
      // Réglages illisibles : on garde les valeurs par défaut.
    }
  }, [models, defaultModel, maxImages]);

  const updateSettings = useCallback(
    (patch: Partial<ComposerSettings>) => {
      setSettings((current) => {
        const merged = { ...current, ...patch };
        const nextModel = models.find((m) => m.id === merged.model);
        const next = nextModel ? coerceSettings(merged, nextModel, maxImages) : merged;
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
        } catch {
          // Stockage indisponible : sans conséquence.
        }
        return next;
      });
    },
    [models, maxImages],
  );

  function toRequest(
    text: string,
    s: ComposerSettings,
    fields: TemplateFields,
    sourceImageId: string | null,
  ): GenerateRequestInput {
    return {
      prompt: text,
      providerId: provider?.id,
      model: s.model,
      style: s.style,
      template: s.template,
      templateFields: cleanTemplateFields(s.template, fields),
      aspect: s.aspect,
      resolution: s.resolution,
      quality: s.quality,
      background: s.background,
      outputFormat: s.outputFormat,
      outputCompression: s.outputFormat === "png" ? null : s.outputCompression,
      count: s.count,
      sourceImageId,
    };
  }

  function focusComposer() {
    document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
    textareaRef.current?.focus({ preventScroll: true });
  }

  function handleSubmit() {
    if (generator.isGenerating) return;
    void generator.generate(toRequest(prompt, settings, templateFields, variantSource?.id ?? null));
  }

  function changeTemplate(id: TemplateId) {
    setSettings((current) => {
      const next = applyTemplateDefaults(current, getTemplate(id), models, maxImages);
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // Stockage indisponible : sans conséquence.
      }
      return next;
    });
    setTemplateFields({});
  }

  function loadIntoComposer(generation: Generation) {
    setPrompt(generation.prompt);
    setTemplateFields(generation.templateFields ?? {});
    updateSettings(settingsFromGeneration(generation.settings));
    setVariantSource(null);
    focusComposer();
  }

  function startVariant(generation: Generation, image: GeneratedImage) {
    setPrompt(generation.prompt);
    setTemplateFields(generation.templateFields ?? {});
    updateSettings(settingsFromGeneration(generation.settings));
    setVariantSource(image);
    focusComposer();
  }

  function retry(generation: Generation) {
    const target = models.find((m) => m.id === generation.settings.model) ?? model;
    if (!target) return;
    const s = coerceSettings(settingsFromGeneration(generation.settings), target, maxImages);
    void generator.generate(toRequest(generation.prompt, s, generation.templateFields ?? {}, generation.sourceImageId));
  }

  function pickInspiration(item: Inspiration) {
    changeTemplate(item.template);
    setPrompt(item.prompt);
    setTemplateFields(item.fields);
    setVariantSource(null);
    updateSettings(item.template === "none" ? { style: item.style, aspect: item.aspect } : { aspect: item.aspect });
    focusComposer();
  }

  async function handleDelete(generation: Generation) {
    if (!window.confirm("Supprimer définitivement cette création et ses images ?")) return;
    try {
      await history.remove(generation.id);
      if (state.status === "success" && state.generation.id === generation.id) generator.reset();
      if (variantSource && generation.images.some((i) => i.id === variantSource.id)) setVariantSource(null);
      toast.show("Création supprimée", "success");
    } catch (error) {
      toast.show((error as ApiClientError).message ?? "Suppression impossible.", "error");
    }
  }

  const current = state.status === "success" ? state.generation : null;
  const loadingFormat =
    state.status === "loading" ? (models.find((m) => m.id === state.request.model)?.formats.find((f) => f.aspect === state.request.aspect) ?? null) : null;
  const canVariantFor = (g: Generation) =>
    configured && Boolean(models.find((m) => m.id === g.settings.model)?.supportsVariations);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 pb-20 sm:px-6">
      <section id="top" className="mx-auto flex w-full max-w-3xl scroll-mt-24 flex-col gap-8 pt-10 sm:pt-16">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
            Imaginez. Décrivez.{" "}
            <span className="bg-gradient-to-r from-[#7c6cff] to-[#e45cc8] bg-clip-text text-transparent">Créez.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-pretty text-muted sm:text-lg">
            Transformez vos idées en images : décrivez simplement ce que vous imaginez, VisionAI s&apos;occupe du reste.
          </p>
        </div>

        {!configured && <SetupNotice />}

        <PromptComposer
          textareaRef={textareaRef}
          prompt={prompt}
          onPromptChange={setPrompt}
          settings={settings}
          onSettingsChange={updateSettings}
          templateFields={templateFields}
          onTemplateChange={changeTemplate}
          onTemplateFieldChange={(key, value) => setTemplateFields((current) => ({ ...current, [key]: value }))}
          models={models}
          model={model}
          maxImages={maxImages}
          maxPromptLength={config.limits.maxPromptLength}
          configured={configured}
          isGenerating={generator.isGenerating}
          variantSource={variantSource}
          onClearVariant={() => setVariantSource(null)}
          onSubmit={handleSubmit}
          onCancel={generator.cancel}
        />
      </section>

      {(state.status !== "idle" || current) && (
        <div className="-mt-4 flex flex-col gap-4">
          {state.status === "loading" && (
            <GenerationProgress
              startedAt={state.startedAt}
              prompt={state.request.prompt}
              format={loadingFormat}
              count={state.request.count ?? 1}
              onCancel={generator.cancel}
            />
          )}
          {state.status === "error" && (
            <ErrorBanner
              title={errorTitle(state.error)}
              message={
                state.error.retryAfterSeconds
                  ? `${state.error.message} (réessayez dans ${state.error.retryAfterSeconds} s)`
                  : state.error.message
              }
              onRetry={state.error.retryable || state.error.code === "PROVIDER_BAD_REQUEST" ? () => void generator.generate(state.request) : undefined}
              onDismiss={generator.reset}
            />
          )}
          {state.status === "cancelled" && (
            <ErrorBanner
              tone="info"
              title="Génération annulée"
              message="Si l'image a été produite entre-temps, elle apparaîtra dans votre historique."
              onRetry={() => void generator.generate(state.request)}
              onDismiss={() => {
                generator.reset();
                void history.reload();
              }}
            />
          )}
          {current && (
            <ResultPanel
              key={current.id}
              generation={current}
              models={models}
              canCreateVariant={canVariantFor(current)}
              busy={generator.isGenerating || !configured}
              onCopyPrompt={() => void copy(current.prompt, "Prompt copié")}
              onRetry={() => retry(current)}
              onEdit={() => loadIntoComposer(current)}
              onVariant={(image) => startVariant(current, image)}
              onOpen={(index) => setLightbox({ generation: current, index })}
            />
          )}
        </div>
      )}

      <HistoryGallery
        items={history.items}
        status={history.status}
        error={history.error}
        activeId={current?.id ?? null}
        onReload={() => void history.reload()}
        onSelect={(g) => {
          if (generator.isGenerating) setLightbox({ generation: g, index: 0 });
          else {
            generator.show(g);
            focusResult();
          }
        }}
        onCopyPrompt={(g) => void copy(g.prompt, "Prompt copié")}
        onEdit={loadIntoComposer}
        onDelete={(g) => void handleDelete(g)}
      />

      <InspirationGallery onPick={pickInspiration} />

      {lightbox && (
        <ImageLightbox
          generation={lightbox.generation}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox({ ...lightbox, index })}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

function focusResult() {
  requestAnimationFrame(() => {
    document.getElementById("result-title")?.closest("section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
