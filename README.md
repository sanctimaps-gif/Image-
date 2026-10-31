# VisionAI — Imaginez. Décrivez. Créez.

Application web de génération d'images par IA : l'utilisateur décrit une image en langage naturel, choisit un style et un format, et obtient une image réellement produite par l'API **OpenAI Images** (modèles GPT Image).

- **Next.js 16** (App Router, Route Handlers), **React 19**, **TypeScript** strict
- **Tailwind CSS 4**, mode clair/sombre, interface responsive et accessible au clavier
- **Zod** pour la validation côté serveur
- **SDK officiel `openai`** pour l'appel au fournisseur
- **Vitest** pour les tests (69 tests, dont la route de génération)

---

## Version en ligne (GitHub Pages)

**<https://sanctimaps-gif.github.io/Image-/>**

Cette version ne dépend d'**aucun service d'IA** (ni ChatGPT/OpenAI, ni autre API) : les images sont calculées **sur l'appareil**, dans le navigateur, par le modèle libre **Janus-Pro 1B** de DeepSeek (licence MIT), via [Transformers.js](https://github.com/huggingface/transformers.js) et WebGPU.

- **Première utilisation** : le modèle (`onnx-community/Janus-Pro-1B-ONNX`, environ 1 Go) est téléchargé une seule fois depuis Hugging Face, puis conservé dans le cache du navigateur. Ce n'est qu'un téléchargement de fichiers : aucune description ni image n'est envoyée.
- **Compatibilité** : WebGPU est indispensable : Safari sur iOS 26 ou plus récent, Chrome / Edge récents sur ordinateur et Android. Sur téléphone, la mémoire disponible peut être insuffisante ; un ordinateur avec une carte graphique est plus confortable.
- **Limites du modèle** : images carrées de 384 × 384 px, meilleure compréhension de l'anglais, texte écrit sur l'image peu fiable. La qualité est nettement inférieure aux grands modèles commerciaux.
- Le moteur ONNX Runtime est servi par le site lui-même (`site/ort/`), sans CDN tiers.
- L'historique et les images restent dans le navigateur (IndexedDB), sur l'appareil utilisé.

La version serveur (dossier `app/api`) peut toujours utiliser l'API OpenAI si vous le souhaitez ; elle n'est pas utilisée par le site en ligne.

Mettre à jour le site après une modification du code :

```bash
npm run build:pages   # régénère site/, index.html et .nojekyll
git add site index.html .nojekyll && git commit -m "Mettre à jour le site" && git push
```

---

## Déployer la version serveur (Vercel)

Ce dépôt contient le **code source**. Pour obtenir une adresse web utilisable (`https://….vercel.app`), déployez-le gratuitement sur Vercel :

