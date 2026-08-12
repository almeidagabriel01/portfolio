import { describe, expect, it } from "vitest";
import { dictionaries, enUS, ptBR } from "./index";

/**
 * Caminhos de todas as folhas do dicionário. Arrays entram com índice porque
 * `journey.experiences` é posicional: um idioma com 5 experiências e o outro com
 * 6 renderiza texto faltando, exatamente o que o PORT-17 proíbe.
 */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => keyPaths(item, `${prefix}[${index}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      keyPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

const ptPaths = keyPaths(ptBR);
const enPaths = keyPaths(enUS);

// PORT-17: os dois dicionários têm exatamente o mesmo conjunto de chaves,
// recursivamente, com zero diferença.
describe("paridade de chaves PT/EN (PORT-17)", () => {
  it("nenhuma chave existe em PT e falta em EN", () => {
    const enSet = new Set(enPaths);
    expect(ptPaths.filter((path) => !enSet.has(path))).toEqual([]);
  });

  it("nenhuma chave existe em EN e falta em PT", () => {
    const ptSet = new Set(ptPaths);
    expect(enPaths.filter((path) => !ptSet.has(path))).toEqual([]);
  });

  it("o conjunto ordenado de chaves é idêntico nos dois idiomas", () => {
    expect([...enPaths].sort()).toEqual([...ptPaths].sort());
  });
});

// PORT-19: nenhum texto visível contém um caminho de chave não-resolvido. Chave
// com valor vazio é a origem disso: a UI cai no fallback e mostra o caminho.
describe("valores resolvíveis (PORT-19)", () => {
  it.each([
    ["pt", ptBR],
    ["en", enUS],
  ])("toda folha de %s é string não-vazia", (_locale, dictionary) => {
    const leaves = keyPaths(dictionary).map((path) =>
      path
        .split(/[.[\]]/)
        .filter(Boolean)
        .reduce<unknown>(
          (node, step) => (node as Record<string, unknown>)[step],
          dictionary,
        ),
    );
    for (const leaf of leaves) {
      expect(typeof leaf).toBe("string");
      expect((leaf as string).trim().length).toBeGreaterThan(0);
    }
  });
});

// As rotas novas (`/`, `/projetos`, `/projetos/[slug]`) precisam de rótulo nos
// dois idiomas antes de a Phase 4 renderizá-las.
describe("chaves das rotas novas", () => {
  it.each([
    ["pt", ptBR],
    ["en", enUS],
  ])("%s tem rótulo de home, grupos de projeto e labels de case", (
    _locale,
    dictionary,
  ) => {
    expect(dictionary.header.home).toBeTruthy();
    expect(dictionary.projects.groups.trabalho).toBeTruthy();
    expect(dictionary.projects.groups.estudo).toBeTruthy();
    expect(dictionary.projects.viewCase).toBeTruthy();
    expect(dictionary.caseStudy.context).toBeTruthy();
    expect(dictionary.caseStudy.role).toBeTruthy();
    expect(dictionary.caseStudy.stack).toBeTruthy();
    expect(dictionary.caseStudy.highlights).toBeTruthy();
    expect(dictionary.caseStudy.visit).toBeTruthy();
    expect(dictionary.caseStudy.back).toBeTruthy();
  });
});

// PORT-18: o locale do store é a chave de escolha do dicionário.
describe("dictionaries", () => {
  it("mapeia os locales do store para os dicionários", () => {
    expect(dictionaries.pt).toBe(ptBR);
    expect(dictionaries.en).toBe(enUS);
  });
});
