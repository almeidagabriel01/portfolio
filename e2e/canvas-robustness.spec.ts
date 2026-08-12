import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __fakeHidden?: boolean;
    __contextRestored?: boolean;
  }
}

/**
 * O canvas 2D legado saiu no T21: toda rota passou a ter a mesma arquitetura
 * de fundo, então o PORT-02 vale nas quatro. Os testes de ciclo de vida do
 * canvas (frameloop, aba oculta, contexto perdido) não dependem de rota: vão
 * de uma vez só, em `ROUTE`, para não quadruplicar o tempo da suíte.
 */
const ROUTES = ["/", "/projetos", "/projetos/barbalog", "/sobre"];
const ROUTE = "/projetos";

async function frameCount(page: Page): Promise<number> {
  return page.evaluate(
    () => window.__backgroundRenderer?.info.render.frame ?? -1,
  );
}

async function waitForRenderer(page: Page) {
  await page.waitForFunction(() => Boolean(window.__backgroundRenderer));
}

test.describe("BackgroundCanvas: robustez", () => {
  // PORT-02: em toda rota, não só na que servia de palco antes do T21.
  for (const route of ROUTES) {
    test(`renderiza exatamente 1 canvas no documento em ${route}`, async ({
      page,
    }) => {
      await page.goto(route);
      await waitForRenderer(page);
      await expect(page.locator("canvas")).toHaveCount(1);
    });
  }

  // PORT-01 + PORT-02: percorrer as quatro rotas client-side não acumula
  // canvas nem troca o nó: um segundo <Canvas> só apareceria navegando.
  test("percorrer as quatro rotas mantém um único canvas, sempre o mesmo nó", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForRenderer(page);
    const primeiro = await page.evaluateHandle(
      () => window.__backgroundRenderer!.domElement,
    );

    const nav = page.getByRole("navigation", { name: "Navegação de rotas" });
    // Termina em /projetos: é de lá que sai o link para a case page.
    for (const [link, url] of [
      ["Sobre", "/sobre"],
      ["Início", "/"],
      ["Projetos", "/projetos"],
    ] as const) {
      await nav.getByRole("link", { name: link }).click();
      await page.waitForURL(url);
      await expect(page.locator("canvas")).toHaveCount(1);
    }

    // O rótulo "Ver o case" saiu da rota na fase C: quem leva à case page
    // agora é o título do card de destaque.
    await page
      .getByRole("heading", { level: 3, name: "Barbalog" })
      .getByRole("link", { name: "Barbalog" })
      .click();
    await page.waitForURL("/projetos/barbalog");
    await expect(page.locator("canvas")).toHaveCount(1);

    expect(
      await page.evaluate(
        (node) => node === window.__backgroundRenderer?.domElement,
        primeiro,
      ),
    ).toBe(true);
  });

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
   * O painel da `Empresas` no estreito **não** pode sair do canvas fixo: o
   * recorte do `<View>` é calculado na main thread e descola do elemento
   * durante o scroll de toque, que é do compositor. A prova estrutural é a
   * posição do nó: canvas próprio dentro da seção, e não só o fixo lá em cima.
   */
  test.describe("no estreito", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("o campo da Empresas tem canvas próprio dentro da seção", async ({
      page,
    }) => {
      await page.goto("/");
      await waitForRenderer(page);
      const canvasDoPainel = page.locator(
        'section[aria-labelledby="empresas"] canvas',
      );
      await expect(canvasDoPainel).toHaveCount(1);
      expect(
        await canvasDoPainel.evaluate(
          (node) => node === window.__backgroundRenderer?.domElement,
        ),
      ).toBe(false);
    });
  });

  // No largo o painel volta ao `<View>`: um segundo canvas aqui seria regressão
  // do AD-002.
  test("no largo a Empresas não monta canvas próprio", async ({ page }) => {
    await page.goto("/");
    await waitForRenderer(page);
    await expect(
      page.locator('section[aria-labelledby="empresas"] canvas'),
    ).toHaveCount(0);
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
        await page.evaluate(() => window.__backgroundRenderer?.getPixelRatio()),
      ).toBe(2);
    });
  });
});
