import { expect, test, type Locator, type Page } from "@playwright/test";
import { relatorioDeContraste } from "./contrast";
import { expectSectionsLabelled, pageSectionIds } from "./sections";
import { enUS, ptBR } from "../src/locales";

/**
 * A sequência esperada vem do spec (PORT-16: "as experiências da jornada em
 * ordem cronológica reversa", com as correções C3/C4/C5 da v3), escrita à mão:
 * comparar com o próprio array do dicionário faria o teste espelhar a
 * implementação.
 */
const CARGOS_PT = [
  "Desenvolvedor de Software Júnior",
  "Estágio de Desenvolvedor de Software",
  "Estágio em Desenvolvimento (ND)",
  "Estágio em Engenharia de Software (PDI)",
  "Estágio em Telecomunicações DWDM",
  "Werk, Prêmio Municipal de Inovações",
  "Bacharelado Eng. de Software",
];

const CATEGORIAS_PT = [
  "Front-End",
  "Back-End",
  "Infraestrutura",
  "Formação & Idiomas",
];

function texts(scope: Locator) {
  return scope.evaluateAll((nodes) => nodes.map((node) => node.textContent));
}

function jornada(page: Page) {
  return page.getByRole("region", {
    name: `${ptBR.journey.title}${ptBR.journey.highlight}`,
  });
}

