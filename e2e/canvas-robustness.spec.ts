import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __fakeHidden?: boolean;
    __contextRestored?: boolean;
    /** Quantas chamadas a `getContext("webgl2")` ainda devem devolver `null`. */
    __falharContexto?: number;
    /** Estado do `(hover: hover)` falso, o que o device toolbar troca. */
    __temHover?: boolean;
    __trocarHover?: (valor: boolean) => void;
  }
}

/**
 * Ciclo de vida do canvas: frameloop, aba oculta, contexto perdido. Nada disso
 * depende de rota, então vai de uma vez só em `ROUTE`, para não quadruplicar o
 * tempo da suíte. `/projects` tem exatamente **um** campo (o hero), o que torna
 * o seam `__campoRenderer` inequívoco e `document.querySelector("canvas")` o
 * canvas certo. Quantos canvas cada rota monta é assunto de
 * `canvas-persistence`.
 */
const ROUTE = "/projects";

async function frameCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__campoRenderer?.info.render.frame ?? -1);
}

async function waitForRenderer(page: Page) {
  await page.waitForFunction(() => Boolean(window.__campoRenderer));
}

/**
 * Fração de pixels **âmbar** do hero, de 0 a 1.
 *
 * Contadores de quadro não servem aqui: o laço pode estar a correr às mil
 * maravilhas e a pintar preto, que é precisamente o modo de falha desta
 * família de defeitos. O que se mede é o que se vê.
 *
 * O critério é `r - b`, e não brilho: a headline do hero é creme
 * (`r ≈ g ≈ b`) e a do campo é `#d09332`, que separa os dois canais por 158.
 * Medir brilho contava a headline, que sozinha passa qualquer limiar razoável
 * — a primeira versão deste teste passava dos dois lados do controle negativo
 * por causa disso. Esconder o DOM como faz `contrast.ts` também não serve
 * aqui: `visibility: hidden` na `<section>` tira dela o direito a
 * `locator.screenshot()`.
 *
 * O `drawImage` sai do PNG da captura e não do `<canvas>` vivo: sem
 * `preserveDrawingBuffer` o buffer já foi apresentado e ler dele devolve
 * transparente.
 */
