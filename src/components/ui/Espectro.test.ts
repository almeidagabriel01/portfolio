import { describe, expect, it } from "vitest";
import { geometriaDoEspectro } from "./Espectro";

/**
 * O que o quadrado precisa provar é a **narrativa**, não um pixel: contínuo no
 * primeiro marco, discreto no último. Um refinamento que inverta a curva por
 * descuido continua desenhando algo bonito e deixa de contar a história, e
 * isso nenhuma captura pega, porque as duas imagens são plausíveis.
 */
describe("espectro do marco", () => {
  it("parte de canais contínuos e chega em blocos", () => {
    const fibra = geometriaDoEspectro(0, 0);
    const software = geometriaDoEspectro(1, 4);

    expect(fibra.linhas).toBe(1);
    expect(fibra.canais.every((c) => c.tracejado === null)).toBe(true);

    expect(software.linhas).toBeGreaterThan(1);
    expect(software.colunas).toBeLessThan(fibra.colunas);
    // Célula quadrada: espessura e traço convergem no fim do arco.
    const { traco } = software.canais[0].tracejado!;
    expect(software.espessura).toBeCloseTo(traco, 1);
  });

  /**
   * A grandeza que carrega o arco é a **proporção da célula**, não a contagem
   * de linhas. `linhas` sobe e depois desce (em `p = 1` ela reencontra
   * `colunas`, que encolheu mais rápido), e cobrar monotonia dela reprovaria
   * uma figura correta. O que não pode voltar atrás é o traço alto virando
   * bloco quadrado.
   */
  it("engrossa e aproxima do quadrado monotonicamente ao longo do arco", () => {
    // Os cinco passos são arbitrários: quem está sob teste é a função, não a
    // quantidade de marcos da seção. Acrescentar um sexto marco muda a escada e
    // não muda o que aqui se cobra.
    const passos = [0, 0.25, 0.5, 0.75, 1].map((p) => geometriaDoEspectro(p, 1));
    const proporcao = (g: (typeof passos)[number]) =>
      (g.canais[0].tracejado?.traco ?? g.lado) / g.espessura;

    for (let i = 1; i < passos.length; i++) {
      expect(passos[i].colunas).toBeLessThan(passos[i - 1].colunas);
      expect(passos[i].espessura).toBeGreaterThan(passos[i - 1].espessura);
      expect(proporcao(passos[i])).toBeLessThan(proporcao(passos[i - 1]));
    }
    expect(proporcao(passos.at(-1)!)).toBeCloseTo(1, 1);
  });

  /**
   * O quadrado é renderizado no servidor e de novo no cliente. Ruído não
   * determinístico não quebra teste nenhum. Quebra a hidratação, em produção.
   */
  it("é determinístico e cabe na caixa", () => {
    expect(geometriaDoEspectro(0.5, 2)).toEqual(geometriaDoEspectro(0.5, 2));

    for (const semente of [0, 1, 2, 3, 4]) {
      const g = geometriaDoEspectro(semente / 4, semente);
      const numeros = [
        g.espessura,
        g.acento.x,
        g.acento.y,
        g.acento.largura,
        g.acento.altura,
        ...g.canais.flatMap((c) => [c.x, c.opacidade, c.fase]),
      ];
      expect(numeros.every(Number.isFinite)).toBe(true);
      expect(g.canais.every((c) => c.opacidade > 0 && c.opacidade <= 1)).toBe(
        true,
      );
      expect(g.acento.x + g.acento.largura).toBeLessThanOrEqual(g.lado);
      expect(g.acento.y + g.acento.altura).toBeLessThanOrEqual(g.lado);
    }
  });
});
