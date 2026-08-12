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

  const visivel = locale === "pt" ? "PT" : "EN";

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
      /**
       * **O rótulo visível entra no nome acessível, e não é preciosismo.**
       *
       * Só `aria-label={t.header.language}` dava "Trocar idioma" a um botão que
       * mostra "PT": quem navega por voz diz o que lê, o comando não casa com
       * nada, e o WCAG 2.5.3 (label in name) proíbe exatamente isso.
       *
       * O visível vem à frente porque é por ele que o comando é procurado.
       *
       * **Não foi isto que levou a acessibilidade de 96 a 100** — essa foi a
       * `target-size` do `Carrossel`. O `label-content-name-mismatch` pesa 0 no
       * total do Lighthouse, e continua a apontar o link da marca e os sete
       * cartões de projeto, que sempre o violaram. Corrigido aqui porque é um
       * defeito real de quem navega por voz, não porque movesse o número.
       */
      aria-label={`${visivel} — ${t.header.language}`}
      className="rounded-full border border-line px-12 py-6 type-m-12 font-medium uppercase tracking-[0.2em] text-ink/55 transition-colors duration-200 hover:border-ink/55 hover:text-ink motion-reduce:transition-none"
    >
      {visivel}
    </button>
  );
}
