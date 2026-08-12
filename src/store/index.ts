import { create } from "zustand";

export type Locale = "pt" | "en";

/** Chave preservada do LanguageContext anterior. */
export const LOCALE_STORAGE_KEY = "portfolio-lang";

export interface ScrollState {
  progress: number;
  velocity: number;
}

export interface PathnameState {
  current: string | null;
  previous: string | null;
}

export interface TransitionState {
  active: boolean;
  startedAt: number;
}

export interface AppState {
  scroll: ScrollState;
  pathname: PathnameState;
  transition: TransitionState;
  locale: Locale;
  webglAvailable: boolean;
  setScroll(scroll: ScrollState): void;
  setPathname(pathname: string): void;
  setTransition(transition: TransitionState): void;
  setLocale(locale: Locale): void;
  setWebglAvailable(webglAvailable: boolean): void;
}

/**
 * `localStorage` não existe no servidor e lança em modo privado de alguns
 * browsers. Valor legado (`pt-BR`/`en-US`) não é válido aqui e cai no default.
 */
export function readStoredLocale(): Locale {
  try {
    const saved = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY);
    return saved === "pt" || saved === "en" ? saved : "pt";
  } catch {
    return "pt";
  }
}

export const useStore = create<AppState>((set) => ({
  scroll: { progress: 0, velocity: 0 },
  pathname: { current: null, previous: null },
  transition: { active: false, startedAt: 0 },
  // Nasce no default determinístico, nunca no valor persistido: o servidor não
  // tem `localStorage` e renderizaria `pt` enquanto um cliente com `en` salvo
  // criaria o store em `en`: mismatch de hidratação no primeiro paint.
  // `readStoredLocale()` é aplicado depois da montagem, por `useLocaleHydration`.
  locale: "pt",

  // AD-004: `reducedMotion` morava aqui e saiu. O `useReducedMotion` passou a
  // ler o `matchMedia` por `useSyncExternalStore`, então o valor certo já vale
  // no primeiro render do cliente e não existe mais o ciclo
  // escrever-no-store-e-reagir que este slice servia. Nenhum leitor restou.

  webglAvailable: false,

  setScroll: (scroll) => set({ scroll }),

  // `previous` só avança quando a rota realmente muda: navegar para a mesma
  // rota não pode apagar de onde o usuário veio.
  setPathname: (pathname) =>
    set((state) =>
      state.pathname.current === pathname
        ? state
        : { pathname: { current: pathname, previous: state.pathname.current } },
    ),

  setTransition: (transition) => set({ transition }),

  setLocale: (locale) => {
    try {
      globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // modo privado: a preferência não persiste, mas a troca acontece
    }
    set({ locale });
  },

  setWebglAvailable: (webglAvailable) => set({ webglAvailable }),
}));
