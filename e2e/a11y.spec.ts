import { expect, test } from "@playwright/test";

/**
 * Auditoria cruzada de PORT-03, PORT-06 e PORT-12. As três garantias já têm
 * teste isolado; o valor aqui é observá-las **na mesma sessão**: é assim que
 * o usuário com `prefers-reduced-motion` encontra o site, e uma regressão que
 * ligue um dos três sistemas depois que outro desligou só aparece junta.
 *
 * `page.emulateMedia` e não `test.use({ reducedMotion })`: no Playwright 1.62
 * a opção de contexto não chega ao `matchMedia` da página.
 */
test.describe("Auditoria de reduced-motion", () => {
  test("Lenis sem suavização, loop de render parado e transição instantânea, tudo junto", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForFunction(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    await page.waitForFunction(() => Boolean(window.__campoRenderer));

    // 1) Lenis: a instância existe, a suavização não.
    //
    // AD-004: antes o provider inteiro sumia sob reduced-motion. Isso trocava
    // o tipo do elemento na mesma posição da árvore durante a hidratação e
    // remontava tudo abaixo (ver scroll.spec.ts). Agora o Lenis monta sempre e
    // é o comportamento que muda: `lerp: 1` aplica o delta inteiro no mesmo
    // frame e `smoothWheel: false` devolve o wheel ao browser.
    await page.waitForFunction(() => Boolean(window.__lenis));
    await page.waitForTimeout(500);
    expect(
      await page.evaluate(() => ({
        lerp: window.__lenis?.options.lerp,
        smoothWheel: window.__lenis?.options.smoothWheel,
      })),
    ).toEqual({ lerp: 1, smoothWheel: false });

    // 2) Loop de render: nenhum frame novo.
    const frames = () =>
      page.evaluate(() => window.__campoRenderer!.info.render.frame);
    const first = await frames();
    await page.waitForTimeout(600);
    expect(await frames()).toBe(first);

    // 3) Transição de rota: corte seco, sem janela de animação.
    await page
      .getByRole("navigation", { name: "Navegação de rotas" })
      .getByRole("link", { name: "Projetos" })
      .click();
    await page.waitForURL("/projetos");
    await page.waitForFunction(
      () => window.__routeState?.().pathname.current === "/projetos",
    );

    expect(
      await page.evaluate(() => window.__routeState?.().transition.active),
    ).toBe(false);
    // Sem `view-transition-name` no root o browser não tira snapshot nenhum, e
    // sem snapshot não existe pseudo-elemento para animar.
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).viewTransitionName,
      ),
    ).toBe("none");
    expect(
      await page.evaluate(() =>
        document
          .getAnimations()
          .some((a) => a.effect instanceof KeyframeEffect && a.effect.pseudoElement),
      ),
    ).toBe(false);

    // E o canvas volta a ficar parado depois da navegação.
    //
    // A troca de rota provoca **um** redraw: com o Lenis montado também sob
    // reduced-motion (AD-004), o `scrollTo(0)` do `ScrollBridge` leva o R3F a
    // invalidar uma vez. Medido: o contador vai de 1 para 2 dentro dos
    // primeiros 50ms da navegação e fica em 2 por pelo menos 950ms.
    //
    // Um redraw único não é animação: o que este teste persegue é loop
    // rodando, e um loop somaria ~36 frames na janela de 600ms abaixo. Daí a
    // linha de base ser tomada **depois** do assentamento, e a igualdade
    // continuar estrita a partir dali.
    await page.waitForTimeout(300);
    const afterNav = await frames();
    await page.waitForTimeout(600);
    expect(await frames()).toBe(afterNav);
  });

  /**
   * O teste acima mede um instante. O risco que sobra depois do AD-004 é
   * temporal: `applyMotionPreference` roda num efeito, então existe uma janela
   * entre a construção do Lenis (que usa `LENIS_OPTIONS`, com `lerp: 0.2`) e a
   * aplicação da preferência.
   *
   * Essa janela não é observável pelo usuário: a suavização só se manifesta
   * durante um gesto de scroll, e o efeito de hidratação roda muito antes de a
   * página aceitar input. Mas "não é observável" é exatamente o tipo de
   * afirmação que apodrece: basta alguém mover a chamada para um `setTimeout`,
   * um `requestIdleCallback` ou atrás de um `await` para a janela virar real.
   *
   * Daí a amostragem repetida em vez de uma leitura única: se a suavização
   * aparecer em **qualquer** momento da janela de assentamento, a lista inteira
   * aparece no diff do erro. Mesmo padrão do `expectScrollAssentadoNoTopo` em
   * scroll.spec.ts, e pelo mesmo motivo: `expect.poll` pararia na primeira
   * amostra boa e nunca reconferiria.
   */
  test("a suavização nunca aparece, em nenhuma amostra da janela de assentamento", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__lenis));

    const amostras = await page.evaluate(async () => {
      const lidas: Array<number | undefined> = [];
      for (let i = 0; i < 10; i += 1) {
        lidas.push(window.__lenis?.options.lerp);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return lidas;
    });

    expect(amostras).toEqual(Array(10).fill(1));
  });

  // Controle positivo dos dois testes acima: sem ele, um seam morto (renomeado,
  // removido do bundle) faria as asserções passarem sem provar nada. Com
  // movimento permitido o mesmo caminho tem que produzir o valor oposto.
  test("com movimento permitido o mesmo caminho devolve a suavização do spec", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__lenis));

    expect(
      await page.evaluate(() => window.__scrollBridgeRenders ?? 0),
    ).toBeGreaterThan(0);
    await expect
      .poll(() => page.evaluate(() => window.__lenis?.options.lerp))
      .toBe(0.2);
  });
});

