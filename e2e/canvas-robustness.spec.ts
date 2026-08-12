import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __fakeHidden?: boolean;
    __contextRestored?: boolean;
  }
}

/**
 * Ciclo de vida do canvas: frameloop, aba oculta, contexto perdido. Nada disso
 * depende de rota, então vai de uma vez só em `ROUTE`, para não quadruplicar o
 * tempo da suíte. `/projetos` tem exatamente **um** campo (o hero), o que torna
 * o seam `__campoRenderer` inequívoco e `document.querySelector("canvas")` o
 * canvas certo. Quantos canvas cada rota monta é assunto de
 * `canvas-persistence`.
 */
const ROUTE = "/projetos";

async function frameCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__campoRenderer?.info.render.frame ?? -1);
}

async function waitForRenderer(page: Page) {
  await page.waitForFunction(() => Boolean(window.__campoRenderer));
}

test.describe("Canvas do campo: robustez", () => {
  // PORT-04
  test("sem WebGL: nenhum canvas, conteúdo intacto e console limpo", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...rest: unknown[]
      ) {
        if (type === "webgl" || type === "webgl2" || type === "experimental-webgl")
          return null;
        return (
          original as (
            this: HTMLCanvasElement,
            t: string,
            ...r: unknown[]
          ) => unknown
        ).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });

    await page.goto(ROUTE);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  // Controle positivo do PORT-03: sem a asserção abaixo, "a contagem não subiu"
  // passaria mesmo se o contador estivesse quebrado ou o canvas nunca montasse.
  test("com movimento permitido: o loop de render avança", async ({ page }) => {
    await page.goto(ROUTE);
    await waitForRenderer(page);
    const before = await frameCount(page);
    await page.waitForTimeout(600);
    expect(await frameCount(page)).toBeGreaterThan(before);
  });

  // PORT-03. `page.emulateMedia` e não `test.use({ reducedMotion })`: no
  // Playwright 1.62 a opção de contexto não chega ao `matchMedia` da página
  // (verificado: a media query continua devolvendo `false`).
  test("com prefers-reduced-motion: reduce o loop de render fica parado", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(ROUTE);
    await waitForRenderer(page);
    expect(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    // Deixa o efeito do hook aplicar o frameloop antes de amostrar.
    await page.waitForTimeout(300);
    const first = await frameCount(page);
    await page.waitForTimeout(600);
    expect(await frameCount(page)).toBe(first);
  });

  test("aba oculta pausa o loop e voltar a exibir retoma", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => window.__fakeHidden === true,
      });
    });

    await page.goto(ROUTE);
    await waitForRenderer(page);

    await page.evaluate(() => {
      window.__fakeHidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
    });

    /**
     * Espera o loop **parar de verdade** em vez de cronometrar 300ms.
     *
     * O `frameloop="never"` só vale depois de o React comitar o estado de
     * visibilidade, e sob carga esse commit chega depois dos 300ms: a linha de
     * base era tirada com o loop ainda vivo e os dois quadros seguintes
     * apareciam como "não pausou". Mesmo erro do AD-031: o sinal é o estado,
     * não o relógio. Ficou visível quando a fase C deu hero com campo WebGL a
     * três das quatro rotas e a suíte passou a disputar GPU.
     */
    let paused = await frameCount(page);
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      await page.waitForTimeout(150);
      const agora = await frameCount(page);
      if (agora === paused) break;
      paused = agora;
    }

    // E fica parado: é isto que o teste existe para provar.
    await page.waitForTimeout(600);
    expect(await frameCount(page)).toBe(paused);

    await page.evaluate(() => {
      window.__fakeHidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(600);
    expect(await frameCount(page)).toBeGreaterThan(paused);
  });

  test("perder o contexto WebGL não deixa a tela preta", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(ROUTE);
    await waitForRenderer(page);

    // `restoreContext()` só volta se o `webglcontextlost` tiver sido cancelado.
    // O evento de restauração é a prova de que ele foi.
    await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) throw new Error("canvas ausente");
      canvas.addEventListener("webglcontextrestored", () => {
        window.__contextRestored = true;
      });
      const gl = (canvas.getContext("webgl2") ??
        canvas.getContext("webgl")) as WebGLRenderingContext | null;
      const ext = gl?.getExtension("WEBGL_lose_context");
      if (!ext) throw new Error("WEBGL_lose_context indisponível");
      ext.loseContext();
      setTimeout(() => ext.restoreContext(), 50);
    });

    await page.waitForFunction(() => window.__contextRestored === true);
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });

  /**
   * O estreito é onde o defeito aparecia (ver `CanvasDoCampo`), e é onde o
   * painel da `Entregas` **não** deve existir: ele é `hidden md:flex`, e
   * `display: none` esconderia o canvas sem soltar o contexto WebGL.
   */
  test.describe("no estreito", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("a home monta o campo do hero e o da Empresas, e só", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(
        page.locator('section[data-name="hero"] canvas'),
      ).toHaveCount(1);
      await expect(
        page.locator('section[aria-labelledby="empresas"] canvas'),
      ).toHaveCount(1);
      await expect(page.locator("canvas")).toHaveCount(2);
    });

    // O mesmo ciclo de `canvas-persistence`, com o menu do estreito e com o
    // painel da `Entregas` fora da conta.
    test("navegar entre rotas não acumula canvas", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("canvas")).toHaveCount(2);

      for (const [link, url, quantos] of [
        ["Sobre", "/sobre", 1],
        ["Início", "/", 2],
        ["Projetos", "/projetos", 1],
      ] as const) {
        await page.getByRole("button", { name: "Menu" }).click();
        await page
          .locator("#menu-mobile")
          .getByRole("link", { name: link })
          .click();
        await page.waitForURL(url);
        await expect(page.locator("canvas")).toHaveCount(quantos);
      }

      await page
        .getByRole("heading", { level: 3, name: "Barbalog" })
        .getByRole("link", { name: "Barbalog" })
        .click();
      await page.waitForURL("/projetos/barbalog");
      await expect(page.locator("canvas")).toHaveCount(0);
    });
  });

  // `dpr={[1, 2]}`: em tela 3x o renderer precisa cair para 2, nunca seguir o
  // devicePixelRatio do dispositivo.
  test.describe("em tela de alta densidade", () => {
    test.use({ deviceScaleFactor: 3 });

    test("o device pixel ratio é limitado a 2", async ({ page }) => {
      await page.goto(ROUTE);
      await waitForRenderer(page);
      expect(
        await page.evaluate(() => window.devicePixelRatio),
      ).toBeGreaterThan(2);
      expect(
        await page.evaluate(() => window.__campoRenderer?.getPixelRatio()),
      ).toBe(2);
    });
  });
});
