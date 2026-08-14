import { expect, test, type Page } from "@playwright/test";
import { expectTranslationsResolved } from "./i18n-keys";
import {
  CLIENT_COUNT_PATTERN,
  expectNoClientCount,
  expectNoPhone,
  NAO_SAO_QUANTIDADES,
  QUANTIDADES_DE_CLIENTE,
} from "./sections";
import { enUS, ptBR } from "../src/locales";

/**
 * Auditoria de fechamento da v3 (T13).
 *
 * As proibições já têm teste no lugar onde cada afirmação nasce: a seção de
 * empresas, o contato, o dado. O que se prova aqui é outra coisa: que elas
 * valem em **toda rota e nos dois idiomas**. Uma copy nova numa página que
 * ninguém associou à restrição é exatamente por onde ela vazaria.
 */
const ROTAS = [
  "/",
  "/projects",
  "/about",
  "/projects/barbalog",
  "/projects/lyftconnect",
  "/projects/proops",
];

async function trocarParaIngles(page: Page) {
  await page.getByRole("button", { name: ptBR.header.language }).click();
  await expect(
    page.getByRole("button", { name: enUS.header.language }),
  ).toHaveText("EN");
}

/**
 * Controle positivo dos predicados. Uma regex que não casa nada passa em todas
 * as rotas para sempre; os casos negativos garantem que apertá-la não vai
 * transformar "cliente pagante" (que é permitido) em falso alarme.
 */
test.describe("Predicados da auditoria", () => {
  test("o padrão de quantidade de clientes reconhece número e ignora o singular sem número", async () => {
    for (const amostra of QUANTIDADES_DE_CLIENTE) {
      expect(
        CLIENT_COUNT_PATTERN.test(amostra),
        `não reconheceu "${amostra}"`,
      ).toBe(true);
    }
    for (const amostra of NAO_SAO_QUANTIDADES) {
      expect(
        CLIENT_COUNT_PATTERN.test(amostra),
        `alarme falso em "${amostra}"`,
      ).toBe(false);
    }
  });
});

test.describe("Proibições de conteúdo em toda rota (SEC-03, SEC-04)", () => {
  for (const rota of ROTAS) {
    for (const locale of ["pt", "en"] as const) {
      test(`${rota} em ${locale}: sem telefone e sem quantidade de cliente`, async ({
        page,
      }) => {
        await page.goto(rota);
        if (locale === "en") await trocarParaIngles(page);

        // Controle positivo: uma rota que devolvesse página em branco passaria
        // em todas as negativas abaixo sem provar nada.
        expect(
          (await page.locator("main").innerText()).length,
          `conteúdo vazio em ${rota}`,
        ).toBeGreaterThan(200);

        await expectNoPhone(page, `${rota} (${locale})`);
        await expectNoClientCount(page, `${rota} (${locale})`);
      });
    }
  }
});

/**
 * A LyftConnect é entrega da SoftCode. Nomeá-la (ou nomear a Barbalog) dentro
 * do case da ProOps a transformaria em cliente do ERP, que é a afirmação que o
 * Gabriel proibiu.
 */
test.describe("O case da ProOps não nomeia cliente (SEC-03)", () => {
  for (const locale of ["pt", "en"] as const) {
    test(`nenhum nome de outra entrega no case da ProOps em ${locale}`, async ({
      page,
    }) => {
      await page.goto("/projects/proops");
      if (locale === "en") await trocarParaIngles(page);

      const caso = await page
        .getByRole("region", { name: "ProOps" })
        .innerText();

      // Controle positivo: sem isto, um seletor que não casasse nada devolveria
      // string vazia e passaria em todas as negativas.
      expect(caso.toLowerCase()).toMatch(/em produção|in production/);

      for (const nome of ["LyftConnect", "Barbalog", "Lyft"]) {
        expect(caso, `nome de outra entrega no case da ProOps: ${nome}`).not.toContain(
          nome,
        );
      }
    });
  }
});

/**
 * SEC-05 nas rotas que o `navigation.spec.ts` não cobre: a case page não estava
 * na lista de chaves renderizadas até o T13.
 */
test.describe("Nenhuma chave crua na case page (SEC-05)", () => {
  test("em português", async ({ page }) => {
    await page.goto("/projects/barbalog");
    await expectTranslationsResolved(page, "/projects/barbalog", "pt");
  });

  test("em inglês", async ({ page }) => {
    await page.goto("/projects/barbalog");
    await trocarParaIngles(page);
    await expectTranslationsResolved(page, "/projects/barbalog", "en");
  });
});

/**
 * O marcador de métrica é decisão registrada, não pendência esquecida: onde não
 * há número publicado, ele fica. O teste existe para que apagá-lo por
 * "limpeza" (ou trocá-lo por um número inventado) quebre o gate.
 */
test.describe("Nenhum marcador de pendência chega à tela", () => {
  for (const slug of ["barbalog", "lyftconnect", "proops"]) {
    test(`o case do ${slug} não publica nenhum [VERIFICAR]`, async ({
      page,
    }) => {
      await page.goto(`/projects/${slug}`);
      const texto = await page.locator("main").innerText();

      /**
       * Invertido nesta rodada. O marcador existia para impedir que apagá-lo
       * virasse "inventar número", e ele foi resolvido pela única via que não
       * inventa nada: o Gabriel respondeu. Onde não há número publicável, o
       * texto **diz isso** em vez de prometer um futuro.
       */
      expect(texto, `marcador de pendência publicado em ${slug}`).not.toContain(
        "[VERIFICAR]",
      );
      // O de **papel** é o que tinha de sumir (SEC-11): o bloco de papel não
      // pode conter marcador nenhum.
      const papel = await page
        .getByRole("heading", { name: ptBR.caseStudy.role, exact: true })
        .evaluate((node) => node.parentElement?.textContent ?? "");
      expect(papel, `marcador de papel voltou em ${slug}`).not.toContain(
        "[VERIFICAR]",
      );
    });
  }
});
