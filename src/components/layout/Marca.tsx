"use client";

import { motion } from "motion/react";
import { useDirecaoDeScroll } from "@/hooks/useDirecaoDeScroll";
import { EASE } from "@/lib/motion";

/**
 * O wordmark do header, que **colapsa ao rolar para baixo**.
 *
 * O gesto foi desenhado path a path e é este:
 *
 * - a caixa do wordmark **não muda de tamanho**: ela é `109×34` do começo ao
 *   fim, e os glifos se movem por dentro dela;
 * - as duas metades **convergem para o centro**: a primeira anda `+27.5` para a
 *   direita, a segunda `-27.5` para a esquerda, e as duas param na mesma faixa
 *   horizontal, uma em cima da outra;
 * - ao mesmo tempo elas se separam na vertical: a primeira sobe (`y 8 → 0`), a
 *   segunda desce (`y 8 → 14…17`);
 * - cada glifo tem o **seu** atraso, crescendo das pontas para o meio
 *   (`.21 → 0 → .21`), então a marca fecha como uma tesoura em vez de deslizar
 *   em bloco.
 *
 * As duas primeiras propriedades são o que faz a coisa ler como *fechar*. Uma
 * versão que encolhe a caixa e leva a segunda palavra sozinha para baixo produz
 * o mesmo estado final e um movimento diferente. Foi o primeiro erro aqui.
 *
 * **Como a caixa fica fixa sem medir nada em JS**: um irmão `invisible` com o
 * texto corrido segura a largura do wordmark aberto, e a camada animada mora
 * por cima em `absolute inset-0`. `justify-center` nos dois estados faz o resto:
 * em linha o wordmark ocupa a caixa, empilhado as duas linhas se centram nela,
 * e a convergência cai de graça da mudança de layout.
 *
 * A animação em si é **FLIP** (`layout` do motion): ninguém decora coordenada.
 * Muda a fonte, o corpo ou o nome, e continua correta.
 */

/**
 * A marca, em um lugar só.
 *
 * O componente esconde os glifos do leitor de tela porque cada letra é um
 * elemento próprio e a leitura sairia soletrada. Quem dá nome ao link é este
 * texto, via `aria-label`, daí ele ser exportado em vez de escrito duas vezes.
 */
export const MARCA = "Gabriel Dias";

const PALAVRAS = MARCA.split(" ");
const LETRAS = PALAVRAS.join("").length;

const DURACAO = 0.6;
/** Atraso da letra mais externa. O. */
const ATRASO_MAXIMO = 0.21;

const TRANSICAO = { duration: DURACAO, ease: EASE.OUT_SNAPPY } as const;

/**
 * Atraso por letra: zero no centro, `ATRASO_MAXIMO` nas pontas, proporcional à
 * distância.
 *
 * Proporcional e não em degraus fixos com teto: com teto, as três letras mais
 * externas empatavam no mesmo valor e partiam juntas, que é justamente o que
 * apagava a leitura de "cada letra tem o seu tempo".
 */
function atrasoDaLetra(indice: number): number {
  const centro = (LETRAS - 1) / 2;
  return ATRASO_MAXIMO * (Math.abs(indice - centro) / centro);
}

export function Marca() {
  const descendo = useDirecaoDeScroll();

  let indice = -1;

  return (
    <span className="relative block h-[1.9em] font-display text-[1.7rem] leading-none font-semibold tracking-tight">
      {/* Sizer: fixa a largura na do wordmark aberto e some para o leitor de
          tela e para o mouse. É o que impede a caixa de encolher. */}
      <span aria-hidden className="invisible block whitespace-nowrap">
        {MARCA}
      </span>

      <motion.span
        layout
        aria-hidden
        transition={TRANSICAO}
        className={`absolute inset-0 flex justify-center ${
          descendo
            ? "flex-col items-center leading-[0.86]"
            : "flex-row items-center"
        }`}
      >
        {PALAVRAS.map((palavra, posicao) => (
          <span key={palavra} className="flex">
            {/* O espaço entre as palavras é um elemento, não um caractere: em
                caractere ele não teria como animar até zero ao empilhar, e as
                duas linhas ficariam com um recuo fantasma. */}
            {posicao > 0 ? (
              <motion.span
                layout
                transition={TRANSICAO}
                className={descendo ? "w-0" : "w-[0.3em]"}
              />
            ) : null}
            {[...palavra].map((letra, i) => {
              indice += 1;
              return (
                <motion.span
                  // Posicional de propósito: letras repetidas ("a" em Gabriel e
                  // em Dias) precisam de identidade distinta, senão o FLIP casa
                  // a errada e a letra atravessa a marca.
                  key={`${posicao}-${i}`}
                  layout
                  transition={{ ...TRANSICAO, delay: atrasoDaLetra(indice) }}
                  className="block"
                >
                  {letra}
                </motion.span>
              );
            })}
          </span>
        ))}
      </motion.span>
    </span>
  );
}
