import { expect, type Page } from "@playwright/test";
import { dictionaries, type Translations } from "../src/locales";
import type { Locale } from "../src/store";

/**
 * Todo caminho de chave folha dos dois dicionários, em notação pontuada
 * (`hero.title`, `journey.experiences.0.cargo`).
 *
 * PORT-19 fala de "caminho de chave não-resolvido". Casar por regex genérica
 * (`/\w+\.\w+/`) acusaria "Next.js" e "proops.com.br": a lista real de chaves
 * é o único predicado que não tem falso positivo.
 */
export function translationKeyPaths(): string[] {
  const paths = new Set<string>();

  const walk = (value: unknown, prefix: string) => {
    if (value !== null && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        walk(child, prefix ? `${prefix}.${key}` : key);
      }
      return;
    }
    if (prefix) paths.add(prefix);
  };

  for (const dictionary of Object.values(dictionaries)) walk(dictionary, "");
  return [...paths];
}

/** O shell monta em toda rota: header, skip link e o botão de idioma. */
const HEADER = [
  "header.skip",
  "header.nav",
  "header.language",
  "header.home",
  "header.projects",
  "header.about",
];

/**
 * Índices escritos a partir do spec, não medidos no dicionário: PORT-16 fixa as
 * experiências (**7** desde a correção C5, que separou PDI de ND) e **4**
 * categorias de skill (a quarta é Formação & Idiomas, do T4). Se o dicionário encolher, a chave que falta some do
 * `resolve` e o teste acusa, que é o ponto.
 */
const JOURNEY = Array.from({ length: 7 }, (_, index) =>
  ["cargo", "empresa", "periodo", "desc"].map(
    (campo) => `journey.experiences.${index}.${campo}`,
  ),
).flat();
const SKILL_CATEGORIES = Array.from(
  { length: 4 },
  (_, index) => `skills.categories.${index}.title`,
);

/**
 * O que cada rota realmente põe na tela.
 *
 * Este é o predicado que falha quando o PORT-19 regride. As páginas consomem o
 * dicionário por acesso direto (`t.header.home`), então chave faltando vira
 * `undefined` e o React não imprime **nada**: procurar o caminho cru na tela
 * nunca acusaria. Procurar o *valor* acusa.
 *
 * Fora do escopo de propósito: `header.skills/journey/contact` são resquícios
 * da single-page anterior e nenhuma rota os renderiza: o AC fala de chave
 * **visível**. A paridade e a integridade deles continuam cobertas por
 * `src/locales/index.test.ts`. (`contact.*` saiu desta lista no T9: a seção de
 * contato os renderiza.)
 */
