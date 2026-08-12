import type Lenis from "lenis";
import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "@/store";
import {
  applyMotionPreference,
  LENIS_OPTIONS,
  writeScrollToStore,
} from "./SmoothScroll";

describe("LENIS_OPTIONS", () => {
  // PORT-05: os três valores são o contrato do spec, não preferência.
  it("usa lerp 0.2", () => {
    expect(LENIS_OPTIONS.lerp).toBe(0.2);
  });

  it("liga smoothWheel", () => {
    expect(LENIS_OPTIONS.smoothWheel).toBe(true);
  });

  it("desliga syncTouch", () => {
    expect(LENIS_OPTIONS.syncTouch).toBe(false);
  });

  // PORT-08: o default do Lenis é `false`, que sequestraria o scroll aninhado.
  it("permite scroll aninhado", () => {
    expect(LENIS_OPTIONS.allowNestedScroll).toBe(true);
  });
});

describe("writeScrollToStore", () => {
  beforeEach(() => {
    useStore.getState().setScroll({ progress: 0, velocity: 0 });
  });

  it("copia progresso e velocidade do Lenis para o store", () => {
    writeScrollToStore({ progress: 0.42, velocity: -3.5 });

    expect(useStore.getState().scroll).toEqual({
      progress: 0.42,
      velocity: -3.5,
    });
  });

  it("sobrescreve a leitura anterior a cada evento de scroll", () => {
    writeScrollToStore({ progress: 0.1, velocity: 1 });
    writeScrollToStore({ progress: 0.9, velocity: 8 });

    expect(useStore.getState().scroll).toEqual({ progress: 0.9, velocity: 8 });
  });
});

/**
 * AD-004. A garantia observável do PORT-06 mudou de "não existe instância" para
 * "existe instância sem suavização". O Lenis não pode mais ser trocado por um
 * fragmento, porque isso remonta a árvore inteira na hidratação.
 */
describe("applyMotionPreference", () => {
  /** Só o que a função toca. O Lenis real relê estes dois campos a cada evento. */
  const fakeLenis = () =>
    ({ options: { lerp: 0, smoothWheel: false } }) as unknown as Lenis;

  it("com movimento permitido devolve a suavização do spec", () => {
    const lenis = fakeLenis();
    applyMotionPreference(lenis, false);

    expect(lenis.options.lerp).toBe(LENIS_OPTIONS.lerp);
    expect(lenis.options.smoothWheel).toBe(true);
  });

  // `lerp: 1` aplica o delta inteiro no mesmo frame e `smoothWheel: false`
  // devolve o wheel ao browser: junto, é o scroll nativo.
  it("com reduced-motion zera a suavização", () => {
    const lenis = fakeLenis();
    applyMotionPreference(lenis, true);

    expect(lenis.options.lerp).toBe(1);
    expect(lenis.options.smoothWheel).toBe(false);
  });

  it("é idempotente e reversível quando a preferência muda em runtime", () => {
    const lenis = fakeLenis();

    applyMotionPreference(lenis, true);
    applyMotionPreference(lenis, true);
    expect(lenis.options).toEqual({ lerp: 1, smoothWheel: false });

    applyMotionPreference(lenis, false);
    expect(lenis.options).toEqual({ lerp: 0.2, smoothWheel: true });
  });

  // Mutar `lenis.options` não pode contaminar a constante compartilhada.
  it("não muta LENIS_OPTIONS", () => {
    applyMotionPreference(fakeLenis(), true);

    expect(LENIS_OPTIONS.lerp).toBe(0.2);
    expect(LENIS_OPTIONS.smoothWheel).toBe(true);
  });
});
