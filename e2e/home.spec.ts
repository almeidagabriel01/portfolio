import { expect, test, type Page } from "@playwright/test";
import { relativeLuminance, relatorioDeContraste } from "./contrast";
import { expectTranslationsResolved } from "./i18n-keys";
import {
  expectNoPhone,
  expectSectionsLabelled,
  NAO_TELEFONES,
  pageSectionIds,
  PHONE_PATTERN,
  TELEFONES,
} from "./sections";
import { enUS, ptBR } from "../src/locales";

/** O que o `PalavrasQueEntram` renderiza: a frase sem os marcadores de acento. */
const semMarcacao = (frase: string) => frase.replaceAll("*", "");

/**
 * `emulateMedia` e não `test.use({ reducedMotion })`: no Playwright 1.62 a
 * opção de contexto não chega ao `matchMedia` da página, a mesma pegadinha
 * documentada em `a11y.spec.ts`.
 */
const congelarRotacao = (page: Page) =>
  page.emulateMedia({ reducedMotion: "reduce" });

/**
 * A frase do hero **gira a cada 5s**, o que tornaria qualquer asserção de texto
 * uma corrida contra o relógio.
 *
 * `reducedMotion: "reduce"` congela a rotação no índice 0, que é comportamento de
 * produção, não gancho de teste: trocar texto de supetão a cada 5s é pior para
 * quem pediu menos movimento do que texto parado. Aqui isso dá de graça um
 * estado determinístico.
 */
