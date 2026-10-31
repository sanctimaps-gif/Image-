// Construit la version en ligne de VisionAI pour GitHub Pages (exécuté par GitHub Actions,
// voir .github/workflows/pages.yml). Le résultat, dans pages-dist/, n'est pas versionné.
// Les routes /api (serveur) sont mises de côté le temps du build puis restaurées.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const repo = process.env.PAGES_REPO_NAME ?? "Image-";
const basePath = `/${repo}`;
const output = path.join(root, "pages-dist");
const api = path.join(root, "app", "api");
const parked = path.join(root, ".api-build-pages");

if (existsSync(parked)) {
  console.error("Un build précédent n'a pas restauré app/api : déplacez .api-build-pages vers app/api puis relancez.");
  process.exit(1);
}

renameSync(api, parked);
let status = 1;
try {
  const result = spawnSync("npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_VISIONAI_STATIC: "1",
      NEXT_PUBLIC_VISIONAI_BASE_PATH: basePath,
      VISIONAI_BASE_PATH: basePath,
    },
  });
  status = result.status ?? 1;
} finally {
  renameSync(parked, api);
}
if (status !== 0) process.exit(status);

rmSync(output, { recursive: true, force: true });
renameSync(path.join(root, "out"), output);

// Les source maps sont inutiles en ligne.
for (const file of readdirSync(output, { recursive: true })) {
  if (String(file).endsWith(".map")) rmSync(path.join(output, String(file)));
}

// Moteur ONNX Runtime (WebAssembly + WebGPU) servi par le site lui-même, sans CDN tiers.
const ortDist = path.join(root, "node_modules", "onnxruntime-web", "dist");
for (const file of ["ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.wasm"]) {
  cpSync(path.join(ortDist, file), path.join(output, "ort", file));
}
writeFileSync(path.join(output, ".nojekyll"), "");

console.log(`\nSite prêt dans pages-dist/ (servi sous ${basePath}/).`);
