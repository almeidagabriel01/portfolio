"use client";

import { useEffect } from "react";
import { dictionaries, type Translations } from "@/locales";
import { readStoredLocale, useStore } from "@/store";

/**
 * Aplica o idioma persistido depois da montagem.
 *
 * O store nasce em `pt`, o mesmo valor que o servidor renderiza. Ler o
 * `localStorage` na criação do store faria um cliente com `en` salvo hidratar
 * com um texto diferente do HTML que chegou do servidor. Corrigir num efeito
 * custa um frame no idioma default e elimina o mismatch.
 */
export function useLocaleHydration(): void {
  useEffect(() => {
    const stored = readStoredLocale();
    if (stored !== useStore.getState().locale) {
      useStore.getState().setLocale(stored);
    }
  }, []);
}

/**
 * Dicionário do idioma ativo, lido do store, não do `LanguageContext`.
 * `locale` é estado de baixa frequência, então a subscrição React é permitida
 * (AD-003 restringe apenas os slices de alta frequência, como `scroll`).
 */
export function useTranslations(): Translations {
  useLocaleHydration();
  const locale = useStore((state) => state.locale);

  // O `lang` do <html> sai do servidor em `pt`, junto com o conteúdo. Trocar de
  // idioma (ou voltar com `en` salvo) tem que trocar a pronúncia do leitor de
  // tela junto; o atributo vive acima desta árvore, então é escrito por efeito,
  // o que também mantém o HTML do servidor igual ao do primeiro render.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return dictionaries[locale];
}
