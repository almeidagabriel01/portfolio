import { expect, test } from "@playwright/test";
import { enUS, ptBR } from "../src/locales";

const MARCA = "Gabriel Dias";

/** A caixa que o wordmark ocupa no layout do header. Tem que ser invariante. */
const caixaDaMarca = (page: import("@playwright/test").Page) =>
  page.locator(`header a[aria-label="${MARCA}"] > span`).evaluate((node) => {
    const { width, height } = node.getBoundingClientRect();
    return { largura: Math.round(width), altura: Math.round(height) };
  });

/**
 * A extensão **dos glifos**, que é o que de fato se move. Medida como a união
 * dos retângulos de cada letra, relativa à caixa.
 */
const extensaoDasLetras = (page: import("@playwright/test").Page) =>
  page.locator(`header a[aria-label="${MARCA}"]`).evaluate((raiz) => {
    const letras = [...raiz.querySelectorAll("span.block")].filter(
      (n) => (n.textContent ?? "").length === 1,
    );
    const caixas = letras.map((n) => n.getBoundingClientRect());
    const x0 = Math.min(...caixas.map((c) => c.left));
    const x1 = Math.max(...caixas.map((c) => c.right));
    const y0 = Math.min(...caixas.map((c) => c.top));
    const y1 = Math.max(...caixas.map((c) => c.bottom));
    return {
      largura: Math.round(x1 - x0),
      altura: Math.round(y1 - y0),
      linhas: new Set(caixas.map((c) => Math.round(c.top))).size,
    };
  });

