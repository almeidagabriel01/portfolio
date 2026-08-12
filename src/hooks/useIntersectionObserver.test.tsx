import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIntersectionObserver } from "./useIntersectionObserver";

/**
 * O defeito que estes testes guardam: o efeito dependia do objeto `options`,
 * com default `= {}`. Quem chamasse com um literal (a forma natural) criava
 * um objeto novo a cada render, e o observer era desconectado e reconectado em
 * todo commit. O sintoma não aparece na tela; aparece em trabalho desperdiçado
 * e em reveal que pisca. Só um contador de construções pega isso.
 */
const observe = vi.fn();
const disconnect = vi.fn();
const constructed = vi.fn();

beforeEach(() => {
  constructed.mockClear();
  observe.mockClear();
  disconnect.mockClear();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback, init?: IntersectionObserverInit) {
        constructed(init);
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn();
      root = null;
      rootMargin = "";
      thresholds = [];
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Consumer({ threshold }: { threshold?: number }) {
  // Literal no corpo, de propósito: é exatamente o padrão que regredia.
  const [ref] = useIntersectionObserver<HTMLDivElement>({ threshold });
  return <div ref={ref} />;
}

describe("useIntersectionObserver", () => {
  it("constrói o observer uma vez mesmo com options literal e re-render", () => {
    const { rerender } = render(<Consumer />);
    expect(constructed).toHaveBeenCalledTimes(1);

    rerender(<Consumer />);
    rerender(<Consumer />);

    // Sem a correção este número seria 3, um observer por commit.
    expect(constructed).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("reconstrói quando um campo de options realmente muda", () => {
    const { rerender } = render(<Consumer threshold={0.15} />);
    expect(constructed).toHaveBeenCalledTimes(1);

    rerender(<Consumer threshold={0.9} />);

    // O oposto do teste acima: estabilidade não pode virar imobilidade.
    expect(constructed).toHaveBeenCalledTimes(2);
    expect(constructed).toHaveBeenLastCalledWith(
      expect.objectContaining({ threshold: 0.9 }),
    );
  });

  it("aplica o threshold padrão de 0.15 quando não é informado", () => {
    render(<Consumer />);
    expect(constructed).toHaveBeenCalledWith(
      expect.objectContaining({ threshold: 0.15, rootMargin: "0px", root: null }),
    );
  });

  it("observa o elemento e desconecta no unmount", () => {
    const { unmount } = render(<Consumer />);
    expect(observe).toHaveBeenCalledTimes(1);

    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