test.describe("Rota /: hero", () => {
  test("o hero renderiza em português sem chave crua", async ({ page }) => {
    await congelarRotacao(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      semMarcacao(ptBR.hero.frases[0]),
    );
    await expect(page.getByText(ptBR.hero.cargoCurto)).toBeVisible();
    await expect(
      page.getByRole("button", { name: ptBR.hero.rolar }),
    ).toBeVisible();

    // O marcador de acento é sintaxe de dicionário, não conteúdo.
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
      "*",
    );

    await expectTranslationsResolved(page, "/", "pt");
  });

  test("o hero renderiza em inglês sem chave crua", async ({ page }) => {
    await congelarRotacao(page);
    await page.goto("/");
    await page.getByRole("button", { name: ptBR.header.language }).click();
    await expect(
      page.getByRole("button", { name: enUS.header.language }),
    ).toHaveText("EN");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      semMarcacao(enUS.hero.frases[0]),
    );
    await expect(page.getByText(enUS.hero.cargoCurto)).toBeVisible();

    await expectTranslationsResolved(page, "/", "en");
  });

  /**
   * A palavra marcada sai no âmbar de acento. Sem esta asserção, remover o
   * `text-accent` do span deixaria a frase inteira monocromática sem quebrar
   * nada, e a bicromia é o traço.
   */
  test("a palavra marcada sai no âmbar de acento", async ({ page }) => {
    await congelarRotacao(page);
    await page.goto("/");

    const cores = await page
      .locator("h1 span")
      .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).color));

    // `accent-soft`, não o acento cheio: sobre o campo, âmbar sobre âmbar some.
    expect(cores).toContain("rgb(255, 217, 192)");
    expect(cores.some((cor) => cor !== "rgb(255, 217, 192)")).toBe(true);
  });

  // "Conteúdo chega por SSR (visível com JS desabilitado)".
  /**
   * **Nenhum `<source>` de vídeo antes de alguém chegar ao carrossel.**
   *
   * Medido no WebKit, que é o motor do Safari: um `<video>` com `<source>`
   * filho segura o evento `load` da página enquanto faz a seleção de recurso,
   * mesmo com `preload="none"`. Os cinco cartões do carrossel seguravam o
   * `load` da home por **3,2 segundos** — e o Safari só restaura a posição de
   * scroll no `load`, então recarregar no meio da hero devolvia o visitante ao
   * topo por três segundos antes de a página cair de volta no lugar.
   *
   * O sensor é estrutural porque o sintoma não é: no Chromium o `load` não
   * espera, e o teste passaria com o defeito de pé.
   */
  test.describe("mídia do carrossel", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    /**
     * **Uma apresentação só, para os sete cartões.**
     *
     * Antes, dois projetos não tinham gravação e o carrossel misturava
     * `<video>` com `<Image>` na mesma fileira. Não era só estética: o ramo do
     * `<Image>` tinha um defeito que o do vídeo não tinha (o `lazy` do
     * `next/image` decide pela viewport, e num trilho horizontal o cartão à
     * direita nunca entra nela, então a captura ficava por carregar e a caixa
     * aparecia cinza ao deslizar até lá).
     *
     * O sensor conta os elementos: sete cartões, sete `<video>`, nenhuma
     * `<img>`. Um projeto novo sem gravação reprova aqui antes de chegar na
     * tela de alguém.
     */
    test("todo cartão do carrossel é vídeo, e nenhum é imagem", async ({
      page,
    }) => {
      await page.goto("/");
      const secao = 'section[aria-labelledby="entregas"]';
      await page.locator(`${secao} video`).first().scrollIntoViewIfNeeded();

      expect(await page.locator(`${secao} ul li`).count()).toBe(7);
      expect(await page.locator(`${secao} video`).count()).toBe(7);
      expect(await page.locator(`${secao} img`).count()).toBe(0);

      // Vídeo sem poster abriria a caixa cinza no primeiro quadro. O atributo
      // entra quando o bloco chega perto (ver o teste do fundo, abaixo), então
      // o que se espera aqui é o render do observador, não um instante fixo.
      await expect
        .poll(() =>
          page.evaluate(
            (s) =>
              [
                ...document.querySelectorAll<HTMLVideoElement>(`${s} video`),
              ].every((n) => Boolean(n.poster)),
            secao,
          ),
        )
        .toBe(true);
    });

    /**
     * **A piscada cinza, esta é a do vídeo.**
     *
     * O atributo `poster` é conteúdo substituído e vale só enquanto a *show
     * poster flag* está de pé; `play()` a derruba na hora, e o primeiro quadro
     * decodificado chega um quadro de composição depois. Nesse vão o `<video>`
     * não representa nada e o `bg-ink/20` da caixa aparece. Medido por
     * screencast a 1,5 Mbps: um quadro cinza de 265px de largura, 18–26ms
     * **depois** do evento `playing`, uma vez por cartão, ao deslizar.
     *
     * O sensor é o fundo CSS e não o pixel: o vão dura um quadro, e teste que
     * depende de pegar um quadro é moeda no ar. O fundo é a garantia
     * estrutural de que não existe vão para pegar.
     */
    test("o vídeo do cartão tem o poster como fundo, e não um vão", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .locator('section[aria-labelledby="entregas"] video')
        .first()
        .scrollIntoViewIfNeeded();

      /**
       * O `poster` só é escrito quando o bloco chega perto — ele é buscado na
       * montagem mesmo com `preload="none"`, e sete deles abaixo da dobra
       * atravancavam a folha de estilo antes do primeiro pixel. Chegar perto é
       * o que o `scrollIntoViewIfNeeded` acima faz; o atributo aparece no
       * render seguinte ao observador, e é esse render que se espera aqui.
       *
       * A garantia continua a mesma: onde há poster, há o mesmo ficheiro como
       * fundo. O que mudou foi o instante, não o par.
       */
      await expect
        .poll(() =>
          page.evaluate(() =>
            [
              ...document.querySelectorAll<HTMLVideoElement>(
                'section[aria-labelledby="entregas"] video',
              ),
            ].every((v) => Boolean(v.poster)),
          ),
        )
        .toBe(true);

      const vaos = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLVideoElement>(
            'section[aria-labelledby="entregas"] video',
          ),
        ]
          .map((v) => ({
            poster: v.poster,
            fundo: getComputedStyle(v).backgroundImage,
          }))
          // O fundo tem de ser o **mesmo** arquivo do poster: um fundo
          // qualquer taparia o vão com a imagem errada.
          .filter(({ poster, fundo }) => !fundo.includes(new URL(poster).pathname))
          .map(({ poster }) => poster),
      );
      expect(vaos).toEqual([]);
    });

    test("nenhum vídeo carrega antes de o carrossel ser alcançado", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.locator("video")).not.toHaveCount(0);
      await expect(page.locator("video source")).toHaveCount(0);

      const primeiro = page
        .locator('section[aria-labelledby="entregas"] video')
        .first();
      await primeiro.scrollIntoViewIfNeeded();

      // Só o slide corrente: os outros continuam no poster.
      await expect(page.locator("video source")).toHaveCount(2);
      await expect
        .poll(() => primeiro.evaluate((v: HTMLVideoElement) => v.paused))
        .toBe(false);
    });
  });

  test.describe("com JavaScript desabilitado", () => {
    test.use({ javaScriptEnabled: false });

    test("o texto do hero continua visível", async ({ page }) => {
      await congelarRotacao(page);
      await page.goto("/");

      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        semMarcacao(ptBR.hero.frases[0]),
      );
      await expect(page.getByText(ptBR.hero.cargoCurto)).toBeVisible();
      // Sem JS não há WebGL montado: o conteúdo não pode depender do canvas.
      await expect(page.locator("canvas")).toHaveCount(0);
    });
  });

  /**
   * As três animações scroll-driven do hero, nos valores medidos **em
   * navegador** (viewport 1440×900):
   *
   * | scrollY | wrapper y | conteúdo opacity | indicador opacity |
   * |---------|-----------|------------------|-------------------|
   * | 200     | 100       | 0.778            | 0                 |
   * | 450     | 225       | 0.500            | 0                 |
   * | 675     | 337.5     | 0.250            | 0                 |
   * | 900     | 450       | 0.000            | 0                 |
   *
   * O indicador está aqui por uma razão específica. Ele saía errado (subia de
   * 0 a 1 ao longo do hero em vez de sumir nos primeiros 20%) e **nenhum**
   * teste da suíte via isso: o texto estava certo, o contraste estava certo, a
   * seção montava. Quem pegou foi a comparação numérica dos valores alvo.
   *
   * A causa foi o motion entregar a animação ao browser como scroll-driven
   * nativa sobre um `ViewTimeline`, cuja faixa de progresso não é a mesma do
   * `useScroll` (ver o comentário em `Hero.tsx`). É um modo de falha que só
   * aparece em número, então é em número que ele fica travado.
   */
  test("as três animações de scroll do hero batem com o alvo", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__lenis));

    const medir = () =>
      page.evaluate(() => {
        const ler = (seletor: string) => {
          const el = document.querySelector(seletor);
          if (!el) return null;
          const estilo = getComputedStyle(el);
          const m = estilo.transform.match(/-?[\d.]+/g);
          return {
            y: estilo.transform === "none" ? 0 : Number(m?.[5] ?? 0),
            opacity: Number(estilo.opacity),
          };
        };
        return {
          wrapper: ler('[data-name="hero"] > div:nth-child(2)'),
          conteudo: ler('[data-name="hero"] > div:nth-child(2) > div'),
          indicador: ler('[data-name="hero"] > div:last-child'),
        };
      });

    for (const [scrollY, y, opacidade] of [
      [200, 100, 0.778],
      [450, 225, 0.5],
      [675, 337.5, 0.25],
      [900, 450, 0],
    ] as const) {
      // `immediate`: o Lenis interpola, e uma leitura logo depois de um
      // `scrollTo` suave pega o meio da interpolação.
      await page.evaluate(
        (alvo) => window.__lenis?.scrollTo(alvo, { immediate: true }),
        scrollY,
      );
      await page.waitForTimeout(250);

      const atual = await medir();
      expect(atual.wrapper?.y, `wrapper y em ${scrollY}`).toBeCloseTo(y, 0);
      expect(
        atual.conteudo?.opacity,
        `opacidade do conteúdo em ${scrollY}`,
      ).toBeCloseTo(opacidade, 2);
      // Some nos primeiros 20% da janela, ou seja, antes de scrollY 180.
      expect(
        atual.indicador?.opacity,
        `opacidade do indicador em ${scrollY}`,
      ).toBe(0);
    }

    // Controle positivo: no topo o indicador está visível. Sem isto, um
    // indicador permanentemente invisível passaria em todas as linhas acima.
    await page.evaluate(() => window.__lenis?.scrollTo(0, { immediate: true }));
    await page.waitForTimeout(250);
    expect((await medir()).indicador?.opacity).toBe(1);
  });

  /**
   * A regra do WCAG AA, não uma inventada mais dura: 4.5:1 para texto normal e
   * 3:1 para texto grande (≥24px, ou ≥18.66px em negrito). O piso chapado de
   * 4.5:1 que estava aqui reprovava o acento saturado nos títulos
   * de display (onde a norma o permite) e forçou a paleta inteira a clarear.
   */
  test("todo texto da home cumpre o piso do WCAG AA que lhe cabe", async ({
    page,
  }) => {
    // A auditoria varre ~100 elementos, e cada um pode exigir a própria volta
    // de scroll quando o reveal dele é ligado ao scroll. É lenta por desenho.
    test.setTimeout(120_000);
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__campoRenderer));
    await page.waitForFunction(() => Boolean(window.__lenis));

    const { falhas, avaliados, fundoMaisClaro } =
      await relatorioDeContraste(page);

    // Controle positivo do volume: uma coleta que não achasse elemento nenhum
    // devolveria zero falha e passaria sem medir coisa alguma.
    expect(avaliados).toBeGreaterThan(20);

    // Controle positivo do canvas: o hero fica sobre o campo, então o fundo
    // mais claro medido na home tem que ser mais claro que o `#020203` do
    // body. Sem o shader pintando, qualquer cor de texto passaria de graça.
    expect(
      fundoMaisClaro,
      "o campo de partículas não estava pintando",
    ).toBeGreaterThan(relativeLuminance([2, 2, 3]));

    expect(falhas).toEqual([]);
  });
});

