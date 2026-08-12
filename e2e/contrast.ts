import type { Page } from "@playwright/test";

/** WCAG 2.x: luminância relativa de um canal sRGB 0–255. */
function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Compõe uma cor com alfa sobre um fundo opaco, em sRGB 0–255, que é onde o
 * browser compõe.
 *
 * Sem isto, texto translúcido era medido como se fosse opaco: a v4 usava só
 * cores chapadas e o defeito não aparecia, mas a paleta é cheia
 * de `ink/8`, `/20`, `/50`. Um `#f5e9df` a 55% sobre preto é `#87807b`, não
 * `#f5e9df`: a diferença entre 5.4:1 e 17.6:1.
 */
export function compor(
  [r, g, b, a]: [number, number, number, number],
  fundo: [number, number, number],
): [number, number, number] {
  return [
    a * r + (1 - a) * fundo[0],
    a * g + (1 - a) * fundo[1],
    a * b + (1 - a) * fundo[2],
  ];
}

/**
 * O pixel de fundo mais claro da viewport, medido no que o shader realmente
 * desenhou, não no valor teórico do GLSL.
 *
 * Esconde o conteúdo, fotografa e decodifica o PNG dentro da própria página
 * (o `img-src data:` da CSP permite). O fundo é o mesmo canvas fullscreen em
 * qualquer ponto da tela, então o máximo global é o pior caso para qualquer
 * texto sobreposto.
 */
