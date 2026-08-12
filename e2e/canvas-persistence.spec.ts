import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    /** Marca sobrevivente: um reload apagaria, uma navegação client-side não. */
    __navSentinel?: boolean;
  }
}

/**
 * **Tudo aqui é garantia do largo.** Abaixo do `md` não há canvas fixo: o hero
 * e o painel da `Empresas` têm canvas próprio, que remonta a cada rota de
 * propósito (o recorte do `<View>` descola no scroll de toque). O que vale lá
 * é "não acumula canvas", em `canvas-robustness`.
 */
test.describe("Canvas persistente entre rotas (AD-002)", () => {
  // PORT-01: o coração da arquitetura.
  test("o nó <canvas> é o mesmo objeto DOM antes e depois de navegar", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__backgroundRenderer));

    await page.evaluate(() => {
      window.__navSentinel = true;
    });
    const canvasBefore = await page.evaluateHandle(
      () => window.__backgroundRenderer!.domElement,
    );

    // `/` ainda monta o Header legado, que também linka "Projetos", daí o
    // escopo pela nav de rotas.
    await page
      .getByRole("navigation", { name: "Navegação de rotas" })
      .getByRole("link", { name: "Projetos" })
      .click();
    await page.waitForURL("/projetos");

    // Sem esta asserção, um reload completo faria o teste de identidade
    // falhar por um motivo diferente do que ele investiga.
    expect(await page.evaluate(() => window.__navSentinel === true)).toBe(true);

    expect(
      await page.evaluate(
        (element) =>
          element.isConnected &&
          element === window.__backgroundRenderer?.domElement,
        canvasBefore,
      ),
    ).toBe(true);
    await expect(page.locator("canvas")).toHaveCount(1);
  });

  // "Canvas não está dentro do template.tsx": se estivesse, ele remontaria na
  // navegação e o renderer começaria a contar frames do zero.
  //
  // O piso é 100 frames (~1,7s de loop) e não 5: com 5, um renderer remontado
  // ultrapassava o valor anterior dentro da própria latência do `evaluate` e a
  // comparação nunca podia falhar: o teste documentava a garantia sem
  // defendê-la.
  test("o contador de frames não reinicia ao trocar de rota", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(
      () => (window.__backgroundRenderer?.info.render.frame ?? 0) > 100,
    );
    const before = await page.evaluate(
      () => window.__backgroundRenderer!.info.render.frame,
    );

    // `/` ainda monta o Header legado, que também linka "Projetos", daí o
    // escopo pela nav de rotas.
    await page
      .getByRole("navigation", { name: "Navegação de rotas" })
      .getByRole("link", { name: "Projetos" })
      .click();
    await page.waitForURL("/projetos");

    // Folga para um remount acontecer, se fosse acontecer: 500ms bastam para o
    // `onCreated` de um `<Canvas>` novo reapontar o seam para um renderer
    // zerado, e são curtos demais para esse renderer alcançar os 100+ frames
    // do anterior.
    await page.waitForTimeout(500);

    expect(
      await page.evaluate(
        () => window.__backgroundRenderer!.info.render.frame,
      ),
    ).toBeGreaterThan(before);
  });

  test("o conteúdo textual continua chegando por SSR", async ({ request }) => {
    expect(await (await request.get("/")).text()).toContain(
      "Gabriel Almeida Dias",
    );
    // Nome de projeto e não markup: a asserção precisa sobreviver ao estilo.
    expect(await (await request.get("/projetos")).text()).toContain("Barbalog");
  });
});
