// Construit la version statique de VisionAI pour GitHub Pages.
// Les routes /api (serveur) sont mises de côté le temps du build puis restaurées.
// Résultat : dossier site/ + index.html de redirection et .nojekyll à la racine du dépôt.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const repo = process.env.PAGES_REPO_NAME ?? "Image-";
const basePath = `/${repo}/site`;
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
    env: { ...process.env, NEXT_PUBLIC_VISIONAI_STATIC: "1", VISIONAI_BASE_PATH: basePath },
  });
  status = result.status ?? 1;
} finally {
  renameSync(parked, api);
}
if (status !== 0) process.exit(status);

rmSync(path.join(root, "site"), { recursive: true, force: true });
cpSync(path.join(root, "out"), path.join(root, "site"), { recursive: true });
rmSync(path.join(root, "out"), { recursive: true, force: true });

writeFileSync(path.join(root, ".nojekyll"), "");
writeFileSync(
  path.join(root, "index.html"),
  `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VisionAI</title>
<meta http-equiv="refresh" content="0; url=./site/">
<link rel="canonical" href="./site/">
</head>
<body><p><a href="./site/">Ouvrir VisionAI</a></p></body>
</html>
`,
);
console.log(`\nSite statique prêt dans site/ (servi sous ${basePath}/).`);
