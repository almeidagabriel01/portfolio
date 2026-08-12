import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useStore } from "@/store";
import { REDUCED_MOTION_QUERY, useReducedMotion } from "./useReducedMotion";

type Listener = (event: MediaQueryListEvent) => void;

/** MediaQueryList falso: jsdom não implementa matchMedia. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    matches,
    media: REDUCED_MOTION_QUERY,
    addEventListener: vi.fn((_type: string, listener: Listener) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: Listener) => {
      listeners.delete(listener);
    }),
  };
  const matchMedia = vi.fn(() => mql);
  vi.stubGlobal("matchMedia", matchMedia);

  return {
    mql,
    matchMedia,
    /** Simula o usuário mudando a preferência no sistema operacional. */
    change(next: boolean) {
      mql.matches = next;
      act(() => {
        for (const listener of listeners) {
          listener({ matches: next } as MediaQueryListEvent);
        }
      });
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useReducedMotion (PORT-03, PORT-12 · AD-004)", () => {
  it("retorna true quando a media query casa", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("retorna false quando a media query não casa", () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("consulta exatamente a media query prefers-reduced-motion: reduce", () => {
    const { matchMedia } = stubMatchMedia(true);
    renderHook(() => useReducedMotion());
    expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });

  // O valor certo tem que valer já no **primeiro** render, sem efeito no meio.
  // Era essa a janela que fazia o Lenis nascer sem suavização e ganhá-la um
  // render depois. Um `useEffect` reprova aqui; `useSyncExternalStore` passa.
  it("vale já no primeiro render, sem efeito intermediário", () => {
    stubMatchMedia(false);
    const vistos: boolean[] = [];
    renderHook(() => {
      vistos.push(useReducedMotion());
    });
    expect(vistos).toEqual([false]);
  });

  it("reage a mudança de preferência em runtime sem re-inscrever", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    media.change(true);

    expect(result.current).toBe(true);
    // Uma única assinatura: o hook não remontou nem re-inscreveu.
    expect(media.mql.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("remove o listener no unmount", () => {
    const media = stubMatchMedia(true);
    const { unmount } = renderHook(() => useReducedMotion());
    const [, listener] = media.mql.addEventListener.mock.calls[0];

    unmount();

    expect(media.mql.removeEventListener).toHaveBeenCalledWith(
      "change",
      listener,
    );
  });

  it("não lança quando matchMedia é indefinido (SSR) e mantém o estado seguro", () => {
    vi.stubGlobal("matchMedia", undefined);
    // A propriedade central é não lançar, daí o renderHook fora de expect.
    const { result } = renderHook(() => useReducedMotion());
    // AD-004: sem como ler a preferência, o valor correto é o conservador.
    // Um ambiente que não reporta a preferência não recebe movimento.
    expect(result.current).toBe(true);
  });

  // AD-004: o hook deixou de espelhar a preferência no zustand. Se alguém
  // reintroduzir o slice, o valor volta a poder divergir do `matchMedia`.
  it("não escreve no store", () => {
    stubMatchMedia(true);
    renderHook(() => useReducedMotion());
    expect(useStore.getState()).not.toHaveProperty("reducedMotion");
  });
});
