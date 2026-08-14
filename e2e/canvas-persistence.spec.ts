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
  "/projects": 1,
  "/about": 1,
  // A case page não tem hero nem painel.
  "/projects/barbalog": 0,
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
    // Termina em /projects: é de lá que sai o link para a case page.
    for (const [link, url] of [
      ["Sobre", "/about"],
      ["Início", "/"],
      ["Projetos", "/projects"],
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
    await page.waitForURL("/projects/barbalog");
    await expect(page.locator("canvas")).toHaveCount(0);

    // E voltar remonta: o campo não fica preto depois do ciclo.
    await page.goBack();
    await page.waitForURL("/projects");
    await expect(page.locator("canvas")).toHaveCount(1);
    /**
     * **O topo é premissa, não asserção.**
     *
     * Voltar restaura a posição de scroll, e o campo de `/projects` mora no
     * hero: numa restauração para o meio da página ele nasce **fora da tela**,
     * onde não desenhar é exatamente o comportamento que o PORT-03 exige. A
     * restauração é uma corrida com a montagem do campo (medido: ora y=0, ora
     * y=930 no mesmo build), então o teste reprovava por um estado correto.
     *
     * Pôr o campo na tela antes de cobrar quadros mantém o que este teste quer
     * provar — que depois do ciclo de rotas o campo volta a **desenhar**, e não
     * fica preto — sem depender de quem ganha essa corrida.
     */
    await expect(async () => {
      await page.evaluate(() =>
        window.__lenis?.scrollTo(0, { immediate: true }),
      );
      const antes = await page.evaluate(
        () => window.__campoRenderer?.info.render.frame ?? -1,
      );
      await page.waitForTimeout(300);
      const depois = await page.evaluate(
        () => window.__campoRenderer?.info.render.frame ?? -1,
      );
      expect(depois, "o campo não desenhou depois do ciclo de rotas").toBeGreaterThan(
        antes,
      );
    }).toPass({ timeout: 15_000 });
  });

  /**
   * **Uma volta não é teste de vazamento.** Contexto WebGL não descartado só
   * aparece depois de algumas: o browser recusa o contexto novo, e o campo
   * nasce preto. Oito idas e voltas entre a home (3 campos) e `/projects` (1)
   * são 24 criações; se a disposição estivesse quebrada, o teto do Chrome (16
   * contextos vivos) cairia bem antes do fim.
   *
   * A asserção final não é só "o canvas existe": é **o loop andando**. Canvas
   * com contexto perdido continua no DOM.
   */
  test("ir e voltar oito vezes não esgota o contexto WebGL", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navegação de rotas" });

    for (let volta = 0; volta < 8; volta++) {
      await nav.getByRole("link", { name: "Projetos" }).click();
      await page.waitForURL("/projects");
      await expect(page.locator("canvas")).toHaveCount(1);
      await nav.getByRole("link", { name: "Início" }).click();
      await page.waitForURL("/");
      await expect(page.locator("canvas")).toHaveCount(3);
    }

    /**
     * A prova fica em `/projects`, que tem **um** campo só: o seam
     * `__campoRenderer` aponta para o último canvas criado, e na home o último
     * pode ser um painel fora da tela — cujo contador fica em 0 de propósito,
     * porque campo fora da tela não desenha.
     */
    await nav.getByRole("link", { name: "Projetos" }).click();
    await page.waitForURL("/projects");
    const frames = () =>
      page.evaluate(() => window.__campoRenderer?.info.render.frame ?? -1);
    await page.waitForFunction(
      () => (window.__campoRenderer?.info.render.frame ?? 0) > 0,
    );
    const antes = await frames();
    await page.waitForTimeout(600);
    expect(await frames()).toBeGreaterThan(antes);

    // E é canvas vivo, não nó morto no DOM com o contexto perdido.
    expect(
      await page.evaluate(() => {
        const canvas = document.querySelector(
          'section[data-name="hero"] canvas',
        ) as HTMLCanvasElement | null;
        return Boolean(canvas && !canvas.getContext("webgl2")?.isContextLost());
      }),
    ).toBe(true);
  });

  test("o conteúdo textual continua chegando por SSR", async ({ request }) => {
    expect(await (await request.get("/")).text()).toContain(
      "Gabriel Almeida Dias",
    );
    // Nome de projeto e não markup: a asserção precisa sobreviver ao estilo.
    expect(await (await request.get("/projects")).text()).toContain("Barbalog");
  });
});
