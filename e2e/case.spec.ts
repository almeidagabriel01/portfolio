import { expect, test } from "@playwright/test";
import { expectSectionsLabelled, pageSectionIds } from "./sections";
import { enUS, ptBR } from "../src/locales";
import { portfolioProjects } from "../src/data/projects";

function project(slug: string) {
  const found = portfolioProjects.find((entry) => entry.slug === slug);
  if (!found?.case) throw new Error(`case ausente no dado: ${slug}`);
  return { ...found, case: found.case };
}

const barbalog = project("barbalog");
const proops = project("proops");

test.describe("Rota /projects/[slug]: case page", () => {
  // PORT-14
  test("o case do Barbalog renderiza contexto, papel, stack e link ao vivo", async ({
    page,
  }) => {
    await page.goto("/projects/barbalog");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Barbalog");
    await expect(page.getByText(barbalog.case.contexto.pt)).toBeVisible();

    // SEC-11: o papel tem fonte e chega à tela sem marcador nenhum.
    await expect(page.getByText(barbalog.case.papel.pt)).toBeVisible();
    expect(barbalog.case.papel.pt).not.toContain("[VERIFICAR]");

    for (const item of barbalog.case.stack) {
      await expect(page.getByRole("listitem").filter({ hasText: item }).first()).toBeVisible();
    }

    await expect(
      page.getByRole("link", { name: new RegExp(ptBR.caseStudy.visit) }),
    ).toHaveAttribute("href", barbalog.link);
  });

  // PORT-14: o segundo projeto de trabalho, com os destaques.
  test("o case do ProOps renderiza os destaques declarados", async ({
    page,
  }) => {
    await page.goto("/projects/proops");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ProOps");
    for (const destaque of proops.case.destaques.pt) {
      await expect(page.getByText(destaque)).toBeVisible();
    }
  });

  // PORT-15: status HTTP real, não "a UI parece vazia".
  test("slug inexistente devolve 404 de verdade", async ({ request }) => {
    expect((await request.get("/projects/nao-existe")).status()).toBe(404);
  });

  // Os estudos ganharam case page. O 404 continua sendo a garantia de PORT-15,
  // mas agora só para slug que não existe: projeto listado tem para onde ir.
  test("todo slug listado responde 200, estudo inclusive", async ({
    request,
  }) => {
    for (const slug of portfolioProjects.map((entry) => entry.slug)) {
      expect(
        (await request.get(`/projects/${slug}`)).status(),
        `esperava 200 para /projects/${slug}`,
      ).toBe(200);
    }
  });

  test("o link externo do case declara rel noopener noreferrer", async ({
    page,
  }) => {
    await page.goto("/projects/barbalog");
    const external = page.locator('a[href^="http"]');

    const count = await external.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const rel = (await external.nth(index).getAttribute("rel")) ?? "";
      expect(rel.split(/\s+/)).toEqual(
        expect.arrayContaining(["noopener", "noreferrer"]),
      );
    }
  });

  test("o case renderiza nos dois idiomas", async ({ page }) => {
    await page.goto("/projects/barbalog");
    await expect(page.getByText(barbalog.case.contexto.pt)).toBeVisible();

    await page.getByRole("button", { name: ptBR.header.language }).click();
    await expect(
      page.getByRole("button", { name: enUS.header.language }),
    ).toHaveText("EN");

    await expect(page.getByText(barbalog.case.contexto.en)).toBeVisible();
    await expect(page.getByText(barbalog.case.papel.en)).toBeVisible();
  });
});

/**
 * SEC-14 e SEC-16: a navegação entre cases.
 *
 * A metade "sendo o único com case a seção some" não é observável aqui: os três
 * projetos com case existem no dado real. Ela é provada no unitário, com um
 * dado construído (`OutrosCases.test.tsx`).
 */
test.describe("Rota /projects/[slug]: navegação entre cases (SEC-14, SEC-16)", () => {
  test("a case page renderiza exatamente duas seções de página", async ({
    page,
  }) => {
    await page.goto("/projects/barbalog");

    expect(await pageSectionIds(page)).toEqual([
      "case-titulo",
      "outros-cases",
    ]);
    await expectSectionsLabelled(page, "/projects/barbalog");
  });

  test("a navegação lista os outros cases e exclui o atual", async ({
    page,
  }) => {
    await page.goto("/projects/lyftconnect");
    const outros = page.getByRole("region", { name: ptBR.caseStudy.others });

    expect(
      await outros
        .getByRole("heading", { level: 3 })
        .evaluateAll((nodes) => nodes.map((node) => node.textContent)),
    ).toEqual([
      "Alura Space",
      "Store Flow",
      "Olá Mundo",
      "SoftCode",
      "Barbalog",
      "ProOps",
    ]);
    expect(
      await outros
        .getByRole("link")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
    ).toEqual([
      "/projects/alura-space",
      "/projects/store-flow",
      "/projects/ola-mundo",
      "/projects/softcode",
      "/projects/barbalog",
      "/projects/proops",
    ]);
  });

  // O link tem que levar ao case certo: uma lista com os nomes trocados de
  // destino passaria nas duas asserções acima se elas fossem separadas.
  test("clicar num outro case leva à case page dele", async ({ page }) => {
    await page.goto("/projects/barbalog");

    await page
      .getByRole("region", { name: ptBR.caseStudy.others })
      .getByRole("link", { name: /ProOps/ })
      .click();

    await page.waitForURL("/projects/proops");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ProOps");
  });

  test("a navegação entre cases renderiza em inglês", async ({ page }) => {
    await page.goto("/projects/barbalog");
    await page.getByRole("button", { name: ptBR.header.language }).click();
    await expect(
      page.getByRole("button", { name: enUS.header.language }),
    ).toHaveText("EN");

    const outros = page.getByRole("region", { name: enUS.caseStudy.others });
    await expect(outros).toBeVisible();
    await expect(
      outros.getByText(
        portfolioProjects.find((entry) => entry.slug === "proops")!.descricao
          .en,
      ),
    ).toBeVisible();
  });
});