/**
 * SEC-02 e SEC-03. Os valores esperados são escritos aqui a partir do conteúdo
 * da spec, não lidos do dicionário sob teste: comparar o dado consigo mesmo
 * passaria por construção, inclusive com a chave quebrada.
 */
const EMPRESAS = {
  pt: {
    regiao: "Sócio em duas empresas.",
    softcode: [
      "Software house",
      "Desde jul 2025",
      "Dois sócios, ambos desenvolvedores",
    ],
    proops: [
      "ERP para empresas de serviço",
      "Desde out 2025",
      "Três sócios, dois na engenharia",
      "cliente pagante",
    ],
  },
  en: {
    regiao: "Partner at two companies.",
    softcode: [
      "Software house",
      "Since Jul 2025",
      "Two partners, both developers",
    ],
    proops: [
      "ERP for service companies",
      "Since Oct 2025",
      "Three partners, two in engineering",
      "paying client",
    ],
  },
};

async function trocarParaIngles(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: ptBR.header.language }).click();
  await expect(
    page.getByRole("button", { name: enUS.header.language }),
  ).toHaveText("EN");
}

test.describe("Rota /: seção de empresas (SEC-02, SEC-03)", () => {
  /**
   * O ritmo da abordagem sai da **largura**, não de JS.
   *
   * O caminho por JS mede a altura do painel com `ResizeObserver` e escreve
   * `--height`, `--padding-top` e `--padding-bottom`, e serve `NaNpx` no SSR
   * enquanto a medição não aconteceu. Aqui as três saem de `cqw` sobre a linha
   * de duas colunas, e o CSS resolve no primeiro quadro.
   *
   * Os quatro números abaixo são a resolução medida em 1440×900, com o painel
   * `aspect-square` numa coluna `w-1/2` de uma linha de 1120 com vão de 145:
   * lado 487,5 · `top` (900 − 487,5)/2 · vão entre blocos 487,5/2 · recuo do
   * topo 0,157 × 975.
   *
   * **A armadilha que este teste tranca**: `container-type` no próprio elemento
   * não vale para as propriedades dele: `cqw` resolve contra o contêiner
   * *ancestral*, e sem um deles cai no viewport. Com o contêiner declarado no
   * lugar errado, o vão saiu **720px** em vez de 243,75 e nada quebrou: a página
   * renderizou, a seção mediu certo, e só o ritmo ficou errado.
   */
  test("o painel gruda centrado e o ritmo da coluna sai da largura", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const secao = page.getByRole("region", { name: EMPRESAS.pt.regiao });
    await expect(secao).toBeVisible();

    const medido = await secao.evaluate((sec) => {
      const painel = sec.querySelector("[class*=aspect-square]")!;
      const coluna = sec.querySelector("ul")!;
      const caixa = painel.getBoundingClientRect();
      return {
        lado: Math.round(caixa.width),
        quadrado: Math.round(caixa.width) === Math.round(caixa.height),
        top: getComputedStyle(painel).top,
        vao: Number.parseFloat(getComputedStyle(coluna).rowGap),
        recuo: Number.parseFloat(getComputedStyle(coluna).paddingTop),
      };
    });

    expect(medido.lado).toBe(488);
    expect(medido.quadrado).toBe(true);
    expect(medido.top).toBe("206.25px");
    expect(medido.vao).toBeCloseTo(243.75, 1);
    expect(medido.recuo).toBeCloseTo(153.1, 0);
  });

  for (const locale of ["pt", "en"] as const) {
    test(`nomeia SoftCode e ProOps com a composição societária em ${locale}`, async ({
      page,
    }) => {
      await page.goto("/");
      if (locale === "en") await trocarParaIngles(page);

      const empresas = page.getByRole("region", {
        name: EMPRESAS[locale].regiao,
      });
      await expect(empresas).toBeVisible();

      // Os dois nomes, como títulos, não como menção solta em qualquer lugar.
      expect(
        await empresas
          .getByRole("heading", { level: 3 })
          .evaluateAll((nodes) => nodes.map((node) => node.textContent)),
      ).toEqual(["SoftCode", "ProOps"]);

      for (const trecho of [
        ...EMPRESAS[locale].softcode,
        ...EMPRESAS[locale].proops,
      ]) {
        await expect(
          empresas.getByText(trecho, { exact: false }).first(),
          `"${trecho}" não chegou à seção de empresas em ${locale}`,
        ).toBeVisible();
      }

      await expectTranslationsResolved(page, "/", locale);
    });

    /**
     * A restrição do Gabriel, na tela e nos dois idiomas: pode dizer que existe
     * cliente pagante, não quantos nem quem. O teste de dado cobre a fonte;
     * este cobre o que o visitante lê, que é onde uma tradução descuidada
     * vazaria.
     */
    test(`não revela quantidade nem nome de cliente da ProOps em ${locale}`, async ({
      page,
    }) => {
      await page.goto("/");
      if (locale === "en") await trocarParaIngles(page);

      const empresas = page.getByRole("region", {
        name: EMPRESAS[locale].regiao,
      });
      const texto = await empresas.innerText();

      // Controle positivo: sem isto, uma seção vazia passaria em todas as
      // negativas abaixo sem provar nada.
      expect(texto).toContain("ProOps");
      expect(texto.toLowerCase()).toMatch(/cliente pagante|paying client/);

      expect(texto, "número de clientes na tela").not.toMatch(
        /(\d+\s*\+?\s*(clientes?|clients?))|((clientes?|clients?)\s*:?\s*\d+)/i,
      );
      expect(texto, "plural de cliente pagante").not.toMatch(
        /clientes\s+pagantes|paying\s+clients/i,
      );
      for (const nome of ["LyftConnect", "Lyft", "Barbalog"]) {
        expect(
          texto,
          `nome de cliente da ProOps na tela: ${nome}`,
        ).not.toContain(nome);
      }
    });
  }
});

