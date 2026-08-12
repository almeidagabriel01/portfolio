import { expect, test, type Page } from "@playwright/test";

const ROUTE = "/projetos";

/** Amostras da janela de assentamento: 10 leituras × 200ms ≈ 1,8s. */
const AMOSTRAS = 10;

/**
 * PORT-07 pede o estado **assentado**, não um instante.
 *
 * `expect.poll` (e qualquer `waitForFunction(scrollY === 0)` seguido de uma
 * leitura única) encerra na primeira amostra boa e nunca reconfere. A
 * restauração de scroll do Next zera a posição logo na navegação, a asserção
 * observa esse 0 e passa; um defeito que reposicione o scroll **depois** fica
 * invisível. Foi assim que um mutante que assenta em 400 atravessou o gate
 * inteiro.
 *
 * Medido nesta suíte: a árvore limpa está em 0 já em t=0 e não sai mais; um
 * defeito que reposiciona depois da restauração assenta em ~800ms. Exigir 0 em
 * **todas** as amostras da janela é o inverso literal do poll: uma única
 * amostra ruim reprova, e a lista inteira aparece no diff do erro.
 */
async function expectScrollAssentadoNoTopo(page: Page) {
  await page.waitForFunction(() => window.scrollY === 0);

  const amostras = await page.evaluate(async (total) => {
    const lidas: number[] = [];
    for (let i = 0; i < total; i += 1) {
      lidas.push(window.scrollY);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return lidas;
  }, AMOSTRAS);

  expect(amostras).toEqual(Array(AMOSTRAS).fill(0));
}

test.describe("SmoothScroll: Lenis", () => {
  // PORT-05. Ler a instância viva, não a constante exportada: só isso prova
  // que a config chegou ao Lenis.
  test("o Lenis é construído com lerp 0.2, smoothWheel e sem syncTouch", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.waitForFunction(() => Boolean(window.__lenis));

    expect(
      await page.evaluate(() => ({
        lerp: window.__lenis?.options.lerp,
        smoothWheel: window.__lenis?.options.smoothWheel,
        syncTouch: window.__lenis?.options.syncTouch,
      })),
    ).toEqual({ lerp: 0.2, smoothWheel: true, syncTouch: false });
  });

  // Controle positivo do PORT-06: com movimento permitido o Lenis marca o
  // <html>. Sem esta asserção, "não tem a classe" passaria por acidente.
  test("com movimento permitido o Lenis assume o documento", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.waitForFunction(() => Boolean(window.__lenis));

    await expect(page.locator("html")).toHaveClass(/\blenis\b/);
  });

  // AD-004: a razão de o `<ReactLenis>` montar sempre.
  //
  // Enquanto `prefers-reduced-motion` decidia **se** o provider existia, o
  // primeiro render do cliente pegava um fragmento e o segundo pegava o
  // `<ReactLenis>`. Tipo de elemento diferente na mesma posição da árvore faz o
  // React desmontar e remontar tudo abaixo (`Header`, `.shell`, o `template` e
  // a página inteira) na hidratação de **todo** visitante sem reduced-motion.
  // Toda animação de entrada montada aí embaixo tocava, desmontava e tocava de
  // novo.
  //
  // O sensor conta **montagens** do `Header`, não renders: re-render não move o
  // número, remontagem move. Roda nos dois lados da preferência porque o
  // defeito estava justamente no caminho da maioria.
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`a hidratação não remonta a árvore (${reducedMotion})`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion });
      await page.goto(ROUTE);
      await page.waitForFunction(() => Boolean(window.__lenis));
      // Janela de sobra para uma segunda montagem aparecer, se fosse aparecer.
      await page.waitForTimeout(500);

      expect(await page.evaluate(() => window.__headerMounts)).toBe(1);
    });
  }

  // PORT-06 · AD-004: a garantia mudou de forma, não de efeito.
  //
  // Antes: sob reduced-motion o `<ReactLenis>` era trocado por um fragmento, e
  // este teste cobrava a ausência da instância. Isso trocava o tipo do elemento
  // na mesma posição da árvore durante a hidratação e remontava tudo abaixo
  // (ver "a hidratação não remonta a árvore", abaixo).
  //
  // Agora a instância existe sempre e é a **suavização** que some: `lerp: 1`
  // aplica o delta inteiro no mesmo frame e `smoothWheel: false` devolve o
  // wheel ao browser. O observável para o usuário (scroll nativo) é o mesmo,
  // e está coberto pelo teste seguinte.
  test("com reduced-motion o Lenis monta sem suavização", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(ROUTE);
    await page.waitForFunction(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    await page.waitForFunction(() => Boolean(window.__lenis));

    await expect
      .poll(() =>
        page.evaluate(() => ({
          lerp: window.__lenis?.options.lerp,
          smoothWheel: window.__lenis?.options.smoothWheel,
        })),
      )
      .toEqual({ lerp: 1, smoothWheel: false });
  });

  // PORT-06. A outra metade: desligar o Lenis não pode deixar a página sem
  // scroll nenhum.
  test("com reduced-motion o scroll nativo continua funcionando", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(ROUTE);
    await page.waitForTimeout(500);

    await page.evaluate(() => window.scrollTo(0, 400));
    expect(await page.evaluate(() => window.scrollY)).toBe(400);
  });

  // "scroll-behavior: smooth removido do globals.css": o efeito observável é
  // o computado do <html>, não o texto do arquivo.
  test("o documento não usa scroll-behavior smooth", async ({ page }) => {
    await page.goto(ROUTE);

    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    ).toBe("auto");
  });

  // PORT-07
  test("trocar de rota devolve o scroll ao topo", async ({ page }) => {
    await page.goto(ROUTE);
    await page.waitForFunction(() => Boolean(window.__lenis));

    await page.evaluate(() => window.__lenis?.scrollTo(600, { immediate: true }));
    await page.waitForFunction(() => window.scrollY > 300);

    await page.getByRole("link", { name: "Início" }).click();
    await page.waitForURL("/");

    await expectScrollAssentadoNoTopo(page);
  });

  // PORT-07: a AC é incondicional, e o caminho é o mesmo dos dois lados desde
  // que o Lenis passou a montar sempre. O que muda sob reduced-motion é só a
  // suavização; `lenis.scrollTo(0, { immediate: true })` continua sendo quem
  // devolve o topo.
  test("com reduced-motion trocar de rota devolve o scroll ao topo", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(ROUTE);
    await page.waitForFunction(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    await page.waitForFunction(() => Boolean(window.__lenis));

    await page.evaluate(() => window.scrollTo(0, 400));
    // Piso: sem rolar de verdade antes, a asserção do fim compararia 0 com 0 e
    // passaria com o scroll quebrado.
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);

    await page.getByRole("link", { name: "Início" }).click();
    await page.waitForURL("/");

    await expectScrollAssentadoNoTopo(page);
  });

  // PORT-08
  test("scroll dentro de um elemento aninhado não é sequestrado", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.waitForFunction(() => Boolean(window.__lenis));

    await page.evaluate(() => {
      const box = document.createElement("div");
      box.id = "nested";
      box.style.cssText =
        // z acima do conteúdo (`z-200`) e do canvas (`z-100`): com 99 o
      // hit-test do wheel caía no wrapper do hero e a caixa nunca rolava.
      "position:fixed;top:200px;left:20px;width:300px;height:200px;overflow-y:auto;z-index:999";
      const tall = document.createElement("div");
      tall.style.height = "2000px";
      box.appendChild(tall);
      document.body.appendChild(box);
    });

    const pageScrollBefore = await page.evaluate(() => window.scrollY);

    await page.mouse.move(170, 300);
    await page.mouse.wheel(0, 300);
    await page.waitForFunction(
      () => (document.getElementById("nested")?.scrollTop ?? 0) > 0,
    );

    expect(
      await page.evaluate(() => document.getElementById("nested")?.scrollTop),
    ).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(pageScrollBefore);
  });
});
