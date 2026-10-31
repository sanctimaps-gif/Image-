/// <reference lib="webworker" />
import {
  AutoProcessor,
  BaseStreamer,
  InterruptableStoppingCriteria,
  MultiModalityCausalLM,
  env,
  type Processor,
  type ProgressInfo,
} from "@huggingface/transformers";
import { LOCAL_MODEL_ID, type LocalErrorCode, type WorkerRequest, type WorkerResponse } from "@/lib/local-ai/protocol";

/**
 * Exécute Janus-Pro-1B (DeepSeek, licence MIT) entièrement dans le navigateur via WebGPU.
 * Le modèle est téléchargé une seule fois depuis Hugging Face puis gardé dans le cache du navigateur ;
 * le texte et les images ne quittent jamais l'appareil.
 */
declare const self: DedicatedWorkerGlobalScope;

const post = (message: WorkerResponse, transfer: Transferable[] = []) => self.postMessage(message, transfer);

let loading: Promise<{ processor: Processor; model: MultiModalityCausalLM }> | null = null;
const stopping = new InterruptableStoppingCriteria();

async function load(id: number, assetBase: string | null) {
  if (assetBase && env.backends.onnx.wasm) {
    // Moteur ONNX Runtime servi par le site lui-même (aucun CDN tiers).
    env.backends.onnx.wasm.wasmPaths = {
      mjs: `${assetBase}ort-wasm-simd-threaded.asyncify.mjs`,
      wasm: `${assetBase}ort-wasm-simd-threaded.asyncify.wasm`,
    };
  }
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<{ features: ReadonlySet<string> } | null> } }).gpu;
  const adapter = await gpu?.requestAdapter();
  if (!adapter) throw localError("WEBGPU_UNAVAILABLE", "navigator.gpu indisponible");
  const fp16 = adapter.features.has("shader-f16");

  let lastReported = -1;
  const onProgress = (info: ProgressInfo) => {
    if (info.status !== "progress_total") return;
    const percent = Math.floor(info.progress * 2) / 2; // pas de 0,5 %
    if (percent === lastReported) return;
    lastReported = percent;
    post({ type: "progress", id, phase: "download", loaded: info.loaded, total: info.total });
  };

  const processor = await AutoProcessor.from_pretrained(LOCAL_MODEL_ID);
  const model = (await MultiModalityCausalLM.from_pretrained(LOCAL_MODEL_ID, {
    // Réglages du démonstrateur officiel Transformers.js pour Janus-Pro en WebGPU.
    dtype: fp16
      ? { prepare_inputs_embeds: "q4", language_model: "q4f16", lm_head: "fp16", gen_head: "fp16", gen_img_embeds: "fp16", image_decode: "fp32" }
      : { prepare_inputs_embeds: "fp32", language_model: "q4", lm_head: "fp32", gen_head: "fp32", gen_img_embeds: "fp32", image_decode: "fp32" },
    device: {
      prepare_inputs_embeds: "wasm",
      language_model: "webgpu",
      lm_head: "webgpu",
      gen_head: "webgpu",
      gen_img_embeds: "webgpu",
      image_decode: "webgpu",
    },
    progress_callback: onProgress,
  })) as MultiModalityCausalLM;
  return { processor, model };
}

/** Compte les jetons d'image produits pour afficher une progression réelle. */
class ProgressStreamer extends BaseStreamer {
  private count = 0;
  constructor(
    private readonly total: number,
    private readonly onRatio: (ratio: number) => void,
  ) {
    super();
  }
  put(value: bigint[][]) {
    this.count += value[0]?.length ?? 1;
    this.onRatio(Math.min(1, this.count / this.total));
  }
  end() {
    this.onRatio(1);
  }
}

/**
 * Étape « compréhension » : le modèle de langage de Janus-Pro réécrit la demande en une consigne
 * anglaise détaillée (langue qu'il maîtrise le mieux), sans rien inventer d'incompatible.
 */
