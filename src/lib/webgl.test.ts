import { afterEach, describe, expect, it, vi } from "vitest";
import { isWebGLAvailable } from "./webgl";

/** jsdom não implementa WebGL: o contexto é falso. */
function fakeContext() {
  const loseContext = vi.fn();
  const getExtension = vi.fn(() => ({ loseContext }));
  return { context: { getExtension }, getExtension, loseContext };
}

function stubGetContext(
  impl: (id: string) => unknown,
): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    // A sobrecarga real de getContext não é expressável aqui.
    impl as unknown as HTMLCanvasElement["getContext"],
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isWebGLAvailable (PORT-04)", () => {
  it("retorna true quando webgl2 está disponível", () => {
    const { context } = fakeContext();
    stubGetContext((id) => (id === "webgl2" ? context : null));
    expect(isWebGLAvailable()).toBe(true);
  });

  /**
   * WebGL1 sozinho não serve: o campo desenha em WebGL2 direto e devolveria
   * `null` no aparelho, deixando um `<canvas>` montado que nunca pinta.
   */
  it("retorna false quando só há webgl1", () => {
    const { context } = fakeContext();
    stubGetContext((id) => (id === "webgl" ? context : null));
    expect(isWebGLAvailable()).toBe(false);
  });

  it("retorna false quando webgl2 retorna null", () => {
    stubGetContext(() => null);
    expect(isWebGLAvailable()).toBe(false);
  });

  it("retorna false, sem lançar, quando getContext lança", () => {
    stubGetContext(() => {
      throw new Error("WebGL bloqueado");
    });
    expect(() => isWebGLAvailable()).not.toThrow();
    expect(isWebGLAvailable()).toBe(false);
  });

  it("retorna false em SSR, sem document", () => {
    vi.stubGlobal("document", undefined);
    expect(isWebGLAvailable()).toBe(false);
  });

  // "Descarta o canvas de teste": o contexto GL é um recurso limitado pelo
  // browser, então a liberação é a própria ação especificada.
  it("descarta o contexto de teste via WEBGL_lose_context", () => {
    const { context, getExtension, loseContext } = fakeContext();
    stubGetContext((id) => (id === "webgl2" ? context : null));

    isWebGLAvailable();

    expect(getExtension).toHaveBeenCalledWith("WEBGL_lose_context");
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it("não lança quando a extensão WEBGL_lose_context não existe", () => {
    stubGetContext((id) =>
      id === "webgl2" ? { getExtension: () => null } : null,
    );
    expect(isWebGLAvailable()).toBe(true);
  });
});