/**
 * SEC-10 e SEC-18, no molde de projetos.
 *
 * A grade mostra **os sete** projetos em duas fileiras, e as fileiras são as
 * duas naturezas do trabalho: as quatro entregas profissionais em cima, os três
 * exercícios de curso embaixo. Duas fileiras de 260 dão os 520 do painel ao
 * lado, e é essa igualdade que dá ao bloco a altura que ele tem.
 *
 * O que o SEC-18 cobra é onde a invariante morde: a atribuição continua
 * proibida de aparecer sem valor, e tem de aparecer **exatamente** nas entregas
 * profissionais — um estudo com `entreguePor` seria dado errado.
 */
const ENTREGAS_REGIAO = {
  pt: "O que está no ar.",
  en: "What is live.",
};
test.describe("Rota /: seção de entregas (SEC-10, SEC-18)", () => {
  test("a grade tem os sete projetos, entregas antes de estudos", async ({
    page,
  }) => {
    await page.goto("/");
    const entregas = page.getByRole("region", { name: ENTREGAS_REGIAO.pt });

    expect(
      await entregas
        .getByRole("heading", { level: 3 })
        .evaluateAll((nodes) => nodes.map((node) => node.textContent)),
    ).toEqual([
      "SoftCode",
      "Barbalog",
      "LyftConnect",
      "ProOps",
      "Alura Space",
      "Store Flow",
      "Olá Mundo",
    ]);

    // A atribuição por entrega, na ordem, não só "SoftCode aparece em algum
    // lugar da seção". Os três estudos entram sem atribuição nenhuma.
    expect(
      await entregas
        .locator("[data-entregue-por]")
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-entregue-por")),
        ),
    ).toEqual(["SoftCode", "SoftCode", "SoftCode", "ProOps"]);
  });

  /**
   * As células são `[...profissionais, ...estudos]`, e desde que os estudos
   * ganharam case page **todas** linkam para dentro. Era quatro: os estudos
   * apontavam para fora.
   */
  test("cada entrega linka para a sua case page", async ({ page }) => {
    await page.goto("/");
    const entregas = page.getByRole("region", { name: ENTREGAS_REGIAO.pt });

    expect(
      await entregas
        .locator('a[href^="/projetos/"]')
        .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
    ).toEqual([
      "/projetos/softcode",
      "/projetos/barbalog",
      "/projetos/lyftconnect",
      "/projetos/proops",
      "/projetos/alura-space",
      "/projetos/store-flow",
      "/projetos/ola-mundo",
    ]);
  });

  // SEC-18: o rótulo de atribuição não pode existir sem valor. Um `entreguePor`
  // ausente tem que sumir com o rótulo junto, não deixar "Entregue por" solto.
  test("a grade não deixa atribuição vazia", async ({ page }) => {
    await page.goto("/");
    const entregas = page.getByRole("region", { name: ENTREGAS_REGIAO.pt });

    const atribuicoes = await entregas
      .locator("[data-entregue-por]")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));

    expect(atribuicoes).toHaveLength(4);
    for (const atribuicao of atribuicoes) {
      // O rótulo sozinho não basta: o valor tem que vir junto.
      expect(atribuicao.trim().length).toBeGreaterThan(
        ptBR.deliveries.by.length,
      );
      expect(atribuicao).toMatch(/SoftCode|ProOps/);
    }

    // O que de fato mata o defeito do SEC-18: tirar o valor de dentro da
    // condicional deixaria um "Entregue por" solto num elemento **sem** o
    // atributo, invisível para o locator acima. Contar o rótulo no texto da
    // seção pega isso, porque o número de rótulos tem que bater com o número
    // de atribuições completas.
    // `textContent`, não `innerText`: o rótulo leva `text-transform: uppercase`
    // e o `innerText` devolveria "ENTREGUE POR", que nunca casaria.
    const conteudo = await entregas.evaluate((node) => node.textContent ?? "");
    const rotulos = conteudo.match(new RegExp(ptBR.deliveries.by, "g")) ?? [];
    expect(
      rotulos,
      'rótulo "Entregue por" sem valor correspondente',
    ).toHaveLength(atribuicoes.length);
  });

  /**
   * O título **anima** ao distribuir, não salta.
   *
   * Este teste existe por um defeito que passou por toda a suíte e por todas as
   * sondas de geometria: o React Compiler memoizava a lista de palavras do
   * título, os `motion.span` não re-renderizavam quando `justify-content`
   * mudava, o FLIP do motion nunca media, e o browser aplicava a distribuição de
   * uma vez. O estado final ficava **perfeito** (mesma caixa, mesmas
   * coordenadas), então nada que olhasse o repouso podia pegar.
   *
   * O que se mede aqui é o meio do caminho: se em algum quadro da entrada a
   * primeira palavra carrega um `translateX` de verdade. O rótulo entra junto
   * porque ele escapava da memoização por acidente (mora dentro de um
   * condicional) e servia de controle: se um dia ele parar de animar, o
   * problema é outro.
   */
  test("o título e o rótulo distribuem animando, não saltando", async ({
    page,
  }) => {
    await page.goto("/");
    /**
     * **Esperar a hidratação antes de amostrar, e reclamar se o alvo sumir.**
     *
     * `goto` resolve no `load`, não na hidratação. Sob os workers da suíte
     * cheia o `evaluate` chegava antes de o `TituloDistribuido` existir no
     * cliente: `querySelector` devolvia `null`, o laço pulava com `continue`, e
     * o teste terminava com pico **0**, que é exatamente o número que ele
     * existe para reprovar. Silenciosamente intermitente, e reportando "o
     * rótulo saltou" para um rótulo que nem tinha nascido.
     *
     * O `__lenis` é o sinal de que o cliente montou, e o `throw` transforma
     * alvo ausente em erro legível em vez de num falso positivo de defeito.
     */
    await page.waitForFunction(() => Boolean(window.__lenis));
    await page.waitForSelector(
      'section[aria-labelledby="entregas"] #entregas > span[aria-hidden] > span',
    );
    await page.evaluate(() => window.scrollTo(0, 0));

    const picos = await page.evaluate(async () => {
      const secao = document.querySelector(
        'section[aria-labelledby="entregas"]',
      )!;
      const alvos = {
        rotulo: secao.querySelector("p > span[aria-hidden] > span"),
        titulo: secao.querySelector("#entregas > span[aria-hidden] > span"),
      };
      for (const [nome, el] of Object.entries(alvos)) {
        if (!el) throw new Error(`alvo ausente: ${nome}`);
      }
      /**
       * Pelo Lenis **e** pelo `window`. O Lenis intercepta o scroll do
       * documento e interpola: só `window.scrollTo` deixa a entrada acontecer
       * devagar, e sob os 5 workers da suíte cheia a janela de amostragem
       * fechava antes de o observer disparar. É o mesmo par que
       * `e2e/contrast.ts` usa.
       *
       * O bloco começa em 1100; 900 o traz para dentro da viewport sem que ele
       * tenha passado antes, porque `useInView` é `once`.
       */
      window.__lenis?.scrollTo(900, { immediate: true });
      window.scrollTo(0, 900);

      const pico = { rotulo: 0, titulo: 0 };
      const inicio = performance.now();
      await new Promise<void>((resolve) => {
        const quadro = () => {
          for (const [nome, el] of Object.entries(alvos)) {
            if (!el) continue;
            const nums = getComputedStyle(el).transform.match(/-?[\d.]+/g);
            const x = nums && nums.length >= 6 ? Math.abs(Number(nums[4])) : 0;
            if (x > pico[nome as keyof typeof pico]) {
              pico[nome as keyof typeof pico] = x;
            }
          }
          // Sai assim que os dois provaram que animam: esperar o teto inteiro
          // só serve para o caso em que **não** anima, que é o que se quer
          // pegar. Teto largo porque o agendador sob carga é lento, não porque
          // a animação seja.
          const provado = pico.rotulo > 10 && pico.titulo > 10;
          if (!provado && performance.now() - inicio < 3000) {
            requestAnimationFrame(quadro);
          } else resolve();
        };
        requestAnimationFrame(quadro);
      });
      return pico;
    });

    // O deslocamento real é de centenas de pixels; 10 é só o piso que separa
    // "animou" de "não mexeu".
    expect(picos.rotulo, "o rótulo saltou em vez de animar").toBeGreaterThan(
      10,
    );
    expect(picos.titulo, "o título saltou em vez de animar").toBeGreaterThan(
      10,
    );
  });

  test("a seção de entregas renderiza em inglês sem chave crua", async ({
    page,
  }) => {
    await page.goto("/");
    await trocarParaIngles(page);

    const entregas = page.getByRole("region", { name: ENTREGAS_REGIAO.en });
    await expect(entregas).toBeVisible();
    await expect(
      entregas.getByText(enUS.deliveries.by, { exact: false }).first(),
    ).toBeVisible();

    await expectTranslationsResolved(page, "/", "en");
  });
});

