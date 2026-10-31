import type { NextConfig } from "next";

/**
 * Deux cibles :
 *  - serveur Next.js (par défaut) : routes /api, clé API côté serveur ;
 *  - site statique pour GitHub Pages (NEXT_PUBLIC_VISIONAI_STATIC=1, voir scripts/build-pages.mjs).
 */
const isStatic = process.env.NEXT_PUBLIC_VISIONAI_STATIC === "1";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = isStatic
  ? {
      output: "export",
      basePath: process.env.VISIONAI_BASE_PATH ?? "",
      trailingSlash: true,
      images: { unoptimized: true },
      // Les routes /api sont retirées pendant ce build : la vérification de types (qui inclut
      // leurs tests) est faite par `npm run typecheck` et par le build serveur.
      typescript: { ignoreBuildErrors: true },
    }
  : {
      poweredByHeader: false,
      async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
      },
    };

export default nextConfig;
