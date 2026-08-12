import { expect, test } from "@playwright/test";

const ORIGIN = "http://localhost:3000";

test.describe("Auditoria de performance", () => {
  // "Zero request a domínio externo no carregamento inicial" cobre também a
  // fonte: Switzer e Geist são self-hosted por `next/font`.
  test("o carregamento inicial não faz nenhuma requisição para fora do domínio", async ({
    page,
  }) => {
    const externas: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith("data:") || url.startsWith("blob:")) return;
      if (!url.startsWith(ORIGIN)) externas.push(url);
    });

    await page.goto("/");
    await page.waitForFunction(() => document.fonts.status === "loaded");
    await page.waitForTimeout(1000);

    // Piso: sem requisição nenhuma a asserção não provaria nada.
    expect(await page.evaluate(() => performance.getEntriesByType("resource").length))
      .toBeGreaterThan(0);
    expect(externas).toEqual([]);
  });

  // AD-003: o scroll roda ~60x/s e vai para o store por `getState()`. Se algum
  // componente assinar o slice `scroll`, o React re-renderiza a cada frame.
  // Os dois contadores cobrem as duas pontas do caminho: `ScrollBridge`, onde o
  // scroll entra na árvore, e `CampoDeBlocos`, que o AD-003 obriga a receber o
  // scroll por handle imperativo, nunca por estado de React.
  test("rolar a página não dispara re-render de React", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__lenis));
    await page.waitForTimeout(800);

    await page.waitForFunction(() => (window.__campoRenders ?? 0) > 0);

    const renders = () =>
      page.evaluate(() => ({
        bridge: window.__scrollBridgeRenders ?? 0,
        campo: window.__campoRenders ?? 0,
      }));
    const antes = await renders();
    expect(antes.bridge).toBeGreaterThan(0);
    expect(antes.campo).toBeGreaterThan(0);

    await page.evaluate(() => window.__lenis?.scrollTo(700));

    // Controle positivo: sem provar que o scroll andou, "o contador não subiu"
    // passa numa página que nunca rolou.
    await page.waitForFunction(() => window.scrollY > 300);
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
    expect(await page.evaluate(() => window.__lenis!.progress)).toBeGreaterThan(
      0,
    );

    expect(await renders()).toEqual(antes);
  });
});