test.describe("Rota /about: jornada e habilidades", () => {
  // PORT-16
  test("as 7 experiências da jornada renderizam na ordem esperada", async ({
    page,
  }) => {
    await page.goto("/about");

    expect(
      await texts(jornada(page).getByRole("heading", { level: 3 })),
    ).toEqual(CARGOS_PT);
  });

  // PORT-16: "ordem cronológica reversa" medida no período, não no rótulo.
  test("os períodos ficam em ordem cronológica decrescente", async ({
    page,
  }) => {
    await page.goto("/about");

    // `[data-periodo]` e não `li > p`: no molde da rota a linha ficou plana
    // (período, cargo, empresa e descrição são irmãos), então a posição deixou
    // de identificar o período, e a marcação identifica.
    const anos = (await texts(jornada(page).locator("[data-periodo]"))).map((periodo) =>
      Number(periodo?.match(/\d{4}/)?.[0]),
    );

    expect(anos).toHaveLength(7);
    expect(anos.every(Number.isFinite)).toBe(true);
    expect([...anos].sort((a, b) => b - a)).toEqual(anos);
  });

  test("as 4 categorias de skill renderizam com título e itens", async ({
    page,
  }) => {
    await page.goto("/about");

    const habilidades = page.getByRole("region", {
      name: `${ptBR.skills.title}${ptBR.skills.highlight}`,
    });

    expect(
      await texts(habilidades.getByRole("heading", { level: 3 })),
    ).toEqual(CATEGORIAS_PT);

    // Categoria sem item seria um título vazio passando por cobertura.
    for (const categoria of CATEGORIAS_PT) {
      // O grupo deixou de ser um `<li>` com a lista dentro: no molde da rota
      // o rótulo mora no rail e as linhas na coluna ao lado. O escopo
      // agora é o grupo, por marcação.
      const grupo = habilidades
        .locator("[data-grupo]")
        .filter({ has: page.getByRole("heading", { name: categoria }) });
      expect(await grupo.getByRole("listitem").count()).toBeGreaterThan(0);
    }
  });

  test("renderiza em inglês", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("button", { name: ptBR.header.language }).click();
    await expect(
      page.getByRole("button", { name: enUS.header.language }),
    ).toHaveText("EN");

    const jornadaEn = page.getByRole("region", {
      name: `${enUS.journey.title}${enUS.journey.highlight}`,
    });
    expect(
      await texts(jornadaEn.getByRole("heading", { level: 3 })),
    ).toEqual(enUS.journey.experiences.map((experience) => experience.cargo));

    await expect(
      page.getByRole("heading", { name: "Infrastructure" }),
    ).toBeVisible();
  });

  /**
   * SEC-15 e SEC-16: o conteúdo ampliado dos T3/T4 chegando à rota.
   *
   * Os testes acima cobrem a *lista* de cargos e categorias. O que o T12 pede é
   * outra coisa: os **fatos** que as correções C5 e o currículo trouxeram para
   * dentro de cada entrada. Uma jornada com os sete cargos certos e as
   * descrições antigas passaria lá em cima e falharia aqui.
   */
  test("a rota renderiza o hero e as duas seções de página", async ({ page }) => {
    await page.goto("/about");

    expect(await pageSectionIds(page)).toEqual([
      "hero",
      "jornada",
      "habilidades",
    ]);
    await expectSectionsLabelled(page, "/about");
  });

  test("os três estágios do INATEL aparecem com períodos distintos", async ({
    page,
  }) => {
    await page.goto("/about");
    const texto = await jornada(page).evaluate((node) => node.textContent ?? "");

    // C5: eram um estágio só na tela; são três, e o DWDM é programa da Huawei
    // sediado no INATEL, então nenhum dos dois rótulos sozinho está certo.
    for (const periodo of [
      "Out 2021 - Jul 2022",
      "Ago 2022 - Jan 2023",
      "Fev 2023 - Mar 2023",
    ]) {
      expect(texto, `período ausente na jornada: ${periodo}`).toContain(periodo);
    }
    expect(texto).toContain("Huawei (INATEL)");
  });

  test("a jornada traz o dimensionamento da fibra, o Salesforce e o webscraping", async ({
    page,
  }) => {
    await page.goto("/about");
    const texto = await jornada(page).evaluate((node) => node.textContent ?? "");

    for (const fato of [
      "Dimensionamento dos canais da fibra",
      "Salesforce",
      "webscraping",
      "Excel",
    ]) {
      expect(texto, `fato ausente na jornada: ${fato}`).toContain(fato);
    }
  });

  test("os mesmos fatos chegam em inglês", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("button", { name: ptBR.header.language }).click();
    await expect(
      page.getByRole("button", { name: enUS.header.language }),
    ).toHaveText("EN");

    const texto = await page
      .getByRole("region", {
        name: `${enUS.journey.title}${enUS.journey.highlight}`,
      })
      .evaluate((node) => node.textContent ?? "");

    for (const fato of [
      "Fibre channel dimensioning",
      "Salesforce",
      "web scraping",
    ]) {
      expect(texto, `fato ausente na jornada em inglês: ${fato}`).toContain(
        fato,
      );
    }
  });

  test("as habilidades trazem Flask, Salesforce, NoSQL e o par funcional/OO", async ({
    page,
  }) => {
    await page.goto("/about");
    const habilidades = page.getByRole("region", {
      name: `${ptBR.skills.title}${ptBR.skills.highlight}`,
    });

    for (const skill of [
      "Flask",
      "Salesforce",
      "NoSQL",
      "Programação Funcional e Orientada a Objetos",
    ]) {
      await expect(
        habilidades.getByRole("listitem").filter({ hasText: skill }).first(),
        `habilidade ausente: ${skill}`,
      ).toBeVisible();
    }
  });

  /**
   * A decisão registrada na spec: aparece o **número**, não a lista. Contar os
   * itens da categoria é o que impede que 21 linhas de curso entrem por aqui.
   */
  test("as habilidades trazem o inglês avançado e as 21 certificações como número", async ({
    page,
  }) => {
    await page.goto("/about");
    const formacao = page
      .getByRole("region", {
        name: `${ptBR.skills.title}${ptBR.skills.highlight}`,
      })
      .locator("[data-grupo]")
      .filter({ has: page.getByRole("heading", { name: "Formação & Idiomas" }) });

    await expect(formacao.getByText("Inglês avançado")).toBeVisible();
    await expect(formacao.getByText(/\b21\b/)).toBeVisible();
    await expect(formacao.getByRole("listitem")).toHaveCount(3);
  });

  // Edge case do spec: sem JS o conteúdo textual continua legível (SSR).
  test.describe("com JavaScript desabilitado", () => {
    test.use({ javaScriptEnabled: false });

    test("jornada e habilidades chegam por SSR", async ({ page }) => {
      await page.goto("/about");

      // `exact`: "Desenvolvedor de Software" é sufixo de "Estágio de …".
      for (const cargo of CARGOS_PT) {
        await expect(
          page.getByRole("heading", { name: cargo, exact: true }),
        ).toBeVisible();
      }
      for (const categoria of CATEGORIAS_PT) {
        await expect(
          page.getByRole("heading", { name: categoria, exact: true }),
        ).toBeVisible();
      }
    });
  });
});

/**
 * O contraste de `/about`, que a suíte não cobria em rota nenhuma além da home.
 *
 * A rota renderizava os ícones com a paleta da v1 embutida no dado
 * (`#7b2cbf`, `#00f3ff`) aplicada por `style` inline, passando por fora dos
 * tokens. Eram ícones `aria-hidden` sem texto, então não era falha de 1.4.3;
 * era paleta morta atravessando o sistema de design. O guarda de cor no dado
 * está em `skills.test.ts` e `journey.test.ts`; aqui fica o guarda do texto.
 */
test.describe("Rota /about: contraste (WCAG AA)", () => {
  test("todo texto cumpre o piso do WCAG AA que lhe cabe", async ({ page }) => {
    // A auditoria varre ~100 elementos, e cada um pode exigir a própria volta
    // de scroll quando o reveal dele é ligado ao scroll. É lenta por desenho.
    test.setTimeout(120_000);
    await page.goto("/about");
    await page.waitForFunction(() => Boolean(window.__lenis));

    const { falhas, avaliados } = await relatorioDeContraste(page);

    // Sem isto, uma coleta que não achasse elemento nenhum devolveria zero
    // falha e passaria sem medir coisa alguma.
    expect(avaliados).toBeGreaterThan(30);
    expect(falhas).toEqual([]);
  });
});
