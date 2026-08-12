/**
 * UI-03: a última palavra do título vai na cor de acento.
 *
 * Exportado à parte porque o hero (UI-06) é bicolor sem ser distribuído: o
 * título do hero é centralizado e o das seções é espalhado. As duas
 * composições dividem esta regra e nada mais.
 */
export function dividirUltimaPalavra(texto: string): [string[], string] {
  const palavras = texto.trim().split(/\s+/);
  return [palavras.slice(0, -1), palavras[palavras.length - 1]];
}

/**
 * UI-03, o título distribuído: as palavras ocupam posições x
 * distintas na largura toda, não um bloco justificado à esquerda.
 *
 * `flex-wrap` + `justify-between` faz as duas coisas que o AC pede com o
 * mecanismo nativo: distribui na largura da coluna e, quando a viewport é
 * estreita demais, **empilha em vez de vazar**, que é a edge case da spec.
 * Um `letter-spacing` ou `word-spacing` gigante distribuiria igual e estouraria
 * a linha.
 *
 * O espaço vai **dentro** do span, não entre eles: sem ele o `textContent` do
 * heading viraria "Sócioemduasempresas." e levaria junto o nome acessível da
 * região, que é derivado deste texto por `aria-labelledby`.
 */
/**
 * UI-12: a home precisa de no máximo 4 títulos de nível 2. Cinco seções
 * irmãs, todas com o mesmo título gigante, era o oposto da contenção que a
 * página pede.
 *
 * O nível é do conteúdo, não da estética: o contato é o fecho da página (uma
 * chamada, não um capítulo), e é a única seção da home sem itens próprios em
 * `<h3>`. Isso importa: demover uma seção que tem filhos em `<h3>` põe o
 * título no mesmo nível dos seus itens e eles deixam de ser subordinados a
 * ele. O esboço do documento fica mentindo, e foi o que a suíte pegou quando
 * entregas e formação foram demovidas primeiro.
 *
 * O corpo acompanha o nível: `type-m-40 md:type-m-96` para h2, `type-m-28 md:type-m-54` para h3. Trocar só
 * a tag deixaria cinco títulos gigantes na tela e satisfaria a contagem sem
 * corrigir o defeito que ela mede.
 */
export function DistributedHeadline({
  id,
  nivel = 2,
  children,
}: {
  id: string;
  nivel?: 2 | 3;
  children: string;
}) {
  const [inicio, ultima] = dividirUltimaPalavra(children);
  const Titulo = nivel === 2 ? "h2" : "h3";

  return (
    <Titulo
      id={id}
      data-distributed
      className={`flex flex-wrap justify-between gap-x-24 font-display font-semibold leading-[0.92] tracking-[-0.02em] text-ink ${
        nivel === 2 ? "type-m-40 md:type-m-96" : "type-m-28 md:type-m-54"
      }`}
    >
      {inicio.map((palavra, indice) => (
        <span key={`${palavra}-${indice}`}>{palavra} </span>
      ))}
      {/*
        O acento cheio, não o clareado. Este título é `type-m-40 md:type-m-96`
        (40–96px) sobre o preto chapado do UI-11, e `#ff5a1f` dá 6,73:1: passa
        com folga tanto o piso de 3:1 do texto grande quanto o de 4,5:1 do
        normal. Com o azul da v4 (3,74:1) só o piso do texto grande cabia, e o
        tom claro aqui era efeito colateral da regra chapada de 4.5:1 que o
        `home.spec.ts` cobrava de todo texto.
      */}
      <span className="text-accent">{ultima}</span>
    </Titulo>
  );
}