test.describe("Header: marca que colapsa", () => {
  /**
   * O gesto medido em navegador, path a path, durante o colapso:
   *
   * 1. a **caixa não muda de tamanho**: ela é `109×34` do começo ao fim, e
   *    os glifos se movem por dentro dela;
   * 2. as duas metades **convergem para o centro** (`+27.5` e `-27.5`) e ao
   *    mesmo tempo se separam na vertical.
   *
   * O item 1 é o que separa "fechar" de "encolher", e é a asserção que pega a
   * primeira implementação daqui: ela encolhia a caixa de 92px para 54px e
   * levava a segunda palavra sozinha para baixo. Estado final parecido,
   * movimento errado, e o layout do header pulando junto.
   *
   * Medido por geometria e não por classe: a animação é FLIP (`layout` do
   * motion), então não existe classe de "colapsado" para cobrar.
   */
  test("colapsa ao descer e reexpande ao subir", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__lenis));
    await page.waitForTimeout(400);

    const caixaAberta = await caixaDaMarca(page);
    const aberta = await extensaoDasLetras(page);
    expect(aberta.linhas, "no topo o wordmark é uma linha só").toBe(1);

    await page.evaluate(() => window.__lenis?.scrollTo(600));
    await page.waitForFunction(() => window.scrollY > 400);
    await expect
      .poll(async () => (await extensaoDasLetras(page)).linhas)
      .toBe(2);

    const fechada = await extensaoDasLetras(page);
    expect(fechada.largura, "os glifos convergem").toBeLessThan(
      aberta.largura * 0.8,
    );
    expect(fechada.altura, "e se separam na vertical").toBeGreaterThan(
      aberta.altura,
    );

    // O invariante: a caixa no layout não se mexeu um pixel.
    expect(await caixaDaMarca(page), "a caixa do wordmark mudou").toEqual(
      caixaAberta,
    );

    await page.evaluate(() => window.__lenis?.scrollTo(300));
    await page.waitForFunction(() => window.scrollY < 500);
    await expect
      .poll(async () => (await extensaoDasLetras(page)).linhas)
      .toBe(1);
  });

  /**
   * Cada letra tem o **seu** atraso, crescendo das pontas para o meio. Sem
   * isso a marca desliza em bloco, que foi a leitura errada da primeira versão.
   *
   * O sensor é uma amostra no meio do voo: as letras não podem estar todas na
   * mesma fase. Se partirem juntas, os deslocamentos são idênticos e o
   * conjunto tem um valor só.
   */
  test("cada letra parte no seu tempo", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__lenis));
    await page.waitForTimeout(400);

    /**
     * Amostragem por `requestAnimationFrame` **dentro da página**, e não por
     * um `waitForTimeout` seguido de leitura.
     *
     * A primeira versão disto tirava uma foto única em `t+140ms` e comparava
     * deslocamentos. Falhava de forma intermitente por um motivo bobo: entre
     * disparar o scroll e a leitura chegar existe a ida e volta do protocolo,
     * então "140ms" na verdade era 200ms e uns, o que já atravessa o atraso da
     * letra mais externa (0.21s). Medir *quando cada letra chega* não depende
     * de acertar um instante.
     */
    const medir = () =>
      page.evaluate(async () => {
        const raiz = document.querySelector("header a[aria-label]")!;
        const letras = [...raiz.querySelectorAll("span.block")].filter(
          (n) => (n.textContent ?? "").length === 1,
        );
        const ler = () => letras.map((n) => n.getBoundingClientRect().left);

        // Cada tentativa começa com a marca aberta: rolar de volta ao topo a
        // reabre, e sem isso a segunda medição não teria movimento nenhum.
        window.__lenis?.scrollTo(0, { immediate: true });
        await new Promise((pronto) => setTimeout(pronto, 900));

        const inicio = ler();
        window.__lenis?.scrollTo(600, { immediate: true });

        /**
         * A amostra guarda **o instante**, não só a posição.
         *
         * A versão anterior devolvia índices de quadro e o teste cobrava uma
         * distância de 3 quadros entre a primeira e a última letra. Isso é
         * refém da taxa de quadros: o escalonamento tem 210ms de ponta a ponta,
         * o que dá ~13 quadros a 60fps e **2** a 10fps. Em milissegundos a
         * medida é a mesma em qualquer máquina.
         */
        const amostras: { t: number; x: number[] }[] = [];
        const t0 = performance.now();
        await new Promise<void>((pronto) => {
          const tique = () => {
            amostras.push({ t: performance.now() - t0, x: ler() });
            if (performance.now() - t0 < 900) requestAnimationFrame(tique);
            else pronto();
          };
          requestAnimationFrame(tique);
        });

        const fim = amostras.at(-1)!.x;
        // Para cada letra, o instante do primeiro quadro em que ela saiu de
        // perto da origem.
        const partidas = inicio.map((x0, i) => {
          const total = Math.abs(fim[i] - x0);
          if (total < 4) return -1; // letra que mal se move não conta
          const partiu = amostras.find(
            (quadro) => Math.abs(quadro.x[i] - x0) > total * 0.15,
          );
          return partiu ? Math.round(partiu.t) : -1;
        });

        /**
         * A qualidade da própria amostragem, e ela precisa de ser cobrada.
         *
         * Nenhuma leitura de posição recupera o escalonamento se a página
         * engasgar: numa pausa de meio segundo — que acontece na suíte cheia,
         * com os campos WebGL a desenhar por software em cinco processos — a
         * animação inteira corre entre dois quadros e todas as letras aparecem
         * já chegadas. O intervalo medido dá zero com o escalonamento intacto.
         */
        const maiorVao = amostras.reduce(
          (maior, quadro, i) =>
            i === 0 ? quadro.t : Math.max(maior, quadro.t - amostras[i - 1].t),
          0,
        );
        return { partidas, maiorVao };
      });

    /**
     * A janela de medição é que se repete, não a asserção: se o quadro mais
     * largo passou de 150ms, esta tentativa não tinha resolução para ver um
     * escalonamento de 210ms, e a resposta certa é medir outra vez — não
     * afrouxar o piso.
     */
    await expect(async () => {
      const { partidas, maiorVao } = await medir();
      expect(maiorVao, "a página engasgou: sem resolução para medir").toBeLessThan(
        150,
      );

      const validas = partidas.filter((f) => f >= 0);
      expect(validas.length, "nenhuma letra se moveu").toBeGreaterThan(4);

      /**
       * O escalonamento é isto: as letras não partem juntas. Em bloco, todas
       * teriam o mesmo instante de partida e o intervalo seria zero.
       *
       * O piso é 60ms contra os 210ms que separam a primeira letra da última:
       * folga para a granularidade do quadro, sem chegar perto de aceitar
       * partida em bloco.
       */
      const intervalo = Math.max(...validas) - Math.min(...validas);
      expect(
        intervalo,
        "as letras partiram todas juntas: o escalonamento sumiu",
      ).toBeGreaterThanOrEqual(60);
    }).toPass({ timeout: 25_000 });
  });

  // Controle da premissa acima: sem rolar, a marca não pode se mexer sozinha.
  test("parada no topo, a marca não se mexe", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(600);
    const antes = await extensaoDasLetras(page);
    await page.waitForTimeout(1200);
    expect(await extensaoDasLetras(page)).toEqual(antes);
  });
});