1. Ouvrez <https://vercel.com/signup> et choisissez **Continue with GitHub**.
2. Cliquez sur **Add New… → Project**, puis **Import** à côté du dépôt `Image-` (autorisez l'accès au dépôt si Vercel le demande).
3. Dans **Environment Variables**, ajoutez `OPENAI_API_KEY` avec votre clé OpenAI (<https://platform.openai.com/api-keys>).
4. Cliquez sur **Deploy**. Après 1 à 2 minutes, Vercel affiche l'adresse de votre application : ouvrez-la sur votre téléphone.

Sur Vercel, l'historique est stocké dans un dossier temporaire : il fonctionne mais peut être effacé quand le serveur est recyclé (l'interface le signale). Téléchargez les images que vous voulez garder. Pour un historique permanent, voir « Limitations connues ».

---

## Installation

Prérequis : **Node.js ≥ 20.9** (testé avec Node 22) et npm.

```bash
npm install
cp .env.example .env.local      # puis renseignez OPENAI_API_KEY
npm run dev                     # http://localhost:3000
```

Production :

```bash
npm run build
npm start
```

Vérifications :

```bash
npm run typecheck   # génère les types de routes puis lance tsc
npm run lint        # ESLint (config Next.js core-web-vitals + TypeScript)
npm test            # Vitest
npm run check       # les trois à la suite
```

> Le fichier `.npmrc` active `legacy-peer-deps` pour contourner un bug de npm 10 sur les peer-dependencies optionnelles de Vitest.

## Obtenir et configurer la clé API

1. Créez un compte sur <https://platform.openai.com>, puis une clé sur <https://platform.openai.com/api-keys>.
2. Ajoutez un moyen de paiement / des crédits : la génération d'images est facturée à l'usage.
3. Certains modèles (notamment `gpt-image-2` et `gpt-image-1.5`) peuvent exiger une **organisation vérifiée** (*Settings → Organization → Verification*). Sans vérification, l'application affiche « Ce modèle n'est pas accessible… » : retirez alors ce modèle de `OPENAI_IMAGE_MODELS` ou utilisez `gpt-image-1-mini`.
4. Copiez `.env.example` en `.env.local`, renseignez `OPENAI_API_KEY`, puis redémarrez le serveur.

Tant que la clé est absente, l'interface affiche un encart explicatif, le bouton « Générer l'image » est désactivé et l'API renvoie `503 PROVIDER_NOT_CONFIGURED`. **Aucune image n'est jamais simulée.**

### Variables d'environnement

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `OPENAI_API_KEY` | *(vide)* | Clé secrète, lue uniquement côté serveur |
| `OPENAI_IMAGE_MODELS` | `gpt-image-2,gpt-image-1.5,gpt-image-1-mini` | Modèles proposés (reconnus : `gpt-image-2`, `gpt-image-1.5`, `gpt-image-1-mini`, `gpt-image-1`) |
| `OPENAI_IMAGE_DEFAULT_MODEL` | `gpt-image-1.5` | Modèle sélectionné par défaut |
| `OPENAI_TIMEOUT_MS` | `240000` | Délai maximal d'un appel au fournisseur |
| `OPENAI_BASE_URL` | — | Passerelle compatible OpenAI (optionnel) |
| `STORAGE_DIR` | `.data` (dossier temporaire sur Vercel) | Stockage des images et de l'historique |
| `HISTORY_LIMIT` | `100` | Générations conservées par navigateur |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | `6` | Requêtes de génération / minute / client |
| `RATE_LIMIT_IMAGES_PER_DAY` | `40` | Images / jour (UTC) / client |
| `RATE_LIMIT_GLOBAL_IMAGES_PER_DAY` | `400` | Plafond global d'images / jour (maîtrise des coûts) |
| `MAX_IMAGES_PER_REQUEST` | `4` | Images par requête (l'API accepte jusqu'à 10) |
| `MAX_CONCURRENT_GENERATIONS_PER_CLIENT` | `2` | Générations simultanées par client |
| `TRUST_PROXY_HEADERS` | `false` | `true` uniquement derrière un proxy de confiance : active la limitation par IP |

---

## Fonctionnalités opérationnelles

- Génération texte → image via `POST /v1/images/generations` (SDK `openai`).
- **Types de création** (`lib/templates.ts`) : le serveur transforme une description courte et quelques champs en prompt détaillé et structuré.
  - **Affiche épique** : titre, sous-titre, slogan et ambiance (tricolore, or et bleu nuit…) cités mot pour mot ; conseillé en 9:16 HD.
  - **Fiche personnage** : planche de référence avec 5 vues en pied, 6 gros plans et des scènes d'action légendées, en exigeant le même personnage dans chaque case.
  - **Infographie** : titre, étapes numérotées illustrées, encadré « Points clés ».
  - **Photo sportive** : portrait d'athlète façon photographie éditoriale.

  Choisir un type applique les réglages conseillés : GPT Image 2 (le plus fiable pour le texte sur l'image), format adapté, haute qualité, HD.
- **Styles** : Photorealistic, Cinematic, Anime, Illustration, Digital art, 3D render, Fantasy, Minimalist, Watercolor, Pixel art, Logo design (ajoutés au prompt côté serveur — les modèles GPT Image n'ont pas de paramètre `style`).
- **Formats selon les capacités réelles du modèle** :

  | Format | Taille envoyée | Modèles |
  | --- | --- | --- |
  | Carré 1:1 | 1024×1024 | tous |
  | Portrait 2:3 | 1024×1536 | tous |
  | Paysage 3:2 | 1536×1024 | tous |
  | Grand écran 16:9 | 1536×864 | `gpt-image-2` uniquement (tailles libres multiples de 16) |
  | Vertical 9:16 | 864×1536 | `gpt-image-2` uniquement |

  **Haute définition** (`gpt-image-2`) : 1920×1920, 1536×2304, 2304×1536, 2560×1440 et 1440×2560. Toutes ces tailles restent sous la limite non expérimentale documentée (2560×1440 px de surface). Elles coûtent plus cher qu'en standard.

  Un format non pris en charge est affiché désactivé, et refusé par le serveur.
- **Réglages avancés** reliés à l'API : modèle, nombre d'images (`n`), qualité (`low`/`medium`/`high`/`auto`), arrière-plan (`transparent` sur GPT Image 1/1.5/1-mini ; non proposé sur `gpt-image-2` où il n'est qu'en aperçu), format de fichier (PNG/JPEG/WebP) et compression.
- **Variantes** : « Créer une variante » envoie l'image d'origine à `POST /v1/images/edits` avec le prompt (modifiable). L'ancien endpoint de variations DALL·E étant retiré, c'est la méthode documentée pour les modèles GPT Image.
- Exemples cliquables reprenant ces rendus : affiches « Rouen » et « La France rayonne », fiche joueur de water-polo, infographie « Crawl polo », photo de football américain.
- Résultat en grand format, miniatures si plusieurs images, **vue agrandie** (Échap, flèches), **téléchargement**, **copie du prompt**, **Réessayer**, **Modifier** (recharge prompt et réglages), affichage des paramètres utilisés.
- **Historique persistant** (galerie responsive) : afficher, copier, réutiliser, télécharger, supprimer. Chaque génération et chaque image a un UUID.
- États clairs : chargement animé au ratio demandé avec temps écoulé, **annulation** (propagée jusqu'à l'appel OpenAI), erreurs compréhensibles avec « Réessayer », images indisponibles.
- Exemples de prompts cliquables pour l'inspiration (cartes textuelles, aucune fausse image).
- Mode sombre (préférence système + bascule mémorisée), réglages mémorisés localement.

## Sécurité

- Clé API uniquement côté serveur (`server-only`), jamais exposée au client ; `.env*` ignorés par git.
- Validation stricte (Zod) de chaque champ, clés inconnues refusées, puis **revalidation contre les capacités du modèle** : le navigateur n'est jamais cru sur parole.
- Corps JSON limité à 16 Ko (vérifié même sans `Content-Length`), prompt limité à 4 000 caractères et nettoyé des caractères de contrôle.
- Protection CSRF (vérification `Origin` / `Sec-Fetch-Site`) sur les routes qui modifient l'état.
- Limitation : requêtes/minute, images/jour par client (et par IP si `TRUST_PROXY_HEADERS=true`), plafond global quotidien, générations simultanées. Les quotas sont restitués en cas d'échec du fournisseur, sauf refus de modération.
- Historique et images cloisonnés par un identifiant anonyme en cookie `httpOnly` ; un autre navigateur obtient 404. Identifiants de fichiers validés (UUID) contre la traversée de répertoires.
- Modération du fournisseur conservée (`moderation: "auto"`) et `safety_identifier` haché transmis à OpenAI pour la détection d'abus.
- Vérification de la signature binaire des images renvoyées : une donnée qui n'est pas une image n'est jamais présentée comme résultat.
- Erreurs normalisées (`lib/errors.ts`) : messages lisibles, sans trace interne ni secret ; en-têtes de sécurité HTTP globaux.

## Architecture

```
app/
  page.tsx                     page d'accueil (composant serveur → configuration publique)
  api/generate/route.ts        POST : génération / variante
  api/generations/route.ts     GET : historique du navigateur
  api/generations/[id]/        DELETE : suppression
  api/images/[id]/             GET : fichier image (?download=1 pour télécharger)
  api/config/route.ts          GET : capacités publiques des fournisseurs
components/                    en-tête, pied de page, primitives UI (Button, RadioChips, Toast)
components/studio/             compositeur, réglages, progression, résultat, lightbox, historique
hooks/                         useGenerator (machine à états + annulation), useHistory, useTheme, useClipboard
lib/
  image-providers/             interface ImageProvider, fournisseur OpenAI, capacités des modèles
  generation-service.ts        orchestration : validation, quotas, appel fournisseur, persistance
  validation.ts                schémas Zod + vérification des capacités
  storage/                     interface GenerationStore + implémentation fichiers
  rate-limit.ts, http.ts, owner.ts, errors.ts, env.ts, catalog.ts, prompt.ts, settings.ts
types/                         types partagés client/serveur
tests/                         tests Vitest
```

**Ajouter un fournisseur** (Stability, modèle open source auto-hébergé…) : implémentez `ImageProvider` (`lib/image-providers/types.ts`) en déclarant ses modèles et leurs capacités, puis enregistrez-le dans `lib/image-providers/index.ts`. L'interface et la validation s'adaptent automatiquement.

**Brancher une base de données** : implémentez `GenerationStore` (`lib/storage/types.ts`) — par ex. PostgreSQL + stockage objet S3 — et remplacez `FileGenerationStore` dans `lib/server-context.ts`.

**Comptes utilisateurs** : remplacez `getOwnerId()` (`lib/owner.ts`) par l'identifiant de l'utilisateur connecté ; tout le reste est déjà cloisonné par propriétaire.

## Limitations connues

- **Pas testé contre l'API OpenAI réelle dans cet environnement** : aucune clé n'était disponible et l'accès réseau à OpenAI était bloqué. Les paramètres ont été vérifiés dans les types du SDK officiel `openai@7.43.0`, et le parcours complet a été validé dans un navigateur contre un serveur local imitant les endpoints `/v1/images/generations` et `/v1/images/edits` (requêtes HTTP réelles via le SDK).
- Stockage sur le disque local : adapté à un serveur unique (VPS, conteneur avec volume). Sur Vercel, il bascule automatiquement sur le dossier temporaire (historique non garanti) ; pour un historique durable, il faut une implémentation `GenerationStore` base de données + stockage objet (Vercel Blob, S3…).
- Limiteurs en mémoire : remis à zéro au redémarrage et non partagés entre instances (prévoir Redis/Upstash en multi-instances).
- Sans `TRUST_PROXY_HEADERS`, la limitation est par cookie : un client qui efface ses cookies obtient un nouveau quota (le plafond global quotidien reste la protection de coût).
- L'historique est lié au navigateur (cookie) : il n'est pas synchronisé entre appareils.
- Pas de génération en streaming (images partielles) pour l'instant.
- Modèles `gpt-image-2.5-*` non intégrés (capacités à confirmer).

## Prochaines étapes recommandées

1. Configurer la clé et tester chaque modèle avec votre organisation OpenAI.
2. Stockage durable (PostgreSQL + S3/R2) et limiteur partagé (Redis) pour la production.
3. Authentification (Auth.js, Clerk…) puis historique synchronisé et partage de créations.
4. Streaming des images partielles (`stream: true`, `partial_images`) pour un retour visuel progressif.
5. Import d'une image de référence et masques d'édition (`/v1/images/edits` accepte déjà jusqu'à 16 images et un masque).
6. Amélioration automatique des prompts, crédits/abonnements (avec un vrai prestataire de paiement), tableau de bord d'usage et d'administration.
