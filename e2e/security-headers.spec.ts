import { expect, test } from "@playwright/test";
import { portfolioProjects } from "../src/data/projects";

declare global {
  interface Window {
    __cspViolations?: string[];
  }
}

test.describe("Headers de segurança", () => {
  test("Content-Security-Policy está presente na resposta", async ({
    page,
  }) => {
    const response = await page.goto("/");
    expect(response?.headers()["content-security-policy"]).toContain(
      "default-src 'self'",
    );
  });

  // O servidor de teste roda `next build && next start`, então esta é a
  // política de produção.
  test("CSP de produção não permite unsafe-eval", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.headers()["content-security-policy"]).not.toContain(
      "unsafe-eval",
    );
  });

  // (histórico) O T21 deletou o `BrowserPreview`, único iframe do site. Sem frame
  // para liberar, a allowlist derivada de `data/projects.ts` virou `'none'`:
  // asserção exata, mais estreita que a anterior.
  test("frame-src é uma allowlist fechada dos sites embutidos", async ({
    page,
  }) => {
    const response = await page.goto("/");
    const csp = response?.headers()["content-security-policy"] ?? "";
    const frameSrc = csp
      .split(";")
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith("frame-src"));

    /**
     * O card de destaque embute o site publicado de cada projeto para o
     * visitante mexer nele, então `'none'` deixou de valer. O que se cobra
     * agora é que a lista seja **fechada e derivada do dado**: só origens de
     * `projects.ts`, nenhum curinga, e nada de `'self'`: a nossa origem não
     * precisa se embutir.
     */
    const origens = [
      ...new Set(portfolioProjects.map((p) => new URL(p.link).origin)),
    ].sort();
    expect(frameSrc).toBe(`frame-src ${origens.join(" ")}`);
    expect(frameSrc).not.toContain("*");
  });

  test("Referrer-Policy é strict-origin-when-cross-origin", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.headers()["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  test("X-Content-Type-Options é nosniff", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("X-Frame-Options é DENY", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.headers()["x-frame-options"]).toBe("DENY");
  });

  test("Permissions-Policy desliga camera, microfone e geolocalização", async ({
    page,
  }) => {
    const response = await page.goto("/");
    const value = response?.headers()["permissions-policy"] ?? "";
    expect(value).toContain("camera=()");
    expect(value).toContain("microphone=()");
    expect(value).toContain("geolocation=()");
  });

  // "CSP definida ... shader e Next funcionam": a política só é aceitável se a
  // página real carregar sem violá-la.
  test("a página carrega sem nenhuma violação de CSP", async ({ page }) => {
    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener("securitypolicyviolation", (event) => {
        window.__cspViolations?.push(
          `${event.violatedDirective}: ${event.blockedURI}`,
        );
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const violations = await page.evaluate(() => window.__cspViolations ?? []);
    expect(violations).toEqual([]);
  });
});
