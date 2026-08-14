import { expect, test, type Page } from "@playwright/test";

const NAV = { name: "Navegação de rotas" };

interface AnimacaoVista {
  pseudo: string;
  nome: string;
  duracao: number;
}

declare global {
  interface Window {
    __vt?: { quadros: number; vistas: AnimacaoVista[] };
  }
}

function routeLink(page: Page, name: string) {
  return page.getByRole("navigation", NAV).getByRole("link", { name });
}

async function routeState(page: Page) {
  return page.evaluate(() => window.__routeState?.());
}

/**
 * Arma a sonda que mede a transição, e ela tem de ser armada **antes** do
 * gesto.
 *
 * O que anima numa view transition são **pseudo-elementos**, não nós do DOM:
 * `getComputedStyle` sobre `<main>` mede zero o tempo inteiro. E a transição
 * não deixa rastro depois de terminar: amostrar depois do clique também mede
 * zero. Os dois zeros são indistinguíveis de "não animou", que é o número que
 * estes testes existem para reprovar (AD-031). Daí o contador de quadros:
 * sonda que não rodou é erro de teste, não defeito de produção.
 */
/**
 * `ms` é a janela de amostragem, e ela precisa cobrir **o commit mais lento**,
 * não o típico. O default subiu de 3s para 9s quando a fase C pôs campo WebGL
 * em três rotas e iframes na lista: sob a suíte cheia o payload da rota nova
 * passou a chegar depois dos 3s, a sonda já tinha parado, e `esperarTransicao`
 * ficava esperando um registro que ninguém mais ia escrever.
 */
async function armarSonda(page: Page, ms = 9000) {
  await page.evaluate((limite) => {
    const estado = { quadros: 0, vistas: [] as AnimacaoVista[] };
    window.__vt = estado;
    const t0 = performance.now();
    const laco = () => {
      estado.quadros += 1;
      for (const animacao of document.getAnimations()) {
        const efeito = animacao.effect;
        // `pseudoElement` mora no `KeyframeEffect`, não no `AnimationEffect`.
        const pseudo = efeito instanceof KeyframeEffect ? efeito.pseudoElement : null;
        if (!efeito || !pseudo) continue;
        const nome = (animacao as CSSAnimation).animationName ?? "?";
        if (estado.vistas.some((v) => v.pseudo === pseudo && v.nome === nome))
          continue;
        estado.vistas.push({
          pseudo,
          nome,
          duracao: Number(efeito.getComputedTiming().duration),
        });
      }
      if (performance.now() - t0 < limite) requestAnimationFrame(laco);
    };
    requestAnimationFrame(laco);
  }, ms);
}

async function lerSonda(page: Page) {
  const sonda = await page.evaluate(() => window.__vt);
  if (!sonda) throw new Error("a sonda não foi armada");
  if (sonda.quadros === 0)
    throw new Error("a sonda não chegou a rodar um quadro: teste, não produção");
  return sonda.vistas;
}

/** Nenhum pseudo-elemento animando. */
async function semPseudosAnimando(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) => !(a.effect instanceof KeyframeEffect && a.effect.pseudoElement),
      ),
  );
}

/**
 * Espera a transição **começar** e só então terminar.
 *
 * Esperar só o fim é a armadilha do AD-031 nesta área, e ela é traiçoeira: o
 * commit da rota leva ~400ms, e durante esse intervalo "nenhum pseudo-elemento
 * animando" é **verdade**, porque a transição ainda não nasceu. O teste media
 * o vazio e reprovava a produção por um defeito dele. O primeiro sinal tem de
 * ser a transição existindo; se ela nunca existir, este `waitForFunction`
 * estoura, que é a reprovação certa.
 */
async function esperarTransicao(page: Page) {
  await page.waitForFunction(() => (window.__vt?.vistas.length ?? 0) > 0);
  await semPseudosAnimando(page);
}

/**
 * O gesto medido em navegador em 2026-08-11, nos dois viewports: a página nova
 * sobe de baixo e a antiga desbota crescendo, **800ms** os dois.
 *
 * A duração é a asserção que mais paga: `--duration` é declarado sem unidade no
 * `<html>`, e sem o `* 1s` no `calc()` a declaração de `animation` inteira é
 * descartada em silêncio. O gesto vira o crossfade default de 250ms do browser:
 * estado final idêntico, e nada mais no repo notaria.
 */
const GESTO: AnimacaoVista[] = [
  { pseudo: "::view-transition-old(root)", nome: "pagina-sai", duracao: 800 },
  { pseudo: "::view-transition-new(root)", nome: "pagina-entra", duracao: 800 },
];

