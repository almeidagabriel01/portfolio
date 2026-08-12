import { expect, test } from "@playwright/test";

/**
 * Regressão do T6: as variáveis do `next/font` estavam no <body> enquanto o
 * `@theme` do Tailwind resolve `--font-display` em `:root`. O resultado é
 * silencioso: nada quebra, o site só renderiza inteiro na fonte do sistema.
 */
test.describe("Sistema tipográfico", () => {
  /**
   * A v5 tirou a Geist Sans: o site roda **duas** famílias, e a de
   * display também é a de corpo. Se alguém reintroduzir uma terceira família
   * para o corpo, o `<body>` deixa de resolver em Switzer e este teste cobra.
   */
  test("display e corpo usam a mesma família, Switzer", async ({ page }) => {
    await page.goto("/");

    // A marca do header é o consumidor de `font-display` presente em toda
    // rota. `[href="/"]` a distingue do skip link, que vem antes no DOM.
    const families = await page.evaluate(() => ({
      display: getComputedStyle(
        document.querySelector('header a[href="/"]')!,
      ).fontFamily,
      body: getComputedStyle(document.body).fontFamily,
    }));

    expect(families.display).toContain("switzer");
    expect(families.body).toContain("switzer");
  });

  // A mono não tem consumidor garantido em toda rota (depende de rótulo na
  // viewport), então é aferida pelo registro, não pelo computado.
  test("as duas fontes registradas realmente carregam", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => document.fonts.status === "loaded");

    const loaded = await page.evaluate(() =>
      [...document.fonts]
        .filter((face) => face.status === "loaded")
        .map((face) => face.family),
    );

    expect(loaded).toContain("switzer");
    expect(loaded.some((family) => family.includes("Geist"))).toBe(true);
  });
});

/**
 * UI-13: "fonte display em largura normal".
 *
 * Os testes acima provam **identidade** (é a Switzer e ela carrega), não
 * largura, e largura é o requisito: a v2 escolheu a Clash Display supondo uma
 * extended, e o render mostrou grotesca de largura normal.
 * Uma troca por outra família ultra-wide passaria em tudo que existia antes.
 *
 * A medida é a razão entre a largura de uma cadeia fixa de teste e o corpo.
 * Aferida neste ambiente: Switzer 9.77 · Arial 10.22 · Arial Black 11.40 ·
 * Impact 7.66. A faixa abaixo aceita a grotesca normal e reprova tanto a
 * extended quanto a condensada.
 */
const RAZAO_MINIMA = 8.5;
const RAZAO_MAXIMA = 11;

test("o display tem largura normal, nem extended nem condensada (UI-13)", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const razao = await page.evaluate(() => {
    const amostra = document.createElement("span");
    amostra.textContent = "HAMBURGEFONTSIV";
    amostra.style.cssText =
      "position:absolute;visibility:hidden;white-space:nowrap;" +
      "font-size:100px;font-weight:600;font-family:var(--font-display)";
    document.body.appendChild(amostra);
    const largura = amostra.getBoundingClientRect().width;
    amostra.remove();
    return largura / 100;
  });

  expect(razao, "display condensada demais").toBeGreaterThan(RAZAO_MINIMA);
  expect(razao, "display extended: o erro da v2").toBeLessThan(RAZAO_MAXIMA);
});