async function coberturaDoHero(page: Page): Promise<number> {
  const base64 = (
    await page.locator('section[data-name="hero"]').screenshot()
  ).toString("base64");
  return page.evaluate(async (png) => {
    const imagem = new Image();
    imagem.src = `data:image/png;base64,${png}`;
    await imagem.decode();
    const superficie = document.createElement("canvas");
    superficie.width = imagem.width;
    superficie.height = imagem.height;
    const ctx = superficie.getContext("2d")!;
    ctx.drawImage(imagem, 0, 0);
    const { data } = ctx.getImageData(0, 0, imagem.width, imagem.height);
    let ambar = 0;
    let total = 0;
    // Um pixel a cada 16: a grelha é densa, e varrer tudo custa segundos.
    for (let i = 0; i < data.length; i += 4 * 16) {
      total++;
      if (data[i] - data[i + 2] > 40) ambar++;
    }
    return ambar / total;
  }, base64);
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

  /**
   * **Re-render da seção não pode parar o campo.**
   *
   * O `<Canvas>` do R3F reconfigura o store a cada render seu, num efeito de
   * layout **sem lista de dependências**, e reimpõe a prop `frameloop` — que
   * aqui é `never`, porque quem manda no loop é o `PortaoDeFrames`. Enquanto o
   * portão comparava com o último modo que ele próprio tinha aplicado, achava
   * que não havia nada a fazer e o campo ficava parado para sempre.
   *
   * No celular isso aparecia sem ninguém tocar em nada: a barra de endereço
   * recolhe ao rolar, `innerHeight` muda, o `Hero` re-renderiza. `setViewportSize`
   * é o mesmo gatilho, de forma determinística.
   */
  test("re-renderizar a seção não congela o campo", async ({ page }) => {
    await page.goto(ROUTE);
    await waitForRenderer(page);
    await page.waitForFunction(
      () => (window.__campoRenderer?.info.render.frame ?? 0) > 0,
    );

    await page.setViewportSize({ width: 1281, height: 720 });
    await page.waitForTimeout(400);

    const antes = await frameCount(page);
    await page.waitForTimeout(600);
    expect(await frameCount(page)).toBeGreaterThan(antes);
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
   * **A recriação que falha uma vez não pode ser o fim do campo.**
   *
   * Ligar o *device toolbar* do DevTools larga os contextos de toda a página e
   * reinicia o processo de GPU: a recriação imediata apanha a GPU ainda a
   * levantar-se e `getContext` devolve `null` (ou um contexto já perdido). Um
   * `<canvas>` sem contexto não emite mais `webglcontextlost`, que é o único
   * gatilho que troca a `key` — sem retentativa, o campo do hero desaparecia e
   * não voltava mais, sem erro nenhum em consola.
   *
   * O gatilho aqui é o mecanismo, não o DevTools: o `Emulation` do CDP não
   * chega a perder contexto nenhum em *headless*, e não é ele que está em
   * causa. A falha forçada é `getContext` a devolver `null` uma vez.
   */
  test("getContext a falhar depois da perda não deixa o campo preto", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...rest: unknown[]
      ) {
        if (type === "webgl2" && (window.__falharContexto ?? 0) > 0) {
          window.__falharContexto = (window.__falharContexto ?? 0) - 1;
          return null;
        }
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
    await waitForRenderer(page);
    await page.waitForFunction(() => window.__campoRevelado === true);

    // A extensão vem **antes** de armar a falha: buscá-la depois gastaria a
    // única falha na própria sonda.
    await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) throw new Error("canvas ausente");
      const gl = canvas.getContext("webgl2") as WebGL2RenderingContext | null;
      const ext = gl?.getExtension("WEBGL_lose_context");
      if (!ext) throw new Error("WEBGL_lose_context indisponível");
      window.__falharContexto = 1;
      ext.loseContext();
    });

    // O campo volta — e volta **a desenhar**, que é o que "não ficou preto"
    // quer dizer. Sem a retentativa o seam nunca reaparece.
    await page.waitForFunction(() => Boolean(window.__campoRenderer), null, {
      timeout: 5000,
    });
    const antes = await frameCount(page);
    await page.waitForTimeout(600);
    expect(await frameCount(page)).toBeGreaterThan(antes);
    /**
     * **E volta aceso, não a esmaecer do preto outra vez.**
     *
     * A revelação é gesto de chegada e o seu "já aconteceu" vive num ref de
     * componente; num local do efeito de quadros — que re-corre a cada troca de
     * `<canvas>` — a rampa recomeçava do zero e o hero ficava 2,4s preto a cada
     * perda de contexto. Medido aqui, no mesmo instante: 0,086 contra 0,009.
     */
    expect(
      await coberturaDoHero(page),
      "o campo voltou a esmaecer do preto em vez de repor o brilho",
    ).toBeGreaterThan(0.03);
    await expect(page.locator("canvas")).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  /**
   * **Trocar `(hover: hover)` não pode apagar o campo.**
   *
   * É o que o *device toolbar* do DevTools faz ao entrar e sair da emulação de
   * telemóvel, e `usarMouse` — que é essa media query — é dep do efeito de
   * criação: o renderizador é reconstruído. Um renderizador novo nasce com a
   * config de montagem, e quem tem revelação nasce **preto**; a rampa que o
   * subiria vive noutro efeito, que não re-corre, e já se dava por terminada.
   * Medido em navegador: o hero apagava na primeira troca e não voltava mais,
   * sem erro nenhum em consola e com o laço de quadros a correr normalmente.
   *
   * Por isso a asserção é sobre **pixels**, não sobre contagem de quadros: o
   * campo continuava a desenhar, só que preto.
   */
  test("trocar (hover: hover) não apaga o campo", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.__temHover = true;
      const ouvintes = new Set<(evento: { matches: boolean }) => void>();
      window.matchMedia = ((query: string) => {
        if (!query.includes("hover")) return original(query);
        return {
          media: query,
          get matches() {
            return query.includes("hover: hover")
              ? window.__temHover === true
              : window.__temHover !== true;
          },
          addEventListener: (_t: string, f: () => void) => ouvintes.add(f),
          removeEventListener: (_t: string, f: () => void) => ouvintes.delete(f),
          onchange: null,
          dispatchEvent: () => true,
        };
      }) as typeof window.matchMedia;
      window.__trocarHover = (valor: boolean) => {
        window.__temHover = valor;
        for (const ouvinte of ouvintes) ouvinte({ matches: valor });
      };
    });

    await page.goto(ROUTE);
    await waitForRenderer(page);

    /**
     * **A revelação tem de ter acabado antes da primeira troca.**
     *
     * Enquanto a rampa corre ela reescreve o brilho a cada quadro, e portanto
     * repõe sozinha o que a reconstrução apagou: o defeito só existe depois de
     * ela se dar por encerrada. Sem esperar por isto o teste passava dos dois
     * lados do controle negativo, medindo 0,084 onde o mesmo servidor dava
     * 0,008 três segundos mais tarde.
     */
    await page.waitForFunction(() => window.__campoRevelado === true);

    /**
     * O piso: com o campo pintado a cobertura âmbar do hero mede ~8,4% a
     * 1280×720; com ele apagado sobra só a palavra em destaque da headline,
     * abaixo de 1%. 3% fica longe dos dois.
     */
    const PISO = 0.03;
    expect(await coberturaDoHero(page)).toBeGreaterThan(PISO);


    for (const hover of [false, true]) {
      /**
       * **Espera o renderizador trocar de facto antes de medir**, marcando o
       * atual e esperando por um sem marca.
       *
       * Sem isto o teste é uma corrida que ele ganha sempre: logo a seguir ao
       * `__trocarHover` o React ainda não recomitou, o canvas continua a
       * mostrar o último quadro pintado, a primeira amostra do `poll` passa e o
       * teste segue em frente. Passava dos dois lados do controle negativo.
       *
       * De caminho é o controle positivo do gatilho: se a troca de media query
       * deixasse de reconstruir o campo, isto expira em vez de passar por
       * vacuidade.
       */
      await page.evaluate(() => {
        (window.__campoRenderer as { __visto?: boolean }).__visto = true;
      });
      await page.evaluate((v) => window.__trocarHover?.(v), hover);
      await page.waitForFunction(() => {
        const atual = window.__campoRenderer as
          | { __visto?: boolean }
          | undefined;
        return Boolean(atual) && atual!.__visto !== true;
      });

      /**
       * **Deixa o renderizador novo pintar antes de medir, e mede uma vez só.**
       *
       * `expect.poll(...).toBeGreaterThan()` passa na primeira amostra que
       * satisfaz — e a primeira amostra sai antes do primeiro quadro do
       * renderizador novo, com o canvas ainda a mostrar o último quadro do
       * antigo. Medido: 0,084 no `poll` contra 0,008 um segundo e meio depois,
       * no mesmo servidor. Uma asserção que só pode passar cedo demais é uma
       * asserção que passa sempre.
       */
      const base = await frameCount(page);
      await page.waitForFunction(
        (b) => (window.__campoRenderer?.info.render.frame ?? 0) > b + 5,
        base,
      );
      expect(
        await coberturaDoHero(page),
        `campo apagado depois de (hover: hover) = ${hover}`,
      ).toBeGreaterThan(PISO);
    }

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
        ["Sobre", "/about", 1],
        ["Início", "/", 2],
        ["Projetos", "/projects", 1],
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
      await page.waitForURL("/projects/barbalog");
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