test.describe("Transição de rota (view transitions)", () => {
  // PORT-09
  test("o store registra previous e current ao navegar", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__routeState));
    expect((await routeState(page))?.pathname).toEqual({
      current: "/",
      previous: null,
    });

    await routeLink(page, "Projetos").click();
    await page.waitForURL("/projects");
    await page.waitForFunction(
      () => window.__routeState?.().pathname.current === "/projects",
    );

    expect((await routeState(page))?.pathname).toEqual({
      current: "/projects",
      previous: "/",
    });
  });

  // Controle positivo: o gesto existe, e é o gesto medido.
  test("a página nova sobe de baixo enquanto a antiga desbota crescendo", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__routeState));
    await armarSonda(page);

    await routeLink(page, "Projetos").click();
    await page.waitForURL("/projects");
    await esperarTransicao(page);

    const vistas = await lerSonda(page);
    for (const esperada of GESTO) expect(vistas).toContainEqual(esperada);

    // O header **não** desliza junto: com `view-transition-name` próprio ele
    // sai do snapshot do root e ganha grupo separado.
    expect(vistas.some((v) => v.pseudo.includes("(header)"))).toBe(true);
  });

  // PORT-10
  test("nada intercepta o ponteiro depois da transição", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForFunction(() => Boolean(window.__routeState));
    await armarSonda(page);

    await routeLink(page, "Início").click();
    await page.waitForURL("/");
    await esperarTransicao(page);

    await page.waitForFunction(
      () => window.__routeState?.().transition.active === false,
    );

    // A prova prática: um link continua clicável depois da transição.
    await routeLink(page, "Projetos").click();
    await expect(page).toHaveURL("/projects");
  });

  // PORT-11: a AC diz "voltar/avançar", então as duas direções contam.
  //
  // Este é o caminho que o `popstate` obriga a suspender o render: o browser já
  // navegou e o App Router comita sozinho. Se a rota nova pintar antes da foto,
  // o "old" da transição **é a página nova** e o gesto some sem erro nenhum:
  // o teste continuaria verde num crossfade de nada com nada.
  test("voltar e avançar no browser rodam a mesma transição de um link", async ({
    page,
  }) => {
    await page.goto("/");
    // Sem esperar a hidratação, o clique vira navegação de documento e leva a
    // sonda junto (AD-031: alvo ausente lido como defeito).
    await page.waitForFunction(() => Boolean(window.__routeState));
    await armarSonda(page);
    await routeLink(page, "Projetos").click();
    await page.waitForURL("/projects");
    await esperarTransicao(page);

    await armarSonda(page);
    await page.goBack();
    await page.waitForURL("/");
    await esperarTransicao(page);

    for (const esperada of GESTO)
      expect(await lerSonda(page)).toContainEqual(esperada);
    expect((await routeState(page))?.pathname).toEqual({
      current: "/",
      previous: "/projects",
    });

    await armarSonda(page);
    await page.goForward();
    await page.waitForURL("/projects");
    await esperarTransicao(page);

    for (const esperada of GESTO)
      expect(await lerSonda(page)).toContainEqual(esperada);
    expect((await routeState(page))?.pathname).toEqual({
      current: "/projects",
      previous: "/",
    });
  });

  // A transição fica desligada indo para o detalhe de projeto, e o card da
  // home é quem dispara esse par.
  test("o card da home indo para o case não transiciona", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__routeState));

    const card = page
      .locator('#conteudo a[href^="/projects/"]')
      .first();
    if ((await card.count()) === 0)
      throw new Error("nenhum card da home aponta para um case");

    await armarSonda(page, 1500);
    await card.click();
    await page.waitForURL(/\/projects\/.+/);
    await page.waitForTimeout(1200);

    expect(await lerSonda(page)).toEqual([]);
  });

  // PORT-12
  test("com reduced-motion a troca de rota é um corte", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/projects");
    await page.waitForFunction(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    await page.waitForFunction(() => Boolean(window.__routeState));

    // Sem nome no root não há snapshot, e sem snapshot não há o que animar.
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).viewTransitionName,
      ),
    ).toBe("none");

    await armarSonda(page, 1500);
    await routeLink(page, "Início").click();
    await page.waitForURL("/");
    await page.waitForTimeout(1200);

    expect(await lerSonda(page)).toEqual([]);
    // Sem janela de transição: o store nunca marca `active` na troca.
    expect((await routeState(page))?.transition.active).toBe(false);
  });

  test("navegação rápida não deixa transição pendurada", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.__routeState));
    await armarSonda(page, 6000);

    await routeLink(page, "Projetos").click();
    await routeLink(page, "Início").click();
    await routeLink(page, "Projetos").click();
    await page.waitForURL("/projects");

    // `vt.finished` rejeita quando uma transição é atropelada pela seguinte, e
    // é isso que fecha o `active`: um cronômetro fixo erraria sob carga.
    await esperarTransicao(page);
    await page.waitForFunction(
      () => window.__routeState?.().transition.active === false,
    );
    await expect(routeLink(page, "Início")).toBeVisible();
  });
});
