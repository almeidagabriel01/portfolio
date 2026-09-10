import { expect, test, type Locator, type Page } from "@playwright/test";

const SECOES = ["entregas", "trajetoria"] as const;

async function preparar(page: Page, secao: string) {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.__lenis));
  const trilho = page.locator(`section[aria-labelledby="${secao}"] ul[aria-label]`);
  await trilho.evaluate((el) => {
    const y = el.getBoundingClientRect().top + scrollY - 140;
    window.__lenis?.scrollTo(y, { immediate: true });
    window.scrollTo(0, y);
  });
  await expect.poll(async () => (await trilho.boundingBox())!.y).toBeGreaterThan(100);
  const passo = await trilho.evaluate((el) =>
    el.children[0].getBoundingClientRect().width +
    (Number.parseFloat(getComputedStyle(el).columnGap) || 0),
  );
  return { trilho, passo };
}

async function esperarIndice(trilho: Locator, passo: number, indice: number) {
  await expect.poll(() => trilho.evaluate((el) => el.scrollLeft))
    .toBeCloseTo(passo * indice, 0);
  await expect(trilho.locator("li[aria-current=true]")).toHaveCount(1);
  await expect(trilho.locator("li").nth(indice)).toHaveAttribute("aria-current", "true");
}

async function arrastar(page: Page, alvo: Locator, distancia: number) {
  const caixa = (await alvo.boundingBox())!;
  const x = Math.min(caixa.x + caixa.width * 0.8, page.viewportSize()!.width - 20);
  const y = Math.max(160, Math.min(caixa.y + caixa.height / 2, 650));
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - distancia, y, { steps: 12 });
  await page.mouse.up();
}

test.describe("gestos compartilhados dos carrosséis", () => {
  test.use({ viewport: { width: 690, height: 900 } });

  for (const secao of SECOES) {
    test(`${secao}: arrasto sobre mídia e texto move e encaixa sem selecionar`, async ({ page }) => {
      const { trilho, passo } = await preparar(page, secao);
      const itens = trilho.locator(":scope > li");
      await arrastar(page, itens.first(), passo * 0.65);
      await esperarIndice(trilho, passo, 1);
      await arrastar(page, itens.nth(1).locator("p").last(), passo * 0.65);
      await esperarIndice(trilho, passo, 2);
      expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
      await expect(page).toHaveURL(/\/$/);

      if (secao === "entregas") {
        // O clique normal depois de arrastar continua sendo navegação.
        await itens.nth(2).locator("a").click();
        await expect(page).toHaveURL(/\/projects\/lyftconnect$/);
      }
    });

    test(`${secao}: setas, Home, End, pontos e rolagem horizontal navegam`, async ({ page }) => {
      const { trilho, passo } = await preparar(page, secao);
      const total = await trilho.locator(":scope > li").count();
      await trilho.focus();
      await page.keyboard.press("ArrowRight");
      await esperarIndice(trilho, passo, 1);
      await page.keyboard.press("End");
      await esperarIndice(trilho, passo, total - 1);
      await page.keyboard.press("Home");
      await esperarIndice(trilho, passo, 0);
      await page.keyboard.press("ArrowLeft");
      await esperarIndice(trilho, passo, 0);

      const pontos = page.locator(`section[aria-labelledby="${secao}"] [role=group] button`);
      await pontos.nth(3).click();
      await esperarIndice(trilho, passo, 3);
      const caixa = (await trilho.boundingBox())!;
      await page.mouse.move(345, Math.max(160, caixa.y + 150));
      await page.mouse.wheel(-passo * 0.7, 0);
      await esperarIndice(trilho, passo, 2);

      if (secao === "entregas") {
        // Setas num card focado movem também o foco, para Enter abrir o
        // projeto que acabou de chegar ao centro.
        await trilho.locator("li").nth(2).locator("a").focus();
        await page.keyboard.press("ArrowRight");
        await esperarIndice(trilho, passo, 3);
        await expect(trilho.locator("li").nth(3).locator("a")).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/projects\/proops$/);
      }
    });
  }
});

test.describe("gesto nativo de toque", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  for (const secao of SECOES) {
    test(`${secao}: deslizar por toque move e encaixa sem navegar`, async ({ page }) => {
      const { trilho, passo } = await preparar(page, secao);
      const cdp = await page.context().newCDPSession(page);
      const y = Math.round((await trilho.boundingBox())!.y + 170);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart", touchPoints: [{ x: 300, y }],
      });
      for (let i = 1; i <= 8; i++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove", touchPoints: [{ x: 300 - i * 25, y }],
        });
        await page.waitForTimeout(25);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect.poll(() => trilho.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
      await expect.poll(async () => {
        const x = await trilho.evaluate((el) => el.scrollLeft);
        return Math.abs(x - Math.round(x / passo) * passo);
      }).toBeLessThan(1);
      const indice = Math.round(await trilho.evaluate((el) => el.scrollLeft) / passo);
      await esperarIndice(trilho, passo, indice);
      await expect(page).toHaveURL(/\/$/);
      await cdp.detach();
    });
  }
});
