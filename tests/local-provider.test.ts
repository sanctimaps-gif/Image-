import { describe, expect, it } from "vitest";
import { LocalImageProvider } from "@/lib/local-ai/local-provider";
import type { WorkerRequest, WorkerResponse } from "@/lib/local-ai/protocol";
import { fakePng } from "./support/fixtures";

/** Worker factice : répond aux messages selon le scénario fourni par le test. */
class FakeWorker extends EventTarget {
  sent: WorkerRequest[] = [];
  terminated = false;
  constructor(private readonly reply: (message: WorkerRequest, worker: FakeWorker) => void) {
    super();
  }
  postMessage(message: WorkerRequest) {
    this.sent.push(message);
    queueMicrotask(() => this.reply(message, this));
  }
  emit(data: WorkerResponse) {
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
  terminate() {
    this.terminated = true;
  }
}

const request = {
  model: "janus-pro-1b",
  prompt: "A lighthouse in a storm",
  size: "384x384",
  count: 1,
  quality: "auto" as const,
  background: "auto" as const,
  outputFormat: "png" as const,
  outputCompression: null,
  safetyIdentifier: "local",
};

function provider(worker: FakeWorker) {
  return new LocalImageProvider(() => worker as unknown as Worker, "https://example.test/ort/");
}

describe("LocalImageProvider", () => {
  it("transmet la progression puis renvoie l'image produite sur l'appareil", async () => {
    const worker = new FakeWorker((message, w) => {
      if (message.type !== "generate") return;
      w.emit({ type: "progress", id: message.id, phase: "download", loaded: 50, total: 100 });
      w.emit({ type: "progress", id: message.id, phase: "generate", ratio: 0.5 });
      w.emit({ type: "done", id: message.id, png: new Uint8Array(fakePng(384, 384)).buffer, revisedPrompt: "A lighthouse in a storm at night" });
    });
    const progress: unknown[] = [];
    const result = await provider(worker).generate({ ...request, onProgress: (p) => progress.push(p) });

    expect(worker.sent[0]).toMatchObject({ type: "generate", prompt: "A lighthouse in a storm", assetBase: "https://example.test/ort/" });
    expect(progress).toEqual([
      { phase: "download", loaded: 50, total: 100 },
      { phase: "generate", ratio: 0.5 },
    ]);
    expect(Buffer.from(result.images[0]!.data).equals(fakePng(384, 384))).toBe(true);
    expect(result.size).toBe("384x384");
  });

  it("explique clairement l'absence de WebGPU", async () => {
    const worker = new FakeWorker((message, w) => {
      if (message.type === "generate") w.emit({ type: "error", id: message.id, code: "WEBGPU_UNAVAILABLE", detail: "x" });
    });
    await expect(provider(worker).generate(request)).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      message: expect.stringMatching(/WebGPU/),
    });
  });

  it("annule en interrompant le worker", async () => {
    const worker = new FakeWorker(() => {});
    const controller = new AbortController();
    const pending = provider(worker).generate({ ...request, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "CANCELLED" });
    await Promise.resolve();
    expect(worker.sent.map((m) => m.type)).toEqual(["generate", "interrupt"]);
  });

  it("recrée le worker après un plantage (mémoire insuffisante)", async () => {
    const workers: FakeWorker[] = [];
    const p = new LocalImageProvider(() => {
      const w = new FakeWorker((message, self) => {
        if (message.type === "generate") self.dispatchEvent(Object.assign(new Event("error"), { message: "crash" }));
      });
      workers.push(w);
      return w as unknown as Worker;
    }, null);
    const originalError = console.error;
    console.error = () => {};
    try {
      await expect(p.generate(request)).rejects.toMatchObject({ message: expect.stringMatching(/Mémoire insuffisante/) });
      await expect(p.generate(request)).rejects.toBeTruthy();
    } finally {
      console.error = originalError;
    }
    expect(workers).toHaveLength(2);
    expect(workers[0]!.terminated).toBe(true);
  });
});
