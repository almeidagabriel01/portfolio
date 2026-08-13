import { describe, expect, it } from "vitest";
import {
  blocosFragmentGLSL,
  campoFragmentGLSL,
  flowmapFragmentGLSL,
  vertexGLSL,
} from "./field.glsl";
import { noiseGLSL } from "./noise.glsl";

const SHADERS = {
  vertexGLSL,
  flowmapFragmentGLSL,
  blocosFragmentGLSL,
  campoFragmentGLSL,
};

describe("shaders do campo", () => {
  /**
   * A guarda que motivou este arquivo: uma crase num comentário **dentro** do
   * template literal fecha a string no meio do GLSL. O resultado é um erro de
   * parse de TypeScript com uma linha que não ajuda, e (quando o corte cai num
   * ponto sintaticamente válido) um shader silenciosamente truncado.
   *
   * Barato de checar, caro de descobrir na mão.
   */
  it.each(Object.entries(SHADERS))("%s tem um main() fechado", (_nome, src) => {
    expect(src).toContain("void main()");
    expect(src.split("{").length).toBe(src.split("}").length);
  });

  it.each(Object.entries(SHADERS))("%s não tem crase", (_nome, src) => {
    expect(src).not.toContain("`");
  });

  it("o pass do campo traz o ruído interpolado, não a chamada solta", () => {
    expect(blocosFragmentGLSL).toContain("float fbm3(");
    expect(blocosFragmentGLSL).toContain("float simplex3(");
    expect(noiseGLSL.length).toBeGreaterThan(500);
  });

  /**
   * **O pass da tela não pode ter ruído nenhum.** É o ponto inteiro da
   * separação: o cálculo caro corre uma vez por bloco, no alvo, e a tela só
   * amostra. Uma chamada de ruído que reapareça aqui devolve o custo por pixel
   * sem que nada quebre visualmente — defeito que só um contador de fps pega.
   */
  it("o pass da tela só amostra o alvo", () => {
    expect(campoFragmentGLSL).not.toContain("simplex3(");
    expect(campoFragmentGLSL).not.toContain("fbm3(");
    expect(campoFragmentGLSL).toContain("texture2D(uCampo,");
  });

  // Todo uniform declarado tem que ser escrito por alguém; um uniform órfão é
  // valor morto que o driver otimiza fora e que engana quem lê o código.
  it("declara exatamente os uniforms que o componente alimenta", () => {
    const uniformsDe = (src: string) =>
      new Set([...src.matchAll(/uniform\s+\w+\s+(u\w+);/g)].map((m) => m[1]));

    expect(uniformsDe(blocosFragmentGLSL)).toEqual(
      new Set([
        "uFlowmap",
        "uBlocos",
        "uDeslocamento",
        "uAspecto",
        "uEscalaDoCampo",
        "uBrilho",
        "uContraste",
        "uLimiar",
        "uDistorcao",
        "uTempo",
      ]),
    );

    expect(uniformsDe(campoFragmentGLSL)).toEqual(
      new Set([
        "uCampo",
        "uCor",
        "uFundo",
        "uBlocos",
        "uDeslocamento",
        "uTamanhoDoAlvo",
        "uRaioDaBorda",
      ]),
    );
  });

  /**
   * A grelha é ancorada no centro e o número de blocos é fracionário, então o
   * mapa id→texel só coincide se os dois passes usarem **o mesmo** `uBlocos` e
   * o mesmo `uDeslocamento`. Calcular a contagem em GLSL dos dois lados
   * reabriria a porta ao bloco de diferença por arredondamento.
   */
  it("os dois passes derivam a grelha dos mesmos uniforms", () => {
    for (const src of [blocosFragmentGLSL, campoFragmentGLSL]) {
      expect(src).toContain("uBlocos");
      expect(src).toContain("uDeslocamento");
      expect(src).not.toContain("uResolucao");
      expect(src).not.toContain("uEscala;");
    }
  });

  it("o corte de 1 bit é um step, não um smoothstep", () => {
    // A aresta dura do bloco é o efeito. Um `smoothstep` aqui devolveria
    // gradação e o campo deixaria de ler como dither.
    expect(blocosFragmentGLSL).toContain("step(uLimiar,");
    expect(blocosFragmentGLSL).not.toContain("smoothstep(uLimiar");
  });
});