/**
 * SEC-01, a trajetória. A ordem esperada é escrita a partir do done-when do
 * T7 ("Huawei/DWDM → PDI → ND → VS Telecom → empresas próprias"), não lida do
 * dicionário: é justamente a derivação por índice que precisa ser vigiada.
 */
const TRAJETORIA_REGIAO = {
  pt: "Da fibra ao software.",
  en: "From fibre to software.",
};

/**
 * Põe o trilho da trajetória numa altura em que dá para apontar para ele.
 *
 * Duas armadilhas, as duas medidas aqui:
 *
 * 1. **`window.scrollTo` não vence o Lenis.** Ele intercepta o scroll da janela,
 *    e a chamada crua era simplesmente ignorada em duas de cada três execuções:
 *    a caixa do trilho continuava em `y: −3420` e o arrasto acontecia no vazio,
 *    com o teste reprovando por "o trilho não andou". `__lenis.scrollTo(…,
 *    {immediate: true})` é o caminho que o resto desta suíte já usa.
 * 2. **O topo não serve.** O `<header>` é fixo e tem 65px; encostado nele, o
 *    Playwright reporta o elemento como visível e o clique morre em "subtree
 *    intercepts pointer events". A folga de 140px resolve.
 *
 * A asserção no fim é o que impede a falha silenciosa de voltar: sem trilho na
 * tela, um gesto de ponteiro não erra: ele não acontece.
 */
async function posicionarTrilhoDaTrajetoria(page: Page) {
  await page.waitForFunction(() => Boolean(window.__lenis));
  const alvo = await page.evaluate(() => {
    const trilho = document.querySelector(
      'section[aria-labelledby="trajetoria"] ul[aria-label]',
    )!;
    return trilho.getBoundingClientRect().top + window.scrollY - 140;
  });
  await page.evaluate(
    (y) => window.__lenis?.scrollTo(y, { immediate: true }),
    alvo,
  );
  await page.waitForTimeout(400);

  const caixa = (await page
    .locator('section[aria-labelledby="trajetoria"] ul[aria-label]')
    .boundingBox())!;
  expect(caixa.y, "o trilho não chegou à tela").toBeGreaterThan(100);
}