const RENDERED_KEYS: Record<string, string[]> = {
  "/": [
    ...HEADER,
    // `hero.frases` gira a cada 5s: só uma está na tela por vez, e a
    // asserção de qual delas é vive no `home.spec.ts`, que congela a rotação
    // por reduced-motion. Aqui ficam as que a rota sempre publica.
    "hero.cargoCurto",
    "hero.rolar",
    "companies.title",
    "companies.highlight",
    "companies.description",
    ...Array.from({ length: 2 }, (_, index) =>
      ["tipo", "desde", "sociedade", "desc"].map(
        (campo) => `companies.entries.${index}.${campo}`,
      ),
    ).flat(),
    "deliveries.title",
    "deliveries.highlight",
    "deliveries.description",
    "deliveries.by",
    "trajectory.title",
    "trajectory.highlight",
    "trajectory.own.cargo",
    "trajectory.own.empresa",
    "trajectory.own.periodo",
    "trajectory.own.desc",
    "education.title",
    "education.highlight",
    "education.english.titulo",
    "education.english.meta",
    "education.english.desc",
    "education.certifications.titulo",
    "education.certifications.desc",
    // A seção de formação lê o diploma e o prêmio da jornada, em vez de manter
    // uma segunda cópia do texto. Estas são as chaves que ela põe na tela.
    ...[5, 6]
      .map((index) =>
        ["cargo", "empresa", "periodo", "desc"].map(
          (campo) => `journey.experiences.${index}.${campo}`,
        ),
      )
      .flat(),
    "contact.title",
    "contact.highlight",
    "contact.description",
    "contact.button",
    "contact.networks",
    "contact.from",
  ],
  "/projetos": [
    ...HEADER,
    "projects.title",
    "projects.highlight",
    "projects.label",
    "projects.table.projeto",
    "projects.table.oQueE",
    "projects.table.grupo",
    "projects.janela.abrir",
    "projects.tipos.cliente",
    "projects.tipos.estudo",
    "projects.janela.aviso",
    "projects.janela.emNovaAba",
    "projects.groups.trabalho",
    "projects.groups.estudo",
    /**
     * `projects.viewCase` saiu da `/projetos` na fase C: no molde da rota o
     * card inteiro leva ao destino e não há rótulo de ação dentro dele. A chave
     * segue exigida na home, onde a célula da grade ainda a mostra.
     */
    /**
     * `caseStudy.visit` saiu daqui na fase C. A `/projetos` virou a tabela do
     * molde `/projetos`, onde a linha inteira é o link e o destino externo se
     * anuncia pelo `target`, não por um rótulo dentro da célula: a chave
     * continua exigida na case page, que é onde ela aparece na tela.
     */
    "stack.title",
    "stack.highlight",
    "stack.description",
  ],
  // A case page: os blocos do case mais o título da navegação entre cases. O
  // Barbalog é o representante da rota `[slug]`: as três compartilham o mesmo
  // componente.
  "/projetos/barbalog": [
    ...HEADER,
    "caseStudy.context",
    "caseStudy.role",
    "caseStudy.stack",
    "caseStudy.highlights",
    "caseStudy.visit",
    "caseStudy.back",
    "caseStudy.others",
  ],
  "/sobre": [
    ...HEADER,
    "journey.title",
    "journey.highlight",
    ...JOURNEY,
    "skills.title",
    "skills.highlight",
    "skills.description",
    ...SKILL_CATEGORIES,
  ],
};

function resolve(dictionary: Translations, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, step) => (node as Record<string, unknown> | undefined)?.[step],
      dictionary,
    );
}

/** PORT-19: nada de chave crua na tela e nada de chave que não resolve. */
export async function expectTranslationsResolved(
  page: Page,
  route: string,
  locale: Locale,
) {
  const body = page.locator("body");
  const visible = await body.innerText();

  const leaked = translationKeyPaths().filter((path) => visible.includes(path));
  expect(leaked, `chaves cruas renderizadas em ${route}`).toEqual([]);

  // `${t.a} ${t.b}` com uma das duas faltando imprime a palavra literal.
  expect(visible, `texto literal "undefined" em ${route}`).not.toContain(
    "undefined",
  );

  const esperadas = RENDERED_KEYS[route] ?? [];
  // Piso: rota sem lista faria o laço abaixo não rodar nada e passar por
  // vacuidade: o mesmo defeito de "gate verde sem executar teste".
  expect(esperadas.length, `nenhuma chave declarada para ${route}`).toBeGreaterThan(
    5,
  );

  // `textContent` e não `innerText`: a nav aplica `uppercase` por CSS, e
  // `innerText` devolve o texto renderizado: "INÍCIO" nunca casaria com o
  // valor do dicionário. Os `aria-label` entram junto porque `header.nav` e
  // `header.language` só existem como rótulo acessível.
  const haystack = await page.evaluate(() =>
    [
      document.body.textContent ?? "",
      ...[...document.querySelectorAll("[aria-label]")].map(
        (element) => element.getAttribute("aria-label") ?? "",
      ),
    ].join("\n"),
  );

  for (const path of esperadas) {
    const value = resolve(dictionaries[locale], path);

    // Propriedade estrutural, não comparação do dado consigo mesmo: uma folha
    // que não seja string não-vazia reprova aqui, sem depender de o teste
    // saber qual é o texto certo. É isso que pega a chave castada para
    // `undefined`, que o React renderiza como nada.
    expect(
      typeof value === "string" && value.trim().length > 0,
      `${path} (${locale}) não é uma string não-vazia: valor ${JSON.stringify(value)}`,
    ).toBe(true);

    // `trim()`: valores como `projects.title` ("Experiências ") carregam espaço
    // final de propósito, para colar no `<span>` do destaque.
    expect(
      haystack,
      `${path} (${locale}) não chegou ao texto de ${route}`,
    ).toContain((value as string).trim());
  }
}
