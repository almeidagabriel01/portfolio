import { describe, expect, it } from "vitest";
import {
  campoFragmentGLSL,
  flowmapFragmentGLSL,
  vertexGLSL,
} from "./field.glsl";
import { noiseGLSL } from "./noise.glsl";

const SHADERS = { vertexGLSL, flowmapFragmentGLSL, campoFragmentGLSL };

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

  it("o pass principal traz o ruído interpolado, não a chamada solta", () => {
    expect(campoFragmentGLSL).toContain("float fbm3(");
    expect(campoFragmentGLSL).toContain("float simplex3(");
    expect(noiseGLSL.length).toBeGreaterThan(500);
  });

  // Todo uniform declarado tem que ser escrito por alguém; um uniform órfão é
  // valor morto que o driver otimiza fora e que engana quem lê o código.
  it("declara exatamente os uniforms que o componente alimenta", () => {
    const declarados = [
      ...campoFragmentGLSL.matchAll(/uniform\s+\w+\s+(u\w+);/g),
    ].map((m) => m[1]);

    expect(new Set(declarados)).toEqual(
      new Set([
        "uFlowmap",
        "uCor",
        "uFundo",
        "uResolucao",
        "uAspecto",
        "uEscala",
        "uEscalaDoCampo",
        "uBrilho",
        "uContraste",
        "uLimiar",
        "uRaioDaBorda",
        "uDistorcao",
        "uTempo",
      ]),
    );
  });

  it("o corte de 1 bit é um step, não um smoothstep", () => {
    // A aresta dura do bloco é o efeito. Um `smoothstep` aqui devolveria
    // gradação e o campo deixaria de ler como dither.
    expect(campoFragmentGLSL).toContain("step(uLimiar,");
    expect(campoFragmentGLSL).not.toContain("smoothstep(uLimiar");
  });
});
