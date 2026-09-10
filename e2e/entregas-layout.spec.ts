import { expect, test, type Page } from "@playwright/test";

const SECAO = 'section[aria-labelledby="entregas"]';
const DESKTOPS = [768, 1024, 1280, 1440] as const;

type Locale = "pt" | "en";

/**
 * Faz a leitura das caixas do texto, incluindo cada linha que o browser
 * realmente posicionou. `getBoundingClientRect()` do elemento pode esconder
 * uma linha que sangrou para fora depois de uma quebra; os rects da Range são
 * a unidade que interessa para este contrato visual.
 */
async function verificarCartoes(page: Page, estado: string) {
  const falhas = await page.locator(`${SECAO} ul li a`).evaluateAll(
    (cartoes, estadoAtual) => {
      type Caixa = { left: number; top: number; right: number; bottom: number };
      type Falha = { cartao: number; estado: string; problema: string };

      const caixa = (elemento: Element): Caixa => {
        const retangulo = elemento.getBoundingClientRect();
        return {
          left: retangulo.left,
          top: retangulo.top,
          right: retangulo.right,
          bottom: retangulo.bottom,
        };
      };

      const caixasDoTexto = (elemento: Element): Caixa[] => {
        const range = document.createRange();
        range.selectNodeContents(elemento);
        return [...range.getClientRects()]
          .filter((retangulo) => retangulo.width > 0 && retangulo.height > 0)
          .map((retangulo) => ({
            left: retangulo.left,
            top: retangulo.top,
            right: retangulo.right,
            bottom: retangulo.bottom,
          }));
      };

      const dentro = (texto: Caixa, cartao: Caixa) =>
        texto.left >= cartao.left - 1 &&
        texto.right <= cartao.right + 1 &&
        texto.top >= cartao.top - 1 &&
        texto.bottom <= cartao.bottom + 1;

      const sobrepoe = (a: Caixa, b: Caixa) =>
        Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
        Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;

      const visivel = (elemento: Element) => {
        let opacidade = 1;
        for (let atual: Element | null = elemento; atual; atual = atual.parentElement) {
          opacidade *= Number(getComputedStyle(atual).opacity);
        }
        return opacidade > 0.95;
      };

      const falhas: Falha[] = [];
      for (const [indice, cartao] of cartoes.entries()) {
        const cartaoCaixa = caixa(cartao);
        const titulo = cartao.querySelector("h3");
        const paragrafos = [...cartao.querySelectorAll("p")];
        if (!titulo || paragrafos.length !== 2) {
          falhas.push({
            cartao: indice + 1,
            estado: estadoAtual,
            problema: `estrutura inesperada: h3=${Boolean(titulo)} p=${paragrafos.length}`,
          });
          continue;
        }

        const textos = {
          atribuicao: caixasDoTexto(paragrafos[0]),
          titulo: caixasDoTexto(titulo),
          descricao: caixasDoTexto(paragrafos[1]),
        };

        for (const [nome, caixas] of Object.entries(textos)) {
          if (caixas.length === 0) {
            falhas.push({
              cartao: indice + 1,
              estado: estadoAtual,
              problema: `${nome} não tem uma caixa de texto renderizada`,
            });
            continue;
          }
          if (caixas.some((texto) => !dentro(texto, cartaoCaixa))) {
            falhas.push({
              cartao: indice + 1,
              estado: estadoAtual,
              problema: `${nome} saiu dos limites do cartão`,
            });
          }
        }

        const pares: [string, Element, Caixa[], string, Element, Caixa[]][] = [
          ["atribuição", paragrafos[0], textos.atribuicao, "título", titulo, textos.titulo],
          ["atribuição", paragrafos[0], textos.atribuicao, "descrição", paragrafos[1], textos.descricao],
          ["título", titulo, textos.titulo, "descrição", paragrafos[1], textos.descricao],
        ];
        for (const [nomeA, elementoA, caixasA, nomeB, elementoB, caixasB] of pares) {
          if (!visivel(elementoA) || !visivel(elementoB)) continue;
          if (caixasA.some((a) => caixasB.some((b) => sobrepoe(a, b)))) {
            falhas.push({
              cartao: indice + 1,
              estado: estadoAtual,
              problema: `${nomeA} sobrepõe ${nomeB}`,
            });
          }
        }
      }
      return falhas;
    },
    estado,
  );

  expect(falhas, `geometria inválida (${estado})`).toEqual([]);
}

