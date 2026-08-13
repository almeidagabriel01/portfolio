import { describe, expect, it } from "vitest";
import {
  amostraFragmentGLSL,
  campoFragmentGLSL,
  flowmapFragmentGLSL,
  vertexGLSL,
} from "./field.glsl";
import { noiseGLSL } from "./noise.glsl";

const SHADERS = {
  vertexGLSL,
  flowmapFragmentGLSL,
  campoFragmentGLSL,
  amostraFragmentGLSL,
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

  it("o campo traz o ruído interpolado, não a chamada solta", () => {
    expect(campoFragmentGLSL).toContain("float fbm3(");
    expect(campoFragmentGLSL).toContain("float simplex3(");
    expect(noiseGLSL.length).toBeGreaterThan(500);
  });

  /**
   * Os dois regimes são o **mesmo** cálculo com o id do bloco vindo de sítios
   * diferentes, e por isso vivem num programa só: um lê `gl_FragCoord` (um
   * texel por bloco), o outro o `vUv` (um pixel de cada vez). Separá-los em
   * dois shaders traria de volta o custo de compilar o segundo no meio da
   * rolagem — 566 ms medidos.
   */
  it("os dois regimes cabem num shader só, atrás de uDireto", () => {
    expect(campoFragmentGLSL).toContain("floor(gl_FragCoord.xy) - uDeslocamento");
    expect(campoFragmentGLSL).toContain("floor((vUv - 0.5) * uBlocos)");
    expect(campoFragmentGLSL).toContain("uDireto");
  });

  /**
   * **O pass da tela não pode ter ruído nenhum.** É o ponto inteiro da
   * separação: o cálculo caro corre uma vez por bloco, no alvo, e a tela só
   * amostra. Uma chamada de ruído que reapareça aqui devolve o custo por pixel
   * sem que nada quebre visualmente — defeito que só um contador de fps pega.
   */
  it("o pass da tela só amostra o alvo", () => {
    expect(amostraFragmentGLSL).not.toContain("simplex3(");
    expect(amostraFragmentGLSL).not.toContain("fbm3(");
    expect(amostraFragmentGLSL).toContain("texture2D(uCampo,");
  });

  // Todo uniform declarado tem que ser escrito por alguém; um uniform órfão é
  // valor morto que o driver otimiza fora e que engana quem lê o código.
  it("declara exatamente os uniforms que o componente alimenta", () => {
    const uniformsDe = (src: string) =>
      new Set([...src.matchAll(/uniform\s+\w+\s+(u\w+);/g)].map((m) => m[1]));

    expect(uniformsDe(campoFragmentGLSL)).toEqual(
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
        "uCor",
        "uFundo",
        "uRaioDaBorda",
        "uDireto",
      ]),
    );

    expect(uniformsDe(amostraFragmentGLSL)).toEqual(
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
    for (const src of [campoFragmentGLSL, amostraFragmentGLSL]) {
      expect(src).toContain("uBlocos");
      expect(src).toContain("uDeslocamento");
      expect(src).not.toContain("uResolucao");
      expect(src).not.toContain("uEscala;");
    }
  });

  it("o corte de 1 bit é um step, não um smoothstep", () => {
    // A aresta dura do bloco é o efeito. Um `smoothstep` aqui devolveria
    // gradação e o campo deixaria de ler como dither.
    expect(campoFragmentGLSL).toContain("step(uLimiar,");
    expect(campoFragmentGLSL).not.toContain("smoothstep(uLimiar");
  });
});
