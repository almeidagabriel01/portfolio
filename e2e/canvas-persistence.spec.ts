import { expect, test } from "@playwright/test";

/**
 * **O AD-002 (canvas único e fixo) foi revogado; ver `CanvasDoCampo`.** Cada
 * campo tem o seu `<Canvas>` dentro do elemento que ele preenche, porque um
 * recorte pintado na main thread não fica colado em conteúdo que o compositor
 * move no scroll de toque.
 *
 * O que era garantia aqui — "o mesmo nó DOM sobrevive à navegação" — deixou de
 * existir de propósito. O que a substitui, e é o que este arquivo defende:
 * **cada rota monta exatamente os campos que tem, e navegar não acumula nem
 * vaza contexto**. Contexto vazado não dá erro: dá campo preto depois de
 * algumas navegações, no aparelho com o teto mais baixo de contextos vivos.
 */
const CAMPOS_POR_ROTA = {
  // hero + painel da Entregas + painel da Empresas
  "/": 3,
  "/projetos": 1,
  "/sobre": 1,
  // A case page não tem hero nem painel.
  "/projetos/barbalog": 0,
} as const;

test.describe("Um canvas por campo (AD-047)", () => {
  for (const [rota, quantos] of Object.entries(CAMPOS_POR_ROTA)) {
    test(`${rota} monta ${quantos} canvas`, async ({ page }) => {
      await page.goto(rota);
      if (quantos > 0) {
        await page.waitForFunction(() => Boolean(window.__campoRenderer));
      }
      await expect(page.locator("canvas")).toHaveCount(quantos);
      // Todo canvas mora dentro de uma seção: nenhum sobrou preso ao `<body>`.
      await expect(page.locator("section canvas")).toHaveCount(quantos);
    });
  }

  test("percorrer as quatro rotas não acumula canvas", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__campoRenderer));

    const nav = page.getByRole("navigation", { name: "Navegação de rotas" });
    // Termina em /projetos: é de lá que sai o link para a case page.
    for (const [link, url] of [
      ["Sobre", "/sobre"],
      ["Início", "/"],
      ["Projetos", "/projetos"],
    ] as const) {
      await nav.getByRole("link", { name: link }).click();
      await page.waitForURL(url);
      await expect(page.locator("canvas")).toHaveCount(
        CAMPOS_POR_ROTA[url as keyof typeof CAMPOS_POR_ROTA],
      );
    }

    // O rótulo "Ver o case" saiu da rota na fase C: quem leva à case page
    // agora é o título do card de destaque.
    await page
      .getByRole("heading", { level: 3, name: "Barbalog" })
      .getByRole("link", { name: "Barbalog" })
      .click();
    await page.waitForURL("/projetos/barbalog");
    await expect(page.locator("canvas")).toHaveCount(0);

    // E voltar remonta: o campo não fica preto depois do ciclo.
    await page.goBack();
    await page.waitForURL("/projetos");
    await expect(page.locator("canvas")).toHaveCount(1);
    await page.waitForFunction(
      () => (window.__campoRenderer?.info.render.frame ?? 0) > 5,
    );
  });

  test("o conteúdo textual continua chegando por SSR", async ({ request }) => {
    expect(await (await request.get("/")).text()).toContain(
      "Gabriel Almeida Dias",
    );
    // Nome de projeto e não markup: a asserção precisa sobreviver ao estilo.
    expect(await (await request.get("/projetos")).text()).toContain("Barbalog");
  });
});
