"use client";

import { useTranslations } from "@/hooks/useTranslations";
import { useStore } from "@/store";

/**
 * Toggle de idioma do shell novo. Lê e escreve o `locale` do store. O
 * `ui/LanguageToggle.tsx` legado continua no `LanguageContext` até o T21
 * deletá-lo junto com as sections. Dois arquivos por uma fase é mais barato
 * que reescrever um componente que vai ser apagado.
 */
export function LanguageToggle() {
  const t = useTranslations();
  const locale = useStore((state) => state.locale);
  const setLocale = useStore((state) => state.setLocale);

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
      aria-label={t.header.language}
      className="rounded-full border border-line px-12 py-6 type-m-12 font-medium uppercase tracking-[0.2em] text-ink/55 transition-colors duration-200 hover:border-ink/55 hover:text-ink motion-reduce:transition-none"
    >
      {locale === "pt" ? "PT" : "EN"}
    </button>
  );
}
