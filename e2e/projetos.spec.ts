import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectSectionsLabelled, pageSectionIds } from "./sections";
import { relatorioDeContraste } from "./contrast";
import { enUS, ptBR } from "../src/locales";
import { portfolioProjects } from "../src/data/projects";

declare global {
  interface Window {
    /** Opacidade da seção no quadro em que o título trocou de distribuição. */
    __opacidadeNaTroca?: string;
  }
}

/**
 * Os nomes vêm do spec (PORT-13 + as correções C1/C2 da v3), não do array: o
 * dado é o que está sob teste.
 */
// A SoftCode entrou: o site da software house da qual ele é sócio.
const TRABALHO = ["SoftCode", "Barbalog", "LyftConnect", "ProOps"];
const ESTUDO = [
  "Alura Space",
  "Store Flow",
  "Olá Mundo",
];

/**
 * `textContent` e não `innerText`: os rótulos de grupo levam `text-transform:
 * uppercase`, que é apresentação: o texto sob teste é o do DOM.
 */
function headingTexts(page: Page, level: 2 | 3 | 4, within?: Locator) {
  const scope = within ?? page;
  return scope
    .getByRole("heading", { level })
    .evaluateAll((nodes) => nodes.map((node) => node.textContent));
}

/**
 * A linha da tabela de um projeto.
 *
 * As regiões "Trabalho" e "Estudos" sumiram na fase C: o molde é **uma**
 * tabela com a taxonomia numa coluna, não em blocos separados. Escopar por `data-projeto` é mais apertado do que escopar pela
 * região era: a asserção passou de "a descrição está no bloco do grupo certo"
 * para "está na linha daquele projeto".
 */
function linha(page: Page, slug: string) {
  return page.locator(`[data-projeto="${slug}"]`);
}

/** Os grupos, na ordem em que a tabela lista os projetos. */
function gruposDaTabela(page: Page) {
  return page
    .locator("[data-projeto] > span:last-child")
    .allTextContents();
}

function projectDescription(nome: string, locale: "pt" | "en") {
  const project = portfolioProjects.find((entry) => entry.nome === nome);
  if (!project) throw new Error(`projeto ausente no dado: ${nome}`);
  return project.descricao[locale];
}

test.describe("Rota /projects: hierarquia de projetos", () => {
  // PORT-13
  test("o grupo Trabalho vem antes de Estudos, com as três entregas nessa ordem", async ({
    page,
  }) => {
    await page.goto("/projects");

    // A tabela é uma só, e a ordem dela **é** o agrupamento: os três de
    // trabalho primeiro, os cinco estudos depois.
    expect(await gruposDaTabela(page)).toEqual([
      ...TRABALHO.map(() => ptBR.projects.groups.trabalho),
      ...ESTUDO.map(() => ptBR.projects.groups.estudo),
    ]);
    expect(await headingTexts(page, 3, page.locator("[data-tabela]"))).toEqual([
      ...TRABALHO,
      ...ESTUDO,
    ]);
  });

  // PORT-13 + C2: a outra metade do agrupamento, agora com cinco estudos.
  test("o grupo Estudos lista os exercícios de curso", async ({ page }) => {
    await page.goto("/projects");

    const daTabela = await gruposDaTabela(page);
    expect(daTabela.filter((g) => g === ptBR.projects.groups.estudo)).toHaveLength(
      ESTUDO.length,
    );
    for (const nome of ESTUDO) {
      await expect(page.locator("[data-tabela]").getByRole("heading", { name: nome })).toBeVisible();
    }
  });

  // Link só existe para quem tem case page: um link para rota que devolve 404
  // é pior do que link nenhum. Desde que os estudos ganharam case, isso é todo
  // mundo, e o teste virou a garantia de que ninguém ficou de fora.
  test("todo projeto recebe link para a própria case page", async ({
    page,
  }) => {
    await page.goto("/projects");

    /**
     * Conjunto, não lista: cada projeto com case aparece **duas vezes** na
     * rota desde a fase C (uma no bloco de destaque e uma na linha da tabela),
     * que é o que o molde pede. O que o teste cobra é
     * *quem* tem case page, não quantas vezes é linkado.
     */
    const caseLinks = page.locator('a[href^="/projects/"]');
    const destinos = await caseLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    );
    expect([...new Set(destinos)].sort()).toEqual([
      "/projects/alura-space",
      "/projects/barbalog",
      "/projects/lyftconnect",
      "/projects/ola-mundo",
      "/projects/proops",
      "/projects/softcode",
      "/projects/store-flow",
    ]);

    // O caminho que mudou: `alura-space` é estudo e agora aponta para dentro.
    expect(await linha(page, "alura-space").getAttribute("href")).toBe(
      "/projects/alura-space",
    );
  });

  test("em português os rótulos e as descrições vêm em português", async ({
    page,
  }) => {
    await page.goto("/projects");

    // Nível 2: o `<h1>` da rota passou a ser a headline do hero, e o título da
    // lista desceu um nível junto (fase C).
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: new RegExp(ptBR.projects.highlight),
      }),
    ).toBeVisible();
    await expect(page.getByText(ptBR.projects.label)).toBeVisible();
    await expect(
      linha(page, "barbalog").getByText(projectDescription("Barbalog", "pt")),
    ).toBeVisible();
    await expect(
      linha(page, "alura-space").getByText(
        projectDescription("Alura Space", "pt"),
      ),
    ).toBeVisible();
  });

  test("em inglês os rótulos de grupo e as descrições trocam", async ({
    page,
  }) => {
    await page.goto("/projects");
    await page.getByRole("button", { name: ptBR.header.language }).click();
    await expect(
      page.getByRole("button", { name: enUS.header.language }),
    ).toHaveText("EN");

    expect(await gruposDaTabela(page)).toEqual([
      ...TRABALHO.map(() => enUS.projects.groups.trabalho),
      ...ESTUDO.map(() => enUS.projects.groups.estudo),
    ]);
    await expect(
      linha(page, "barbalog").getByText(projectDescription("Barbalog", "en")),
    ).toBeVisible();
    await expect(
      linha(page, "alura-space").getByText(
        projectDescription("Alura Space", "en"),
      ),
    ).toBeVisible();
  });
});

