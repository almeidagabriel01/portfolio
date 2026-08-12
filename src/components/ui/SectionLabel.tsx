/**
 * UI-01, o rótulo de seção, um componente só para todas as
 * seções: quadrado âmbar pequeno, texto em mono caps com tracking largo, e uma
 * régua de 1px atravessando a coluna.
 *
 * A régua é `border-b` **deste** elemento, não `border-t` da seção. As duas
 * juntas desenhariam duas linhas a poucos pixels uma da outra, por isso as
 * seções perderam o `border-t border-line` ao adotar o rótulo.
 *
 * `<p>`, nunca heading: a UI-12 limita os títulos de nível 2 da home, e um
 * rótulo promovido a `<h2>` entraria nessa contagem sem ser um título.
 *
 * O quadrado é `aria-hidden` e não tem texto: é decoração, e é também o que o
 * mantém no âmbar exato do acento (`--color-accent`), fora da varredura de
 * contraste que mede só elementos com texto.
 */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      data-section-label
      className="flex items-center gap-12 border-b border-line pb-20 font-mono type-m-12 uppercase tracking-[0.28em] text-ink"
    >
      <span aria-hidden className="size-8 shrink-0 bg-accent" />
      {children}
    </p>
  );
}
