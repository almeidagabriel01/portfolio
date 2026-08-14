import { expect, type Page } from "@playwright/test";

/**
 * SEC-16 conta **seções de página**, e devolve o `aria-labelledby` de cada uma
 * na ordem do DOM: a identidade da seção. Uma lista ordenada falha por ordem
 * trocada, coisa que um `toHaveCount` não faria.
 *
 * "Seção de página" = `<section>` dentro de `<main>` que **não** está dentro de
 * outra `<section>`.
 *
 * Era `main > section`, filho direto. Isso deixou de valer na v5: a home passou
 * a seguir a estrutura, com o hero sangrando de borda a borda e as
 * demais seções dentro de um wrapper de coluna (`main > div > section`): o
 * seletor de filho direto passou a enxergar só o hero e o teste de montagem
 * acusava cinco seções faltando que estavam lá.
 *
 * A definição por aninhamento é a intenção original e não depende de wrapper:
 * em `/projects` os grupos "Trabalho" e "Estudos" continuam de fora da contagem
 * porque moram dentro da seção da lista, que é exatamente o recorte do design.
 */
const SELETOR_DE_SECAO = "main section[aria-labelledby]";


export function pageSectionIds(page: Page) {
  return page
    .locator(SELETOR_DE_SECAO)
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => !node.parentElement?.closest("section"))
        .map((node) => node.getAttribute("aria-labelledby")),
    );
}

/**
 * Toda seção de página aponta para um título que existe e tem texto. Sem isto,
 * `aria-labelledby="fantasma"` passaria na contagem de ids acima e entregaria
 * uma região sem nome para o leitor de tela.
 */
export async function expectSectionsLabelled(page: Page, rota: string) {
  const rotulos = await page.locator(SELETOR_DE_SECAO).evaluateAll((nodes) =>
    nodes
      .filter((node) => !node.parentElement?.closest("section"))
      .map((node) => {
        const id = node.getAttribute("aria-labelledby") ?? "";
        const titulo = node.ownerDocument.getElementById(id);
        return {
          id,
          tag: titulo?.tagName ?? "",
          texto: (titulo?.textContent ?? "").trim(),
        };
      }),
  );

  for (const rotulo of rotulos) {
    expect(
      rotulo.tag,
      `${rota}: aria-labelledby="${rotulo.id}" não aponta para um título`,
    ).toMatch(/^H[1-3]$/);
    expect(
      rotulo.texto.length,
      `${rota}: o título de "${rotulo.id}" está vazio`,
    ).toBeGreaterThan(0);
  }
}

/**
 * SEC-04: telefone nenhum, em rota nenhuma, em idioma nenhum.
 *
 * Números brasileiros escritos de qualquer forma plausível: com ou sem +55,
 * com ou sem parênteses no DDD, fixo (8 dígitos) ou celular (9).
 */