test.describe("Header: véu de scroll", () => {
  const opacidadeDoScrim = (page: import("@playwright/test").Page) =>
    page
      .locator("header > div[style]")
      .first()
      .evaluate((node) => Number(getComputedStyle(node).opacity));

  /**
   * `opacity: 0 → 1` nos primeiros 100px de scroll, o valor medido em
   * navegador.
   */
  test("aparece nos primeiros 100px e fica", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__lenis));
    await page.waitForTimeout(400);

    expect(await opacidadeDoScrim(page)).toBe(0);

    for (const [scrollY, esperado] of [
      [50, 0.5],
      [100, 1],
      [400, 1],
    ] as const) {
      await page.evaluate(
        (alvo) => window.__lenis?.scrollTo(alvo, { immediate: true }),
        scrollY,
      );
      await page.waitForTimeout(200);
      expect(await opacidadeDoScrim(page), `scrollY ${scrollY}`).toBeCloseTo(
        esperado,
        1,
      );
    }
  });
});

test.describe("Header: nav", () => {
  test("a rota ativa sai no âmbar do acento e as outras não", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: ptBR.header.nav });
    await expect(nav.getByRole("link", { name: ptBR.header.home })).toHaveCSS(
      "color",
      "rgb(255, 90, 31)",
    );
    await expect(
      nav.getByRole("link", { name: ptBR.header.projects }),
    ).not.toHaveCSS("color", "rgb(255, 90, 31)");
  });

  /**
   * A marca e o link "Início" apontam para o mesmo lugar. Se os dois tiverem o
   * mesmo nome acessível, leitor de tela lê duas entradas idênticas e o
   * `getByRole` do Playwright quebra por ambiguidade: foi exatamente assim que
   * isto apareceu.
   */
  test("marca e link de início não compartilham nome acessível", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("link", { name: ptBR.header.home, exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: MARCA, exact: true }),
    ).toHaveCount(1);
  });
});

test.describe("Header: menu mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("abre, lista as rotas e fecha ao navegar", async ({ page }) => {
    await page.goto("/");

    const abrir = page.getByRole("button", { name: ptBR.header.menu });
    await expect(abrir).toBeVisible();
    await expect(abrir).toHaveAttribute("aria-expanded", "false");

    await abrir.click();
    const painel = page.locator("#menu-mobile");
    await expect(painel).toBeVisible();
    await expect(
      page.getByRole("button", { name: ptBR.header.close }),
    ).toHaveAttribute("aria-expanded", "true");

    for (const rotulo of [
      ptBR.header.home,
      ptBR.header.projects,
      ptBR.header.about,
    ]) {
      await expect(painel.getByRole("link", { name: rotulo })).toBeVisible();
    }

    await painel.getByRole("link", { name: ptBR.header.projects }).click();
    await page.waitForURL("**/projetos");
    // Fechar tem que acontecer junto com a troca de rota, não um frame depois.
    await expect(painel).toHaveCount(0);
  });

  test("o menu segue o idioma", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: ptBR.header.language }).click();
    await expect(
      page.getByRole("button", { name: enUS.header.menu }),
    ).toBeVisible();
  });
});