async function prepararDesktop(page: Page, largura: number, locale: Locale) {
  await page.setViewportSize({ width: largura, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.__lenis));

  // Aguarda a hidratação do idioma persistido antes de decidir se precisa
  // alternar. Sem este passo, um teste que termina em inglês pode começar o
  // próximo `goto` vendo o `lang="pt"` do SSR por um instante.
  const idiomaPersistido = await page.evaluate(
    () => localStorage.getItem("portfolio-lang") ?? "pt",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", idiomaPersistido);
  const idiomaAtual = idiomaPersistido;
  if ((idiomaAtual === "en") !== (locale === "en")) {
    await page
      .getByRole("button", {
        name: locale === "en" ? "Trocar idioma" : "Switch language",
      })
      .click();
  }

  const cartoes = page.locator(`${SECAO} ul li a`);
  await expect(cartoes).toHaveCount(7);
  await cartoes.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
}

for (const largura of DESKTOPS) {
  test(`os sete cartões cabem e separam os textos em ${largura}px`, async ({
    page,
  }) => {
    for (const locale of ["pt", "en"] as const) {
      await prepararDesktop(page, largura, locale);
      await verificarCartoes(page, `${locale} repouso`);

      const cartoes = page.locator(`${SECAO} ul li a`);
      for (let indice = 0; indice < await cartoes.count(); indice++) {
        const cartao = cartoes.nth(indice);
        await cartao.hover();
        await expect(cartao.locator("p").last()).toHaveCSS("opacity", "1");
        await page.waitForTimeout(450);
        await verificarCartoes(page, `${locale} hover cartão ${indice + 1}`);

        await page.mouse.move(2, 2);
        await cartao.focus();
        await expect(cartao.locator("p").last()).toHaveCSS("opacity", "1");
        await page.waitForTimeout(450);
        await verificarCartoes(page, `${locale} foco cartão ${indice + 1}`);
      }
    }
  });
}

test.describe("descrição em viewport estreita", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: false, isMobile: false });

  test("a descrição permanece visível com mouse em 390px", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__lenis));
    const cartao = page.locator(`${SECAO} ul li a`).first();
    await expect(page.locator(`${SECAO} ul li a`)).toHaveCount(7);
    await cartao.scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500);

    const descricao = cartao.locator("p").nth(1);
    await expect
      .poll(() => descricao.evaluate((element) => Number(getComputedStyle(element).opacity)))
      .toBe(1);
    await verificarCartoes(page, "mouse estreito");
  });
});

test.describe("descrição em toque", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("a descrição permanece visível no modo touch em 390px", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__lenis));
    expect(await page.evaluate(() => matchMedia("(hover: hover)").matches)).toBe(false);

    const cartoes = page.locator(`${SECAO} ul li a`);
    await expect(cartoes).toHaveCount(7);
    await cartoes.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const descricoesVisiveis = await cartoes.evaluateAll((nodes) =>
      nodes.map((node) => {
        const descricao = node.querySelectorAll("p")[1];
        if (!descricao) return false;
        const range = document.createRange();
        range.selectNodeContents(descricao);
        return (
          Number(getComputedStyle(descricao).opacity) > 0 &&
          [...range.getClientRects()].some(
            (retangulo) => retangulo.width > 0 && retangulo.height > 0,
          )
        );
      }),
    );
    expect(descricoesVisiveis).toEqual([true, true, true, true, true, true, true]);
    await verificarCartoes(page, "touch estreito");
  });
});