test.describe("Rota /: seção de trajetória (SEC-01)", () => {
  test("os cinco marcos aparecem na ordem do arco", async ({ page }) => {
    await page.goto("/");
    const trajetoria = page.getByRole("region", {
      name: TRAJETORIA_REGIAO.pt,
    });

    expect(
      await trajetoria
        .getByRole("heading", { level: 3 })
        .evaluateAll((nodes) => nodes.map((node) => node.textContent)),
    ).toEqual([
      "Estágio em Telecomunicações DWDM",
      "Estágio em Engenharia de Software (PDI)",
      "Estágio em Desenvolvimento (ND)",
      "Desenvolvedor de Software Júnior",
      "Empresas próprias",
    ]);
  });

  /**
   * A propriedade que o arco tem e a jornada não: aqui o tempo corre para
   * frente. Em `/sobre` a mesma lista é decrescente: se alguém "consertar" a
   * ordem por simetria com a outra página, este teste cai.
   */
  test("os períodos correm em ordem cronológica crescente", async ({
    page,
  }) => {
    await page.goto("/");
    const trajetoria = page.getByRole("region", {
      name: TRAJETORIA_REGIAO.pt,
    });

    // O primeiro ano que aparece dentro de cada card. Ler o `<li>` inteiro e
    // não um `li > p`: o card ganhou a anatomia do molde
    // (quadrado + bloco de texto em duas linhas), e um seletor posicional
    // amarraria este teste, que é sobre a **ordem do arco**, à profundidade
    // da marcação. Nenhuma descrição de marco carrega ano.
    const anos = (
      await trajetoria
        .locator("li")
        .evaluateAll((nodes) => nodes.map((node) => node.textContent))
    ).map((texto) => Number(texto?.match(/\d{4}/)?.[0]));

    expect(anos).toHaveLength(5);
    expect(anos.every(Number.isFinite)).toBe(true);
    expect([...anos].sort((a, b) => a - b)).toEqual(anos);
  });

  // "Cada marco ancora num fato da jornada": os fatos que o T3 acrescentou
  // precisam chegar à tela por esta seção, não só por /sobre.
  test("os marcos carregam os fatos da jornada corrigida", async ({ page }) => {
    await page.goto("/");
    const trajetoria = page.getByRole("region", {
      name: TRAJETORIA_REGIAO.pt,
    });

    for (const fato of [
      "Dimensionamento dos canais da fibra",
      "Salesforce",
      "Python",
      "Huawei (INATEL)",
      "SoftCode · ProOps",
    ]) {
      await expect(
        trajetoria.getByText(fato, { exact: false }).first(),
        `"${fato}" não chegou à trajetória`,
      ).toBeVisible();
    }
  });

  /**
   * O gesto pelo qual o carrossel existe, e o que faltava: com `overflow-x`
   * puro, quem está num mouse de roda só folheia pelos pontos, porque a roda vertical
   * rola a página e não há roda horizontal.
   *
   * O arrasto é **mais de meio passo**, de propósito. A primeira versão deste
   * teste arremessava 130px e exigia que a projeção da velocidade fizesse o
   * resto, e ficou intermitente: sob os quatro workers da suíte cheia, os
   * mesmos cinco `mouse.move` levam três vezes mais tempo de relógio, a
   * velocidade medida cai pela metade e o pouso mudava. Teste de ponteiro mede
   * a máquina, não o código. A regra do pouso mora em `alvoDoArremesso` e é
   * provada sem relógio em `Carrossel.test.ts`; aqui o que se cobra é que o
   * ponteiro **mova** o trilho e ele **encaixe**, que é o que não existia. Com
   * 62% de passo o alvo é o mesmo pelos dois ramos da regra, então o resultado
   * não depende de o gesto ter sido lido como arremesso ou como arrasto.
   */
  test("arrastar com o ponteiro passa um card e encaixa", async ({ page }) => {
    await page.goto("/");
    const trilho = page.locator(
      'section[aria-labelledby="trajetoria"] ul[aria-label]',
    );
    await posicionarTrilhoDaTrajetoria(page);

    const caixa = (await trilho.boundingBox())!;
    // Metade da altura, e não um quarto: o `<header>` é fixo e de 65px, e o
    // ponteiro pousado no topo do trilho é interceptado por ele, e o arrasto
    // nunca chega ao carrossel.
    const y = caixa.y + caixa.height / 2;
    const x0 = caixa.x + caixa.width * 0.8;
    const passoDoTrilho = await trilho.evaluate(
      (el) =>
        el.children[0].getBoundingClientRect().width +
        Number.parseFloat(getComputedStyle(el).columnGap),
    );

    await page.mouse.move(x0, y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(x0 - (passoDoTrilho * 0.62 * i) / 6, y);
    }
    await page.mouse.up();
    await page.waitForTimeout(1500);

    // Índice em passos de encaixe, não em pixels: a largura do card muda com o
    // viewport e o número exato não é o que está sob teste. `toBeCloseTo(1, 1)`
    // e não `>0`: parar entre dois encaixes é o defeito que o `snap-mandatory`
    // existe para impedir, e um trilho que anda sem encaixar passaria.
    expect(await trilho.evaluate((el) => el.scrollLeft)).toBeCloseTo(
      passoDoTrilho,
      -1,
    );
  });

  test("clicar num card vizinho o traz para o centro", async ({ page }) => {
    await page.goto("/");
    const trajetoria = page.getByRole("region", {
      name: TRAJETORIA_REGIAO.pt,
    });
    await posicionarTrilhoDaTrajetoria(page);

    await trajetoria
      .locator("li")
      .nth(1)
      .click({ position: { x: 60, y: 300 } });
    await page.waitForTimeout(1500);

    await expect(trajetoria.locator("li").nth(1)).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("a trajetória renderiza em inglês sem chave crua", async ({ page }) => {
    await page.goto("/");
    await trocarParaIngles(page);

    const trajetoria = page.getByRole("region", {
      name: TRAJETORIA_REGIAO.en,
    });
    await expect(trajetoria).toBeVisible();
    expect(
      await trajetoria
        .getByRole("heading", { level: 3 })
        .evaluateAll((nodes) => nodes.map((node) => node.textContent)),
    ).toEqual([
      "DWDM Telecommunications Intern",
      "Software Engineering Intern (PDI)",
      "Development Intern (ND)",
      "Junior Software Developer",
      "Companies of my own",
    ]);

    await expectTranslationsResolved(page, "/", "en");
  });
});

/**
 * SEC-01 e SEC-09, a formação. Os títulos esperados são escritos a partir do
 * done-when do T8 e das correções C3/C5, não lidos do dicionário: a seção lê o
 * diploma e o prêmio da jornada por índice, e é justamente essa derivação que
 * precisa de vigia.
 */
const FORMACAO_REGIAO = {
  pt: "Formação e reconhecimento.",
  en: "Education and recognition.",
};
const CREDENCIAIS = {
  pt: [
    "Bacharelado Eng. de Software",
    "Inglês avançado",
    "21 certificações e licenças",
    "Werk, Prêmio Municipal de Inovações",
  ],
  en: [
    "Bachelor's in Software Engineering",
    "Advanced English",
    "21 certifications and licences",
    "Werk, Municipal Innovations Award",
  ],
};

test.describe("Rota /: seção de formação (SEC-01, SEC-09)", () => {
  test("as quatro credenciais aparecem na ordem do done-when", async ({
    page,
  }) => {
    await page.goto("/");
    const formacao = page.getByRole("region", { name: FORMACAO_REGIAO.pt });

    expect(
      await formacao
        .getByRole("heading", { level: 3 })
        .evaluateAll((nodes) => nodes.map((node) => node.textContent)),
    ).toEqual(CREDENCIAIS.pt);
  });

  test("o diploma traz o INATEL, a cidade e o período de jan 2021 a dez 2025", async ({
    page,
  }) => {
    await page.goto("/");
    const formacao = page.getByRole("region", { name: FORMACAO_REGIAO.pt });

    for (const fato of [
      "INATEL, Santa Rita do Sapucaí",
      "Jan 2021 - Dez 2025",
    ]) {
      await expect(
        formacao.getByText(fato, { exact: false }).first(),
        `"${fato}" não chegou à formação`,
      ).toBeVisible();
    }
  });

  /**
   * A decisão registrada na spec: aparece o **número**, não a lista. Contar os
   * itens é o que separa "21 como dado" de "21 linhas de curso na tela": sem
   * essa contagem, despejar as 21 certificações passaria neste teste.
   */
  test("o inglês e as 21 certificações aparecem como número, não como lista", async ({
    page,
  }) => {
    await page.goto("/");
    const formacao = page.getByRole("region", { name: FORMACAO_REGIAO.pt });

    await expect(
      formacao.getByText("Five · Jan 2026", { exact: false }).first(),
    ).toBeVisible();
    expect(await formacao.innerText()).toMatch(/\b21\b/);
    /**
     * O que importa é **não ser uma lista de 21**, não o número exato de `<li>`.
     *
     * A contagem era fixada em 4 porque o layout da v4 tinha um `<li>` por
     * credencial. No molde são 3 cartões para 4 credenciais, e o
     * do inglês carrega também o das certificações. Fixar a contagem de novo só
     * amarraria o teste ao próximo layout.
     *
     * A âncora estrutural continua existindo e é mais forte: o teste vizinho
     * cobra os 4 `<h3>` na ordem do done-when.
     */
    expect(await formacao.getByRole("listitem").count()).toBeLessThan(10);
  });

  // C3 / P2-AC4: o prêmio nomeia o projeto **e** o papel do Gabriel nele.
  test("o prêmio nomeia o Werk e o papel de front-end", async ({ page }) => {
    await page.goto("/");
    const texto = await page
      .getByRole("region", { name: FORMACAO_REGIAO.pt })
      .innerText();

    expect(texto).toContain("Werk");
    expect(texto).toContain("Prêmio Municipal de Inovações");
    expect(texto.toLowerCase()).toContain("front-end");
  });

  test("a formação renderiza em inglês sem chave crua", async ({ page }) => {
    await page.goto("/");
    await trocarParaIngles(page);

    const formacao = page.getByRole("region", { name: FORMACAO_REGIAO.en });
    await expect(formacao).toBeVisible();
    expect(
      await formacao
        .getByRole("heading", { level: 3 })
        .evaluateAll((nodes) => nodes.map((node) => node.textContent)),
    ).toEqual(CREDENCIAIS.en);

    await expectTranslationsResolved(page, "/", "en");
  });
});

/**
 * SEC-01, SEC-04, SEC-16: o contato e a montagem da home.
 *
 * A ordem esperada é escrita à mão. Contar seções sem conferir a ordem deixaria
 * passar uma home com o contato antes do hero.
 */
const CONTATO_REGIAO = {
  pt: "Onde a conversa começa.",
  en: "Where the conversation starts.",
};
/**
 * A ordem é a do **molde**, não a da narrativa: portfolio → quotes →
 * abordagem → stories → rodapé. Cada bloco na posição para a qual foi
 * desenhado, que é o que dá o mesmo ritmo vertical à página.
 */
const SECOES_DA_HOME = [
  "hero",
  "entregas",
  "trajetoria",
  "empresas",
  "formacao",
  "contato",
];
const EMAIL = "gabriel.dias01@outlook.com.br";

test.describe("Rota /: contato e montagem (SEC-01, SEC-04, SEC-16)", () => {
  /**
   * **A vinheta do rodapé é medida contra a caixa do texto, e nada segurava isso.**
   *
   * A elipse de `Contato` é `scale(440 201)` sólida até `0.82`, o que resolve em
   * 361 × 165 de preto chapado, escolhido para cobrir exatamente o bloco de
   * conversão (720 × ~330, ou ±360 × ±165). É o que deixa os raios brilhantes
   * fora dessa caixa sem que eles passem por trás do texto (AD-032).
   *
   * O acoplamento é invisível: mexer no `max-w` do bloco, ou o texto ganhar uma
   * linha, tira o texto do sólido e o contraste reprova **em outro lugar**, com um
   * número de 1,6:1 e nenhuma pista apontando para a vinheta. Foi exatamente essa
   * forma de falha que custou duas rodadas de depuração nesta sessão.
   */
  test("o bloco de conversão cabe no miolo sólido da vinheta", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const bloco = page
      .getByRole("region", { name: /Onde a conversa começa/ })
      .locator("div.max-w-720");

    const caixa = (await bloco.boundingBox())!;
    // Os dois semi-eixos do sólido: 0.82 × 440 e 0.82 × 201.
    expect(
      caixa.width,
      "o bloco passou da largura sólida da vinheta",
    ).toBeLessThanOrEqual(2 * 361);
    expect(
      caixa.height,
      "o bloco passou da altura sólida da vinheta",
    ).toBeLessThanOrEqual(2 * 165);
  });

  test("a home renderiza exatamente seis seções, na ordem da spec", async ({
    page,
  }) => {
    await page.goto("/");

    expect(await pageSectionIds(page)).toEqual(SECOES_DA_HOME);
    await expectSectionsLabelled(page, "/");
  });

  test("o contato expõe e-mail, GitHub e LinkedIn", async ({ page }) => {
    await page.goto("/");
    const contato = page.getByRole("region", { name: CONTATO_REGIAO.pt });

    await expect(contato.locator(`a[href="mailto:${EMAIL}"]`)).toHaveText(
      EMAIL,
    );
    // Nome acessível **e** destino: um link rotulado "GitHub" apontando para
    // outro lugar cumpriria uma contagem e mentiria para o visitante.
    await expect(contato.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/almeidagabriel01",
    );
    await expect(
      contato.getByRole("link", { name: "LinkedIn" }),
    ).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/gabrielalmeidadias/",
    );
  });

  /**
   * Controle positivo do predicado de telefone. Sem ele, uma regex que não casa
   * nada passaria em toda rota para sempre, e a proibição do Gabriel ficaria
   * sem guarda nenhum.
   */
  test("o padrão de telefone reconhece telefone e não confunde data nem contagem", async () => {
    for (const telefone of TELEFONES) {
      expect(PHONE_PATTERN.test(telefone), `não reconheceu ${telefone}`).toBe(
        true,
      );
    }
    for (const texto of NAO_TELEFONES) {
      expect(
        PHONE_PATTERN.test(texto),
        `confundiu "${texto}" com telefone`,
      ).toBe(false);
    }
  });

  for (const locale of ["pt", "en"] as const) {
    test(`nenhum telefone em lugar nenhum da home em ${locale}`, async ({
      page,
    }) => {
      await page.goto("/");
      if (locale === "en") await trocarParaIngles(page);

      // Controle positivo: sem provar que o contato está na tela, uma home
      // quebrada passaria na negativa sem ter contato nenhum para vazar.
      await expect(
        page.getByRole("region", { name: CONTATO_REGIAO[locale] }),
      ).toBeVisible();
      await expect(page.locator(`a[href="mailto:${EMAIL}"]`)).toHaveCount(1);

      await expectNoPhone(page, `/ (${locale})`);
    });
  }

  test("o contato renderiza em inglês sem chave crua", async ({ page }) => {
    await page.goto("/");
    await trocarParaIngles(page);

    const contato = page.getByRole("region", { name: CONTATO_REGIAO.en });
    await expect(contato).toBeVisible();
    await expect(contato.getByText(enUS.contact.button)).toBeVisible();
    await expect(contato.locator(`a[href="mailto:${EMAIL}"]`)).toHaveText(
      EMAIL,
    );

    await expectTranslationsResolved(page, "/", "en");
  });
});