export const PHONE_PATTERN =
  /(\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/;

/**
 * Controle positivo do padrão acima. Uma regex que não casa nada passa para
 * sempre e não prova coisa nenhuma: estes casos falham se ela for afrouxada.
 */
export const TELEFONES = [
  "+55 35 99999-8888",
  "(35) 3471-1234",
  "35 99999 8888",
  "3599998888",
  "+5535999998888",
];

/**
 * O outro lado: o que já está na tela e **não** pode ser confundido com
 * telefone. Sem isto, apertar a regex quebraria a suíte inteira sem explicar
 * por quê.
 */
export const NAO_TELEFONES = [
  "Jan 2021 - Dez 2025",
  "Out 2021 - Jul 2022",
  "Abr 2025 - Presente",
  "21 certificações e licenças",
  "© 2026 Gabriel Almeida Dias",
  "gabriel.dias01@outlook.com.br",
];

/**
 * A restrição do Gabriel: pode dizer que existe cliente pagante, **não** quantos.
 *
 * O `home.spec.ts` já aplica um predicado equivalente dentro da seção de
 * empresas, que é onde a afirmação nasce. Este aqui é o outro recorte (toda
 * rota, nos dois idiomas), porque uma tradução descuidada ou uma copy nova
 * podem vazar o número longe da seção que o teste do T5 vigia.
 */
export const CLIENT_COUNT_PATTERN =
  /(\d+\s*\+?\s*(clientes?|clients?))|((clientes?|clients?)\s*:?\s*\d+)|(clientes\s+pagantes)|(paying\s+clients)/i;

export const QUANTIDADES_DE_CLIENTE = [
  "12 clientes",
  "3 clients",
  "clientes: 40",
  "mais de 100 clientes",
  "clientes pagantes",
  "paying clients",
];

/** O que é legítimo e não pode disparar o alarme. */
export const NAO_SAO_QUANTIDADES = [
  "No ar, com cliente pagante.",
  "Live, with a paying client.",
  "escopo com o cliente até o deploy",
  "21 certificações e licenças",
];

/**
 * Superfície única para **todas** as proibições de conteúdo.
 *
 * Existia como detalhe interno da guarda de telefone enquanto a de contagem de
 * clientes olhava só `innerText`. A validação independente provou o custo dessa
 * assimetria: uma contagem escondida num `aria-label` ou num elemento
 * `display:none` passava pela guarda de clientes e morria na de telefone.
 *
 * As duas proibições vêm da mesma decisão do dono do site e merecem a mesma
 * força. Uma função só torna a divergência impossível, em vez de corrigida.
 */
async function coletarSuperficies(page: Page): Promise<string> {
  /**
   * Texto e atributos juntos: um dado escondido num `aria-label` ou no destino
   * de um link continua sendo um dado publicado.
   *
   * Duas exclusões, ambas por falso positivo real e nenhuma por conveniência:
   *
   * - `<script>` e amigos saem do texto. `body.textContent` percorre o conteúdo
   *   das tags de script, e o payload do Next carrega hashes de build:
   *   `67215490385` casa com qualquer padrão de telefone e não é conteúdo.
   * - Só `a[href]`. Varrer todo `[href]` pegava o `<link>` do CSS, que traz o
   *   mesmo hash.
   *
   * O que fica é o que o site publica, inclusive texto escondido por CSS, que
   * é justamente onde um telefone esquecido se esconderia.
   */
  return page.evaluate(() => {
    const copia = document.body.cloneNode(true) as HTMLElement;
    for (const node of copia.querySelectorAll(
      "script, style, template, noscript",
    )) {
      node.remove();
    }

    return [
      copia.textContent ?? "",
      ...[...document.querySelectorAll("a[href]")].map(
        (element) => element.getAttribute("href") ?? "",
      ),
      ...[...document.querySelectorAll("[aria-label]")].map(
        (element) => element.getAttribute("aria-label") ?? "",
      ),
      /**
       * `alt` entrou com o carrossel do UI-08, primeiro lugar do site a
       * publicar texto por atributo de imagem. É texto que o visitante lê
       * (literalmente, quando a imagem não carrega) e um telefone esquecido
       * ali passava por todas as proibições sem encostar em nenhuma.
       */
      ...[...document.querySelectorAll("img[alt]")].map(
        (element) => element.getAttribute("alt") ?? "",
      ),
      ...[...document.querySelectorAll("[title]")].map(
        (element) => element.getAttribute("title") ?? "",
      ),
    ].join("\n");
  });
}

export async function expectNoClientCount(page: Page, rota: string) {
  const conteudo = await coletarSuperficies(page);

  expect(
    conteudo.match(CLIENT_COUNT_PATTERN)?.[0] ?? null,
    `quantidade de clientes publicada em ${rota}`,
  ).toBeNull();
}

export async function expectNoPhone(page: Page, rota: string) {
  const conteudo = await coletarSuperficies(page);

  expect(
    conteudo.match(PHONE_PATTERN)?.[0] ?? null,
    `telefone publicado em ${rota}`,
  ).toBeNull();
  await expect(
    page.locator('a[href^="tel:"]'),
    `link tel: em ${rota}`,
  ).toHaveCount(0);
}