/**
 * O `lang` do <html> é o que faz o leitor de tela escolher a fonética. Ele
 * estava fixo em `en` enquanto o conteúdo default é PT: todo visitante no
 * idioma padrão ouvia português lido como inglês.
 */
test.describe("Idioma do documento", () => {
  test("o HTML do servidor declara o idioma do conteúdo que ele renderiza", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();

    expect(html).toContain('lang="pt"');
    // O conteúdo que veio junto: sem isso, `lang="pt"` poderia estar certo por
    // acidente numa página renderizada em inglês.
    expect(html).toContain("Engenharia de Software");
  });

  test("trocar de idioma troca o lang do documento", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt");

    await page.getByRole("button", { name: "Trocar idioma" }).click();
    await expect(
      page.getByRole("button", { name: "Switch language" }),
    ).toHaveText("EN");

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("com idioma salvo o lang acompanha desde a hidratação, sem erro de console", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.addInitScript(() =>
      localStorage.setItem("portfolio-lang", "en"),
    );
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: "Switch language" }),
    ).toHaveText("EN");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    // O store nasce em `pt` de propósito para casar com o HTML do servidor;
    // aplicar o valor salvo não pode reintroduzir mismatch de hidratação.
    expect(errors).toEqual([]);
  });

  // AD-004: guarda do default de `reducedMotion` no caminho da maioria.
  //
  // O teste acima cobre o visitante com idioma salvo. Este cobre o padrão: sem
  // nada no localStorage e sem reduced-motion. É onde a única mutação plausível
  // do default quebra: semear `reducedMotion` do `matchMedia` na criação do
  // store faz o servidor renderizar `true` (não existe `matchMedia` no Node) e o
  // cliente hidratar `false`, porque a maioria não pede movimento reduzido.
  //
  // Esse defeito não é detectável no unit: o jsdom não implementa `matchMedia`,
  // então a expressão cai no fallback e se comporta igual ao default seguro.
  // E não é detectável por `pageerror`: mismatch de hidratação do React não
  // lança, é reportado por `console.error`. Daí a escuta de console aqui.
  test("o carregamento padrão hidrata sem erro de console", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    // Três campos na home: hero, painel da Entregas, painel da Empresas.
    await expect(page.locator("canvas")).toHaveCount(3);

    expect(errors).toEqual([]);
  });
});