/**
 * SEC-13 e SEC-16: a segunda seção da rota.
 *
 * O teste de derivação vive no unitário (`StackTransversal.test.ts`), que é
 * onde dá para mexer no dado. Aqui prova-se o outro lado: o que a derivação
 * produz chega à tela, e a rota continua com duas seções de página.
 */
const STACK_REGIAO = {
  pt: "A stack das entregas.",
  en: "The stack behind the work.",
};

test.describe("Rota /projects: janela viva do card de destaque", () => {
  /**
   * O requisito tem duas metades, e a segunda é a que paga: a janela **não**
   * pode carregar sozinha. Três `<iframe>` de terceiros no primeiro paint
   * custariam três sites inteiros para quem só passou os olhos.
   */
  test("nenhum iframe existe antes do gesto, e o primeiro só nasce ao abrir", async ({
    page,
  }) => {
    await page.goto("/projects");
    await expect(page.locator("iframe")).toHaveCount(0);

    await page
      .getByRole("button", { name: ptBR.projects.janela.abrir })
      .first()
      .click();

    await expect(page.locator("iframe")).toHaveCount(1);
    // O primeiro card da grade é a primeira entrega profissional: a grade
    // reordena trabalho antes de estudo, e o dado começa pelos estudos.
    expect(await page.locator("iframe").getAttribute("src")).toBe(
      portfolioProjects.find((p) => p.grupo !== "estudo")!.link,
    );
    // Sandbox sem `allow-top-navigation`: o site embutido não leva ninguém embora.
    const sandbox = await page.locator("iframe").getAttribute("sandbox");
    expect(sandbox).not.toContain("top-navigation");

    await page.getByRole("button", { name: ptBR.projects.janela.fechar }).click();
    await expect(page.locator("iframe")).toHaveCount(0);
  });

  // O card deixou de ser um link inteiro: um `<iframe>` dentro de uma âncora
  // rouba o clique do site embutido. O link agora é o título.
  test("o título do card continua levando à case page", async ({ page }) => {
    await page.goto("/projects");
    // O bloco de destaque não tem mais id: o alternador que precisava de
    // âncora saiu. O título do card é o link, e ele é `<h3>`.
    expect(
      await page
        .getByRole("heading", { level: 3, name: "Barbalog" })
        .getByRole("link", { name: "Barbalog" })
        .getAttribute("href"),
    ).toBe("/projects/barbalog");
  });
});