/**
 * Controle positivo do reveal de seção (`useSectionReveal`).
 *
 * Sem ele, nenhuma asserção desta suíte prova que as seções novas chegam a
 * aparecer: `toBeVisible()` do Playwright ignora `opacity`, e nenhum dos testes
 * acima rola a página. Um `IntersectionObserver` que nunca dispara deixaria
 * empresas, entregas e trajetória em branco para todo visitante com JS, e a
 * suíte inteira continuaria verde. É o mesmo padrão de controle positivo que o
 * `a11y.spec.ts` usa para o contador do `ScrollBridge`.
 */
/**
 * O bloco "reveal das seções novas" saiu na v5.
 *
 * Ele cobria o fade de **seção inteira** do `useSectionReveal`, mecanismo da v4.
 * Nenhuma seção da home usa mais isso: cada uma foi reescrita no molde novo
 * e anima por elemento: título por FLIP de layout, conteúdo por
 * `useInView` com `once: true` (AD-007), rodapé por scroll.
 *
 * A garantia que importava (conteúdo escondido volta a aparecer) mudou de
 * dono e ficou mais forte, nos dois testes abaixo.
 */
test.describe("Rota /: sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("as seções chegam por SSR e ficam visíveis", async ({ page }) => {
    await page.goto("/");

    for (const heading of ["SoftCode", "ProOps", "Barbalog", "LyftConnect"]) {
      await expect(
        page.getByRole("heading", { name: heading, exact: true }).first(),
      ).toBeVisible();
    }
  });

  /**
   * A garantia que o `<noscript>` do `layout.tsx` existe para dar.
   *
   * Toda animação de entrada declara o estado inicial em `initial`, e o React
   * serializa isso como `style="opacity:0"` no HTML do servidor. Com script, o
   * `useInView` dispara e o elemento aparece; **sem script, o observer nunca
   * roda**. Medido antes da correção: 25 elementos assim só na trajetória, e o
   * texto no DOM, e um bloco vazio na tela.
   *
   * O teste não confere a regra CSS, confere o **efeito**: nada dentro de `main`
   * fica invisível.
   */
  test("nada dentro de main fica invisível sem JS", async ({ page }) => {
    await page.goto("/");

    const invisiveis = await page.evaluate(() =>
      [...document.querySelectorAll("main *")]
        .filter((el) => {
          const estilo = getComputedStyle(el);
          return (
            Number(estilo.opacity) < 0.5 &&
            (el.textContent ?? "").trim().length > 0
          );
        })
        .map((el) => (el.textContent ?? "").trim().slice(0, 40)),
    );

    expect(invisiveis).toEqual([]);
  });

  // Controle positivo: sem ele, um `main` vazio passaria no teste acima.
  test("o conteúdo medido acima existe de verdade", async ({ page }) => {
    await page.goto("/");
    expect(
      await page.evaluate(() => document.querySelectorAll("main *").length),
    ).toBeGreaterThan(100);
  });
});