/** Retângulo em coordenadas de viewport, como o `getBoundingClientRect()` devolve. */
export interface Retangulo {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Luminância do pixel de fundo mais claro **dentro de cada retângulo** da
 * viewport, medida no que foi de fato desenhado.
 *
 * Esconde só o *conteúdo* de `main` (todos os seus filhos), nunca o `main` em
 * si: o fundo chapado do UI-11 é do próprio `main`, e escondê-lo faria a
 * medição enxergar as partículas atrás dele. Nenhuma seção jamais leria como
 * preta e a garantia ficaria sem guarda.
 *
 * `main > *`, não `main > section`: em `/sobre` o `<h1>` é filho direto de
 * `main`. Com o seletor restrito ele continuava visível na captura e os pixels
 * do próprio título entravam na conta como se fossem fundo: todo texto ao
 * redor mediria contraste contra si mesmo.
 *
 * Uma captura só para todos os retângulos: o fundo é o mesmo em toda a tela
 * naquele instante, então recortar da mesma imagem é equivalente a fotografar
 * cada elemento e muito mais barato.
 */
export interface FundoMedido {
  /** Luminância relativa do pixel mais claro do retângulo. `-1` = não medido. */
  luminancia: number;
  /** sRGB desse mesmo pixel, necessário para compor texto translúcido. */
  rgb: [number, number, number];
}

export async function backgroundLuminanceIn(
  page: Page,
  rects: Retangulo[],
): Promise<FundoMedido[]> {
  if (rects.length === 0) return [];

  const mascara = await page.addStyleTag({
    /**
     * Esconde o conteúdo para fotografar **o que está atrás dele** — mas o
     * campo tem de continuar aparecendo, porque é justamente contra ele que o
     * texto do hero é cobrado.
     *
     * Antes o `<canvas>` ficava fora do `main`, num nó fixo do `<body>`, e
     * escapava da máscara sozinho. Agora cada campo mora dentro da própria
     * seção (ver `CanvasDoCampo`), então `main > *` o apagava junto e o hero
     * passava a ser medido contra preto chapado: contraste inflado, exatamente
     * o que a guarda `fundoMaisClaro` de `home.spec` denuncia. `visibility`
     * é herdada e o filho pode reverter, então basta devolver o canvas.
     */
    content:
      "header, footer, main > * { visibility: hidden !important; } canvas { visibility: visible !important; }",
  });
  const png = (await page.screenshot()).toString("base64");
  await mascara.evaluate((node) => (node as Element).remove());

  return page.evaluate(
    async ({ base64, rects }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();

      const surface = document.createElement("canvas");
      surface.width = image.width;
      surface.height = image.height;
      const context = surface.getContext("2d")!;
      context.drawImage(image, 0, 0);

      // A captura pode vir em outra densidade que a viewport CSS.
      const escala = image.width / window.innerWidth;
      const toLinear = (value: number) => {
        const srgb = value / 255;
        return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
      };

      return rects.map((rect) => {
        // Recorta ao que está de fato na tela: fora dela não há pixel medido.
        const esquerda = Math.max(0, Math.floor(rect.x * escala));
        const topo = Math.max(0, Math.floor(rect.y * escala));
        const direita = Math.min(
          image.width,
          Math.ceil((rect.x + rect.width) * escala),
        );
        const base = Math.min(
          image.height,
          Math.ceil((rect.y + rect.height) * escala),
        );
        if (direita <= esquerda || base <= topo) {
          return { luminancia: -1, rgb: [0, 0, 0] as [number, number, number] };
        }

        const { data } = context.getImageData(
          esquerda,
          topo,
          direita - esquerda,
          base - topo,
        );
        let brightest = 0;
        let rgb: [number, number, number] = [0, 0, 0];
        for (let index = 0; index < data.length; index += 4) {
          const luminance =
            0.2126 * toLinear(data[index]) +
            0.7152 * toLinear(data[index + 1]) +
            0.0722 * toLinear(data[index + 2]);
          if (luminance > brightest) {
            brightest = luminance;
            // O mesmo pixel serve de fundo para compor o texto translúcido:
            // é o pior caso dos dois lados, então a medição segue conservadora.
            rgb = [data[index], data[index + 1], data[index + 2]];
          }
        }
        return { luminancia: brightest, rgb };
      });
    },
    { base64: png, rects },
  );
}

/**
 * O piso de contraste que o WCAG AA (1.4.3) de fato exige para um texto.
 *
 * A regra tem **dois** pisos, não um: 4.5:1 para texto normal e 3:1 para
 * "large-scale text", definido como ≥ 18pt, ou ≥ 14pt em negrito (24px e
 * 18.66px a 96dpi). Cobrar 4.5:1 de tudo era uma regra inventada, mais dura que
 * a norma, e era ela que proibia o acento saturado nos títulos de
 * display, onde ele é legítimo.
 */
export function pisoWcagAA(fontSize: number, fontWeight: number): number {
  const grande = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
  return grande ? 3 : 4.5;
}

export interface FalhaDeContraste {
  texto: string;
  cor: string;
  fontSize: number;
  fontWeight: number;
  exigido: number;
  medido: number;
}

export interface RelatorioDeContraste {
  falhas: FalhaDeContraste[];
  avaliados: number;
  /** Maior luminância de fundo medida: o controle positivo de cada rota. */
  fundoMaisClaro: number;
  /**
   * Alvos que saíram do DOM antes de serem medidos. Não é silêncio: a headline
   * do hero gira a cada 5s e leva os `<span>` dela junto, então um número
   * pequeno aqui é esperado. Um número grande diz que a página está trocando
   * conteúdo debaixo da medição.
   */
  saidas: number;
}

/**
 * Todo texto de `main` medido contra **o que está atrás dele**, com o piso do
 * WCAG que corresponde ao tamanho e peso de cada elemento.
 *
 * Duas correções sobre a versão anterior, e as duas importam:
 *
 * 1. O piso é por elemento (`pisoWcagAA`), não um 4.5:1 chapado.
 * 2. O fundo é o do retângulo do elemento, não o pixel mais claro da viewport
 *    inteira. Depois do UI-11 quase todo texto está sobre `#000000` opaco e só
 *    o hero fica sobre o campo; medir tudo contra o pior pixel da tela cobrava
 *    de um parágrafo no rodapé o contraste de uma partícula a 800px dele,
 *    coisa que o WCAG não pede e que nenhum leitor experimenta.
 *
 * Sem deduplicar por cor: com piso por elemento, a mesma cor em corpo e em
 * display é medida contra duas barras diferentes, e reduzir a um `Set` de cores
 * apagaria justamente o caso pequeno.
 */
export async function relatorioDeContraste(
  page: Page,
): Promise<RelatorioDeContraste> {
  const SELETOR =
    "main h1, main h2, main h3, main p, main a, main span, main li";

  /**
   * **Sexta cegueira: índice posicional não sobrevive a DOM que muda sozinho.**
   *
   * O lote era resolvido por posição (`querySelectorAll(...).filter(...)[i]`) em
   * **três** varreduras, e o comentário antigo dizia que repetir o mesmo
   * predicado bastava para mantê-las em sincronia. Basta enquanto a página não
   * mexe na árvore, e o hero mexe: a headline gira a cada 5s dentro de um
   * `AnimatePresence`, os `<span>` de palavra saem e entram, e o lote muda de
   * tamanho **entre** as varreduras. Todos os índices depois do hero deslizam,
   * cada elemento passa a ser medido com o piso e a cor de outro, e quando a
   * lista encolhe o script morre num `getBoundingClientRect` de `undefined`.
   * Foi assim que a `/sobre` quebrou ao ganhar o hero. E a home, que tem o
   * mesmo hero, vinha passando por sorte de temporização.
   *
   * A identidade agora é um atributo carimbado no próprio nó. Nada é resolvido
   * por posição, e alvo que sai do DOM é **contado**, não confundido com o
   * vizinho.
   *
   * `getClientRects().length === 0` continua excluindo `display:none`. Sem isso,
   * um bloco `md:hidden` era coletado com caixa 0×0, nunca cabia numa captura e
   * o laço morria com "nenhum elemento mediável". Texto escondido por `sr-only`
   * tem caixa de 1×1 e continua sendo medido.
   */
  const alvos = await page.evaluate((seletor) => {
    const encontrados = [];
    let seq = 0;
    for (const el of document.querySelectorAll(seletor)) {
      if ((el.textContent ?? "").trim().length === 0) continue;
      if (el.getClientRects().length === 0) continue;
      const id = seq++;
      el.setAttribute("data-contraste", String(id));
      const estilo = getComputedStyle(el);
      encontrados.push({
        id,
        texto: (el.textContent ?? "").trim().slice(0, 48),
        fontSize: Number.parseFloat(estilo.fontSize),
        fontWeight: Number(estilo.fontWeight),
      });
    }
    return encontrados;
  }, SELETOR);

  const falhas: FalhaDeContraste[] = [];
  let avaliados = 0;
  let fundoMaisClaro = 0;
  let saidas = 0;

  /** Os carimbos que ainda existem na árvore. */
  const naArvore = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("[data-contraste]")].map((el) =>
        Number(el.getAttribute("data-contraste")),
      ),
    );

  const pendentes = new Set(alvos.map((alvo) => alvo.id));
  // Teto de segurança: cada volta mede pelo menos um elemento, então o laço
  // termina. O limite existe para falhar alto em vez de girar para sempre se
  // essa invariante quebrar.
  for (let volta = 0; pendentes.size > 0 && volta <= alvos.length; volta++) {
    // Quem saiu do DOM sai da fila. Sem isto o alvo seguinte seria resolvido
    // por um carimbo que não existe mais, e o laço giraria até o teto.
    const vivos = new Set(await naArvore());
    for (const id of pendentes) {
      if (!vivos.has(id)) {
        pendentes.delete(id);
        saidas++;
      }
    }
    if (pendentes.size === 0) break;

    const alvo = [...pendentes][0];

    // Centraliza o primeiro pendente e mede **todos** os que couberem na tela
    // com ele: uma captura serve para o lote inteiro.
    await page.evaluate(
      (id) => {
        const el = document.querySelector(`[data-contraste="${id}"]`)!;
        const caixa = el.getBoundingClientRect();
        // Centraliza o **meio** do elemento, não o topo: com o topo no centro,
        // qualquer bloco mais alto que meia viewport passa da borda de baixo e
        // nunca cabe inteiro numa captura.
        const destino = Math.max(
          0,
          caixa.y +
            window.scrollY +
            caixa.height / 2 -
            window.innerHeight / 2,
        );
        window.__lenis?.scrollTo(destino, { immediate: true });
        window.scrollTo(0, destino);
        /**
         * `inline: "center"` traz o elemento para o quadro também no eixo
         * **horizontal**, rolando qualquer ancestral com `overflow-x`.
         *
         * Sem isto, um slide de carrossel fora da janela devolvia retângulo
         * fora da captura e a medição morria com "fundo não medido", que é
         * pior que reprovar: parece defeito do harness e some por
         * `expect.poll` em quem só quer ver verde.
         */
        el.scrollIntoView({ block: "nearest", inline: "center" });
      },
      alvo,
    );

    /**
     * **Quinta cegueira: centralizar não termina todo reveal.**
     *
     * A regra "o alvo centralizado é sempre medido, mesmo esmaecido" existe
     * para card inativo de carrossel, que é esmaecimento **estático**. Ela
     * atropela o caso do reveal ligado a scroll cuja janela só fecha depois da
     * centralização: o bloco de contato é `h-svh` e o rótulo dele mora acima do
     * centro, então centralizar o rótulo deixa o reveal em **0,438** (medido)
     * e o texto reprovava a 1,63:1 sem nunca ter aparecido assim para ninguém.
     *
     * O empurrão é o que faltava: enquanto a opacidade efetiva do alvo estiver
     * subindo e ainda abaixo de 0,95, rola mais um pedaço de viewport. Quatro
     * passos cobrem qualquer janela de reveal desta página, e o laço para
     * sozinho quando o número deixa de subir: reveal que não fecha continua
     * sendo medido como está, que é o comportamento antigo.
     */
    let anterior = -1;
    for (let empurrao = 0; empurrao < 4; empurrao++) {
      const efetiva = await page.evaluate((id) => {
        const el = document.querySelector(`[data-contraste="${id}"]`);
        if (!el) return 1;
        let acumulada = 1;
        let no: Element | null = el;
        while (no) {
          acumulada *= Number(getComputedStyle(no).opacity);
          no = no.parentElement;
        }
        return acumulada;
      }, alvo);
      if (efetiva >= 0.95 || efetiva <= anterior) break;
      anterior = efetiva;
      await page.evaluate(() => {
        const destino = Math.round(window.scrollY + window.innerHeight * 0.35);
        window.__lenis?.scrollTo(destino, { immediate: true });
        window.scrollTo(0, destino);
      });
      await page.waitForTimeout(350);
    }
    /**
     * 500ms basta porque a regra de "só medir assentado" logo abaixo já
     * protege de animação em curso: quem ainda não chegou fica pendente e
     * ganha outra volta. Esperar 1,2s aqui para cobrir a entrada mais longa
     * (0,9s) multiplicava por volta e estourava o timeout do teste.
     */
    await page.waitForTimeout(500);

    /**
     * **Sétima cegueira: o alvo centralizado é medido mesmo esmaecido, e há
     * esmaecimento que não é estático.**
     *
     * A regra existe para card inativo de carrossel, que fica a 0,6 para
     * sempre: esperar por ele giraria a fila sem fim. Mas ela atropela
     * animação em **relógio**: a headline do hero reentra a cada 5s
     * (`opacity 0→1` em 2s, com blur e escala), e centralizá-la pega
     * regularmente o meio da entrada. Medido na `/projetos`: 2,29:1 num estado
     * que dura milissegundos e que ninguém lê. O empurrão acima não resolve:
     * ele rola, e aqui não há scroll nenhum a dar.
     *
     * A espera é curta e **limitada**: quem vai assentar assenta dentro dela;
     * quem é esmaecido estático estoura o teto e é medido como está, que é o
     * comportamento antigo preservado inteiro.
     */
    for (let espera = 0; espera < 12; espera++) {
      const efetiva = await page.evaluate((id) => {
        const el = document.querySelector(`[data-contraste="${id}"]`);
        if (!el) return 1;
        let acumulada = 1;
        let no: Element | null = el;
        while (no) {
          acumulada *= Number(getComputedStyle(no).opacity);
          no = no.parentElement;
        }
        return acumulada;
      }, alvo);
      if (efetiva >= 0.95) break;
      await page.waitForTimeout(250);
    }

    const visiveis = await page.evaluate(
      ({ ids, alvo }) => {
        return ids
          .map((id) => {
            const el = document.querySelector(`[data-contraste="${id}"]`);
            // Saiu do DOM entre a sincronização e agora. A volta seguinte o
            // tira da fila; aqui ele só não entra na captura.
            if (!el) return null;
            const caixa = el.getBoundingClientRect();
            /**
             * Visibilidade nos **dois** eixos.
             *
             * Só o eixo vertical era conferido. Um slide de carrossel rolado
             * para fora tem `y` perfeitamente dentro da janela e `x` a mil
             * pixels de distância: passava no filtro, entrava no lote, e a
             * captura não tinha pixel nenhum naquela coordenada: a medição
             * morria com "fundo não medido" em vez de medir.
             *
             * Reprovado aqui, o elemento fica pendente e ganha a própria volta,
             * onde o `scrollIntoView({ inline: "center" })` traz o scroller
             * horizontal junto.
             */
            const inteiro =
              caixa.y >= 0 &&
              caixa.y + caixa.height <= window.innerHeight &&
              caixa.x >= 0 &&
              caixa.x + caixa.width <= window.innerWidth;
            /**
             * Um contêiner mais alto que a viewport nunca cabe inteiro numa
             * captura. Nesses casos mede-se a faixa visível com ele
             * centralizado, o máximo que uma captura alcança. Não afrouxa a
             * garantia: a cor desses elementos é a dos seus nós de texto
             * diretos, e todo descendente com texto é medido inteiro por
             * conta própria.
             */
            const altoDemais =
              caixa.height > window.innerHeight && id === alvo;
            if (!inteiro && !altoDemais) return null;

            const topo = Math.max(0, caixa.y);
            const base = Math.min(window.innerHeight, caixa.y + caixa.height);

            /**
             * Cor e opacidade lidas **agora**, com o elemento já na tela.
             *
             * Resolver isto na coleta inicial media todo mundo antes de rolar,
             * quando as animações de entrada ainda estão em `opacity: 0`, e o
             * resultado era contraste 1 para a página inteira. O estado que
             * importa é o que o visitante vê quando o elemento está visível.
             */
            const estilo = getComputedStyle(el);
            let acumulada = 1;
            let no: Element | null = el;
            while (no) {
              acumulada *= Number(getComputedStyle(no).opacity);
              no = no.parentElement;
            }

            const pixel = document.createElement("canvas");
            pixel.width = pixel.height = 1;
            const ctx = pixel.getContext("2d", { willReadFrequently: true })!;
            ctx.fillStyle = "#ff00ff";
            ctx.fillStyle = estilo.color;
            if (ctx.fillStyle === "#ff00ff" && !/ff00ff|magenta/i.test(estilo.color)) {
              throw new Error(`cor não reconhecida pelo canvas: ${estilo.color}`);
            }
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;

            return {
              id,
              x: caixa.x,
              y: topo,
              width: caixa.width,
              height: base - topo,
              cor: estilo.color,
              rgba: [r, g, b, (a / 255) * acumulada] as [
                number,
                number,
                number,
                number,
              ],
            };
          })
          .filter(
            (r): r is NonNullable<typeof r> =>
              r !== null && r.width > 0 && r.height > 0,
          );
      },
      { ids: [...pendentes], alvo },
    );

    if (visiveis.length === 0) {
      const diag = await page.evaluate((id) => {
          const el = document.querySelector(`[data-contraste="${id}"]`)!;
          const c = el.getBoundingClientRect();
          return {
            y: c.y,
            h: c.height,
            w: c.width,
            vh: window.innerHeight,
            scrollY: window.scrollY,
          };
        },
        alvo,
      );
      throw new Error(
        `nenhum elemento mediável na volta ${volta}; pendente: "${
          alvos.find((a) => a.id === alvo)?.texto
        }" ${JSON.stringify(diag)}`,
      );
    }

    const fundos = await backgroundLuminanceIn(page, visiveis);

    visiveis.forEach((rect, i) => {
      const { luminancia: fundo, rgb: fundoRgb } = fundos[i];
      const meta = alvos.find((a) => a.id === rect.id)!;
      if (fundo < 0) throw new Error(`fundo não medido: "${meta.texto}"`);

      fundoMaisClaro = Math.max(fundoMaisClaro, fundo);

      /**
       * Elemento com opacidade efetiva ~0 não está na tela: é entrada que
       * ainda não disparou, ou conteúdo deliberadamente escondido. Medir
       * contraste dele daria 1:1 e reprovaria a página inteira. Não é buraco de
       * cobertura: a partir de 0.05 tudo é medido, e é exatamente na faixa de
       * 0.45–0.8 que o esmaecimento de card inativo vive.
       */
      /**
       * Um elemento só é medido quando está no estado em que o visitante o vê.
       *
       * A medição roda em lote: centraliza um alvo e mede tudo que couber na
       * mesma captura. Isso quebra com reveal **ligado ao scroll**: medindo a
       * seção de cima, o rodapé aparece na tela com a animação dele pela
       * metade, e o que se registra é uma opacidade de passagem. Medido: o
       * e-mail do contato dava 2,21:1 a caminho, e 5,9:1 parado.
       *
       * Dois casos, duas saídas:
       * - **quase invisível** (< 0.05): não está na tela. Sai da fila.
       * - **parcialmente visível** e não é o alvo desta volta: fica pendente e
       *   ganha a própria volta, onde vai estar assentado.
       *
       * O alvo centralizado é sempre medido, mesmo esmaecido: é assim que card
       * inativo de carrossel (0.6 estático) entra na conta em vez de girar para
       * sempre na fila.
       */
      if (rect.rgba[3] < 0.05) {
        pendentes.delete(rect.id);
        return;
      }
      if (rect.rgba[3] < 0.95 && rect.id !== alvo) return;

      const exigido = pisoWcagAA(meta.fontSize, meta.fontWeight);
      const medido = contrastRatio(
        relativeLuminance(compor(rect.rgba, fundoRgb)),
        fundo,
      );
      avaliados++;
      if (medido < exigido) {
        falhas.push({
          texto: meta.texto,
          cor: rect.cor,
          fontSize: meta.fontSize,
          fontWeight: meta.fontWeight,
          exigido,
          medido: Number(medido.toFixed(2)),
        });
      }
      pendentes.delete(rect.id);
    });
  }

  if (pendentes.size > 0) {
    throw new Error(`${pendentes.size} elementos ficaram sem medição`);
  }

  return { falhas, avaliados, fundoMaisClaro, saidas };
}

export async function brightestBackgroundLuminance(page: Page): Promise<number> {
  await page.addStyleTag({
    content: "header, main, footer { visibility: hidden !important; }",
  });

  const png = (await page.screenshot()).toString("base64");

  const max = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();

    const surface = document.createElement("canvas");
    surface.width = image.width;
    surface.height = image.height;
    const context = surface.getContext("2d")!;
    context.drawImage(image, 0, 0);

    const { data } = context.getImageData(0, 0, surface.width, surface.height);
    const toLinear = (value: number) => {
      const srgb = value / 255;
      return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    };

    let brightest = 0;
    for (let index = 0; index < data.length; index += 4) {
      const luminance =
        0.2126 * toLinear(data[index]) +
        0.7152 * toLinear(data[index + 1]) +
        0.0722 * toLinear(data[index + 2]);
      if (luminance > brightest) brightest = luminance;
    }
    return brightest;
  }, png);

  return max;
}