test.describe("Rota /projects: stack transversal (SEC-13, SEC-16)", () => {
  test("a rota renderiza o hero e as duas seções de página", async ({ page }) => {
    await page.goto("/projects");

    // O hero entrou na fase C: as três rotas internas abrem com
    // o mesmo bloco `h-svh`, e ele é uma seção de página como as outras.
    expect(await pageSectionIds(page)).toEqual([
      "hero",
      "lista-de-projetos",
      "stack-transversal",
    ]);
    await expectSectionsLabelled(page, "/projects");
  });

  test("cada tecnologia aparece com as entregas que a declaram", async ({
    page,
  }) => {
    await page.goto("/projects");
    const stack = page.getByRole("region", { name: STACK_REGIAO.pt });

    // Next.js está nas três entregas; Stripe só na ProOps. Uma agregação que
    // ignorasse o projeto de origem passaria na primeira e falharia na segunda.
    await expect(stack.locator('[data-tecnologia="Next.js"]')).toContainText(
      "Barbalog · LyftConnect · ProOps",
    );
    await expect(stack.locator('[data-tecnologia="Stripe"]')).toContainText(
      "ProOps",
    );
    await expect(
      stack.locator('[data-tecnologia="TypeScript"]'),
    ).toContainText("Barbalog");
  });

  /**
   * O marcador de pendência não é tecnologia. Ele **continua** na case page da
   * ProOps, que é onde significa alguma coisa: o par de asserções impede que
   * "sumiu da lista" vire "foi apagado do dado".
   */
  test("nenhum marcador [VERIFICAR] chega à lista nem à case page", async ({
    page,
  }) => {
    await page.goto("/projects");
    expect(await page.locator("main").innerText()).not.toContain("[VERIFICAR]");

    await page.goto("/projects/proops");
    expect(await page.locator("main").innerText()).not.toContain("[VERIFICAR]");
  });

  /**
   * **O título abre com a seção à vista, e no estreito também.**
   *
   * Esta seção era a única do site com `useSectionReveal`: a seção inteira
   * esmaecia de `opacity: 0` em 700ms, disparada por 15% da altura dela, e o
   * título distribuía em 600ms, disparado por 40% da altura dele. Numa seção
   * alta com um título baixo — 390×844 é o caso — o segundo gatilho chega
   * antes do primeiro e as duas janelas quase coincidem: medido, o
   * `justify-content` trocava com a seção ainda a `opacity: 0` e as palavras
   * terminavam de abrir no quadro em que ela chegava a `opacity: 1`. O gesto
   * inteiro corria por baixo do esmaecimento e o que se via era um título a
   * aparecer já distribuído — ao passo que no desktop, com o título alto e a
   * seção curta, a ordem se invertia e o gesto aparecia.
   *
   * Por isso o que se mede é **a opacidade no momento da troca**, não o estado
   * final: a caixa final estava correta o tempo todo, e é por isso que nenhuma
   * sonda de geometria pegava isto.
   */
  test.describe("o título distribui à vista", () => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      test(`em ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto("/projects");
        await page.waitForFunction(() => Boolean(window.__lenis));

        // Amostra a cada quadro até o `justify-content` trocar, e guarda a
        // opacidade da seção **nesse** quadro. `once: true` no `useInView`
        // (AD-007) quer dizer que só há uma chance de observar.
        await page.evaluate(() => {
          const secao = document.querySelector<HTMLElement>(
            '[aria-labelledby="stack-transversal"]',
          );
          const linha = document
            .getElementById("stack-transversal")
            ?.querySelector<HTMLElement>("span[aria-hidden]");
          if (!secao || !linha) throw new Error("seção ou título ausente");
          const olhar = () => {
            if (getComputedStyle(linha).justifyContent === "space-between") {
              window.__opacidadeNaTroca = getComputedStyle(secao).opacity;
              return;
            }
            requestAnimationFrame(olhar);
          };
          requestAnimationFrame(olhar);
        });

        await page.evaluate(() =>
          window.__lenis?.scrollTo(
            (
              document.querySelector(
                '[aria-labelledby="stack-transversal"]',
              ) as HTMLElement
            ).offsetTop,
            { immediate: true },
          ),
        );

        await page.waitForFunction(() => Boolean(window.__opacidadeNaTroca));
        expect(await page.evaluate(() => window.__opacidadeNaTroca)).toBe("1");
      });
    }
  });

  test("a stack transversal renderiza em inglês", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("button", { name: ptBR.header.language }).click();
    await expect(
      page.getByRole("button", { name: enUS.header.language }),
    ).toHaveText("EN");

    const stack = page.getByRole("region", { name: STACK_REGIAO.en });
    await expect(stack).toBeVisible();
    await expect(stack.getByText(enUS.stack.description)).toBeVisible();
    // Nome próprio de tecnologia não se traduz: a lista sai do dado nos dois
    // idiomas.
    await expect(stack.locator('[data-tecnologia="Next.js"]')).toContainText(
      "Barbalog · LyftConnect · ProOps",
    );
  });
});

/**
 * A terceira rota no contraste. O carrossel do UI-08 trouxe texto novo para
 * `/projects` (legenda, nome e atribuição), e era a única rota com conteúdo
 * própria que ainda não tinha piso de contraste medido.
 */
test.describe("Rota /projects: contraste (WCAG AA)", () => {
  test("todo texto cumpre o piso do WCAG AA que lhe cabe", async ({ page }) => {
    // A auditoria varre ~100 elementos, e cada um pode exigir a própria volta
    // de scroll quando o reveal dele é ligado ao scroll. É lenta por desenho.
    test.setTimeout(120_000);
    await page.goto("/projects");
    await page.waitForFunction(() => Boolean(window.__lenis));

    const { falhas, avaliados } = await relatorioDeContraste(page);

    // Sem piso, uma coleta vazia devolveria zero falha e passaria sem medir.
    expect(avaliados).toBeGreaterThan(30);
    expect(falhas).toEqual([]);
  });
});
