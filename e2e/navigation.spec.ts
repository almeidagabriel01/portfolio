import { expect, test, type Page } from "@playwright/test";
import { expectTranslationsResolved } from "./i18n-keys";

const ROUTES = ["/", "/projects", "/about"];

/** Escopo obrigatório: `/` ainda monta o Header legado, que também linka "Projetos". */
function routeNav(page: Page, label: string) {
  return page.getByRole("navigation", { name: label });
}

test.describe("Shell de layout: Header e Footer", () => {
  test("os links do header navegam entre as rotas sem recarregar a página", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__routeState));

    await routeNav(page, "Navegação de rotas")
      .getByRole("link", { name: "Projetos" })
      .click();
    await expect(page).toHaveURL("/projects");

    await routeNav(page, "Navegação de rotas")
      .getByRole("link", { name: "Sobre" })
      .click();
    await expect(page).toHaveURL("/about");

    await routeNav(page, "Navegação de rotas")
      .getByRole("link", { name: "Início" })
      .click();
    await expect(page).toHaveURL("/");

    // `previous` só sobrevive a navegação client-side: um reload completo
    // recriaria o store e devolveria `null`.
    await page.waitForFunction(
      () => window.__routeState?.().pathname.current === "/",
    );
    expect(
      await page.evaluate(() => window.__routeState?.().pathname.previous),
    ).toBe("/about");
  });

  test("o primeiro tab-stop é um skip link visível para o conteúdo", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#conteudo")).toHaveCount(1);

    await page.keyboard.press("Tab");
    const focado = page.locator(":focus");
    await expect(focado).toHaveAttribute("href", "#conteudo");

    // `sr-only` mede 1px: só o `focus:not-sr-only` o torna realmente visível.
    const caixa = await focado.boundingBox();
    expect(caixa?.width ?? 0).toBeGreaterThan(50);
  });

  // PORT-18
  test("o idioma escolhido sobrevive à navegação entre rotas", async ({
    page,
  }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Trocar idioma" });
    await expect(toggle).toHaveText("PT");

    await toggle.click();
    // O rótulo acessível também troca de idioma, daí o novo nome no locator.
    await expect(page.getByRole("button", { name: "Switch language" })).toHaveText(
      "EN",
    );

    await routeNav(page, "Route navigation")
      .getByRole("link", { name: "Projects" })
      .click();
    await expect(page).toHaveURL("/projects");

    await expect(page.getByRole("button", { name: "Switch language" })).toHaveText(
      "EN",
    );
    await expect(
      routeNav(page, "Route navigation").getByRole("link", { name: "Home" }),
    ).toBeVisible();
  });

  test("todo link externo declara rel noopener noreferrer", async ({ page }) => {
    await page.goto("/projects");
    const external = page.locator('a[href^="http"]');

    // Sem este piso, a asserção passaria numa página sem link externo nenhum.
    const count = await external.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const link = external.nth(index);
      const rel = (await link.getAttribute("rel")) ?? "";
      expect(
        rel.split(/\s+/),
        `rel de ${await link.getAttribute("href")}`,
      ).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
    }
  });

  // PORT-19
  test("toda rota resolve as chaves em português: nada cru, nada faltando", async ({
    page,
  }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      await expectTranslationsResolved(page, route, "pt");
    }
  });

  // PORT-19. A outra metade: a paridade de chaves não impede uma chave
  // resolver só em um dos idiomas.
  test("toda rota resolve as chaves em inglês: nada cru, nada faltando", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Trocar idioma" }).click();
    await expect(page.getByRole("button", { name: "Switch language" })).toHaveText(
      "EN",
    );

    for (const route of ROUTES) {
      await page.goto(route);
      await expect(
        page.getByRole("button", { name: "Switch language" }),
      ).toHaveText("EN");
      await expectTranslationsResolved(page, route, "en");
    }
  });
});