const ENHANCE_INSTRUCTION = `You prepare prompts for an image generator.
Rewrite the request below as ONE detailed English image prompt.
Keep every element of the request exactly: subjects, colours, positions, relations between objects, setting, lighting, mood and style.
If the request is short or vague, complete only what is missing, choosing details that go well together:
- setting: where the subject is;
- lighting and mood: time of day, weather, light direction, warm/cool contrast;
- composition: camera angle and framing; for large subjects, small people or objects to show the scale;
- rendering: medium and quality, for example detailed photography, painting or illustration.
Never contradict the request. Do not add any text, letters or watermark to the image.
Answer with the prompt only, on a single line, without quotes or comments.

Request: `;

async function enhancePrompt(processor: Processor, model: MultiModalityCausalLM, prompt: string): Promise<string | null> {
  const inputs = await processor([{ role: "<|User|>", content: ENHANCE_INSTRUCTION + prompt }]);
  const promptLength = (inputs.input_ids as { dims: number[] }).dims.at(-1)!;
  const output = (await model.generate({
    ...inputs,
    max_new_tokens: 160,
    do_sample: false,
    stopping_criteria: stopping,
  })) as { slice: (...args: unknown[]) => unknown };
  const newTokens = output.slice(null, [promptLength, null]);
  const [text] = (processor as unknown as { batch_decode: (t: unknown, o: object) => string[] }).batch_decode(newTokens, {
    skip_special_tokens: true,
  });
  const cleaned = (text ?? "").replace(/\s+/g, " ").replace(/^["'«\s]+|["'»\s]+$/g, "").trim();
  // Une réponse vide ou trop courte est ignorée : on garde alors la description d'origine.
  return cleaned.length >= 12 ? cleaned.slice(0, 1500) : null;
}

async function generate(id: number, prompt: string, enhance: boolean, assetBase: string | null) {
  try {
    loading ??= load(id, assetBase).catch((error) => {
      loading = null;
      throw error;
    });
    const { processor, model } = await loading;
    stopping.reset();

    let revisedPrompt: string | null = null;
    if (enhance) {
      post({ type: "progress", id, phase: "understand" });
      revisedPrompt = await enhancePrompt(processor, model, prompt);
      if (stopping.interrupted) throw localError("INTERRUPTED", "interrompu");
    }

    const conversation = [{ role: "<|User|>", content: revisedPrompt ?? prompt }];
    const inputs = await processor(conversation, { chat_template: "text_to_image" });
    const numImageTokens = (processor as unknown as { num_image_tokens: number }).num_image_tokens;
    let lastSent = 0;
    const streamer = new ProgressStreamer(numImageTokens, (ratio) => {
      if (ratio - lastSent >= 0.01 || ratio === 1) {
        lastSent = ratio;
        post({ type: "progress", id, phase: "generate", ratio });
      }
    });

    const images = await model.generate_images({
      ...inputs,
      min_new_tokens: numImageTokens,
      max_new_tokens: numImageTokens,
      do_sample: true,
      streamer,
      stopping_criteria: stopping,
    });
    if (stopping.interrupted) throw localError("INTERRUPTED", "interrompu");
    const image = images[0];
    if (!image) throw localError("FAILED", "aucune image produite");
    const blob: Blob = await image.toBlob("image/png");
    const png = await blob.arrayBuffer();
    post({ type: "done", id, png, revisedPrompt }, [png]);
  } catch (error) {
    const coded = error as { localCode?: LocalErrorCode };
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    const code: LocalErrorCode =
      coded.localCode ??
      (/memory|allocation|OOM|out of memory|device lost/i.test(detail)
        ? "OUT_OF_MEMORY"
        : /fetch|network|download|404|Failed to load/i.test(detail)
          ? "DOWNLOAD_FAILED"
          : "FAILED");
    post({ type: "error", id, code, detail });
  }
}

function localError(code: LocalErrorCode, message: string) {
  return Object.assign(new Error(message), { localCode: code });
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (message.type === "interrupt") stopping.interrupt();
  else if (message.type === "generate") void generate(message.id, message.prompt, message.enhance, message.assetBase);
});
