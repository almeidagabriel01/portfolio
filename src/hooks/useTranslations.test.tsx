import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enUS, ptBR } from "@/locales";
import { LOCALE_STORAGE_KEY, useStore } from "@/store";
import { useTranslations } from "./useTranslations";

const initialState = useStore.getState();

function Probe() {
  const t = useTranslations();
  return <span data-testid="greeting">{t.hero.cargoCurto}</span>;
}

const greeting = () => screen.getByTestId("greeting").textContent;

beforeEach(() => {
  useStore.setState(initialState, true);
  localStorage.clear();
});

// O vitest.config não usa `globals: true`, então o cleanup automático da
// testing-library não é registrado: sem isto os renders se acumulam no body.
afterEach(cleanup);

// PORT-18: a escolha de idioma vem do store, não do LanguageContext.
describe("useTranslations", () => {
  it("devolve o dicionário PT quando o store está em pt", () => {
    render(<Probe />);
    expect(greeting()).toBe(ptBR.hero.cargoCurto);
  });

  it("troca o dicionário quando o locale do store muda", () => {
    render(<Probe />);
    act(() => useStore.getState().setLocale("en"));
    expect(greeting()).toBe(enUS.hero.cargoCurto);
  });
});

/**
 * O store nasce em `pt` para bater com o HTML do servidor; a preferência salva
 * entra depois da montagem. Se alguém voltar a ler `localStorage` na criação do
 * store, o primeiro render passa a divergir do servidor.
 */
describe("hidratação do locale persistido", () => {
  it("aplica o idioma salvo depois da montagem", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    render(<Probe />);
    expect(greeting()).toBe(enUS.hero.cargoCurto);
  });

  it("mantém pt quando o valor salvo é o legado pt-BR", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "pt-BR");
    render(<Probe />);
    expect(greeting()).toBe(ptBR.hero.cargoCurto);
  });

  /**
   * Este é o guarda do mismatch de hidratação, e precisa de módulo novo para
   * valer: o `useStore` importado no topo já foi avaliado com o localStorage
   * vazio, então asserção sobre ele passaria mesmo se o initializer voltasse a
   * chamar `readStoredLocale()`. Aqui o storage é semeado ANTES da criação do
   * store, o único jeito de observar o valor com que ele nasce.
   *
   * Fica por último de propósito: `resetModules` só afeta import dinâmico
   * posterior, mas manter isolado evita confundir quem ler o arquivo.
   */
  it("um store recém-criado nasce em pt mesmo com en já salvo", async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    vi.resetModules();

    const freshStore = await import("@/store");

    expect(freshStore.useStore.getState().locale).toBe("pt");
  });
});
