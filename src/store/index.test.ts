import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALE_STORAGE_KEY, readStoredLocale, useStore } from "./index";

// Snapshot do estado inicial: o store é um singleton de módulo e vazaria entre testes.
const initialState = useStore.getState();

beforeEach(() => {
  useStore.setState(initialState, true);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AppState, forma do estado (design: interface AppState)", () => {
  it("expõe todos os slices do design com os defaults", () => {
    const state = useStore.getState();
    expect(state.scroll).toEqual({ progress: 0, velocity: 0 });
    expect(state.pathname).toEqual({ current: null, previous: null });
    expect(state.transition).toEqual({ active: false, startedAt: 0 });
    expect(state.locale).toBe("pt");
    expect(state.webglAvailable).toBe(false);
  });

  // AD-004: o slice `reducedMotion` saiu do store. A preferência é lida
  // direto do `matchMedia` por `useSyncExternalStore` (`useReducedMotion`), o
  // que dispensa o ciclo escrever-no-store-e-reagir. Este teste existe para
  // que reintroduzir o slice seja uma decisão, não um reflexo.
  it("não guarda reducedMotion: a preferência mora no matchMedia", () => {
    expect(useStore.getState()).not.toHaveProperty("reducedMotion");
    expect(useStore.getState()).not.toHaveProperty("setReducedMotion");
  });

  // AD-003: o slice de scroll é escrito ~60x/s e lido por getState() no useFrame,
  // nunca por subscrição React.
  it("expõe scroll por getState() sem subscrição após setScroll", () => {
    useStore.getState().setScroll({ progress: 0.42, velocity: -3.5 });
    expect(useStore.getState().scroll).toEqual({
      progress: 0.42,
      velocity: -3.5,
    });
  });

  it("setTransition grava active e startedAt", () => {
    useStore.getState().setTransition({ active: true, startedAt: 1234 });
    expect(useStore.getState().transition).toEqual({
      active: true,
      startedAt: 1234,
    });
  });

  it("setWebglAvailable grava o flag de capacidade", () => {
    useStore.getState().setWebglAvailable(true);
    expect(useStore.getState().webglAvailable).toBe(true);
  });
});

// PORT-09: o store registra pathname.previous com a rota anterior e
// pathname.current com a nova.
describe("pathname (PORT-09)", () => {
  it("na primeira rota grava current e mantém previous nulo", () => {
    useStore.getState().setPathname("/projects");
    expect(useStore.getState().pathname).toEqual({
      current: "/projects",
      previous: null,
    });
  });

  it("na navegação seguinte move a rota anterior para previous", () => {
    useStore.getState().setPathname("/projects");
    useStore.getState().setPathname("/about");
    expect(useStore.getState().pathname).toEqual({
      current: "/about",
      previous: "/projects",
    });
  });

  it("navegar para a mesma rota não sobrescreve previous", () => {
    useStore.getState().setPathname("/");
    useStore.getState().setPathname("/projects");
    useStore.getState().setPathname("/projects");
    expect(useStore.getState().pathname).toEqual({
      current: "/projects",
      previous: "/",
    });
  });
});

// PORT-18: a escolha de idioma persiste na navegação entre rotas.
describe("locale (PORT-18)", () => {
  it("setLocale troca o idioma no store", () => {
    useStore.getState().setLocale("en");
    expect(useStore.getState().locale).toBe("en");
  });

  it("setLocale persiste sob a chave portfolio-lang", () => {
    useStore.getState().setLocale("en");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
  });

  it("setLocale ainda troca o idioma quando localStorage lança", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() => useStore.getState().setLocale("en")).not.toThrow();
    expect(useStore.getState().locale).toBe("en");
  });

  it("readStoredLocale devolve o idioma persistido", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    expect(readStoredLocale()).toBe("en");
  });

  it("readStoredLocale cai em pt quando o valor persistido é o legado pt-BR", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "pt-BR");
    expect(readStoredLocale()).toBe("pt");
  });

  it("readStoredLocale cai em pt quando localStorage lança na leitura", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("SecurityError");
    });
    expect(readStoredLocale()).toBe("pt");
  });

  it("readStoredLocale cai em pt quando localStorage não existe", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readStoredLocale()).toBe("pt");
  });
});
