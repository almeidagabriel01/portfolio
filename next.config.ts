import type { NextConfig } from "next";
import { portfolioProjects } from "./src/data/projects";

/**
 * As origens que o card de destaque embute ao vivo. Derivadas do dado, e não
 * escritas à mão: um projeto novo em `projects.ts` já entra na política, e um
 * `frame-src` desatualizado deixaria a janela em branco sem dizer por quê.
 */
const ORIGENS_EMBUTIDAS = [
  ...new Set(portfolioProjects.map((p) => new URL(p.link).origin)),
].sort();

// `next dev` precisa de eval para o refresh do Turbopack; produção não. A
// política é gravada no manifesto em build time, então este flag reflete o
// ambiente do build.
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // 'unsafe-inline': o bootstrap de streaming/RSC do Next injeta scripts inline.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // 'unsafe-inline': Tailwind v4 e next/font injetam <style> inline.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  // Voltou a ser derivada de `data/projects.ts`: o card de destaque embute o
  // site publicado para o visitante mexer nele. Só estas origens, e nenhuma
  // outra: `frame-src` continua sendo uma allowlist fechada.
  `frame-src ${ORIGENS_EMBUTIDAS.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  // O CSS crítico vai no HTML: com os pôsteres fora da fila, a folha passou a
  // ser o último recurso render-blocking antes do FCP.
  experimental: { inlineCss: true },
  // Sem esta declaração o Turbopack deixa `process.env.NEXT_PUBLIC_E2E` como
  // leitura em runtime e o corpo dos seams de debug continua no bundle,
  // apenas inalcançável. Declarado aqui, ele vira literal em build time. No
  // build de produção vira `""` e o minificador elimina os blocos inteiros.
  env: { NEXT_PUBLIC_E2E: process.env.NEXT_PUBLIC_E2E ?? "" },
  // Build de e2e em diretório próprio. O Turbopack **não** invalida o cache
  // quando só `NEXT_PUBLIC_E2E` muda: um `npm run build` sem a flag logo antes
  // do build do Playwright devolvia o bundle sem seams e derrubava ~30 e2e de
  // uma vez. Caches separados tornam a ordem dos builds irrelevante.
  distDir: process.env.NEXT_PUBLIC_E2E ? ".next-e2e" : ".next",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
