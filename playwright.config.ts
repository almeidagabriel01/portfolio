import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Build de produção, não `next dev`: os headers de segurança e o CSP que os
  // testes asseram só valem se a resposta vier do servidor de produção.
  // `NEXT_PUBLIC_E2E` é inlinado em build time: precisa estar no ambiente do
  // `next build`, não só do `next start`. Sem ele os seams de debug
  // (`__lenis`, `__backgroundRenderer`, `__routeState`) somem do bundle, que
  // é exatamente o que o T22 exige do build de produção real.
  webServer: {
    command: "npm run build && npm run start",
    env: { NEXT_PUBLIC_E2E: "1" },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
