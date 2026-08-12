"use client";

import { motion } from "motion/react";
import { EASE } from "@/lib/motion";

/**
 * O botão de rolar do hero: um anel quadrado que se desenha em 5s.
 *
 * O truque é `pathLength`. Normalizando o comprimento do traço para 1, animar
 * `pathLength` de 0 a 1 vira "desenhar o contorno" sem precisar saber o
 * comprimento real em px: o `motion` traduz para `stroke-dasharray` /
 * `stroke-dashoffset` sozinho.
 *
 * A `key` vem de fora e é o índice da frase do hero: a cada troca de frase o
 * componente remonta e o anel redesenha do zero. Os 5s de duração são
 * exatamente o intervalo da rotação, então o anel funciona como barra de
 * progresso de quanto falta para a próxima frase.
 *
 * Geometria: caixa de 36×36, cantos de raio 9, começando no meio da aresta
 * esquerda para o traço nascer na altura do centro. O wrapper gira 90° para o
 * início ficar no topo.
 */

const LADO = 36;
const RAIO = 9;

/** Quadrado arredondado percorrido em sentido horário a partir do meio da
 *  aresta esquerda. Construído da geometria acima: não há segunda forma de
 *  desenhar um quadrado arredondado. */
const CONTORNO = [
  `M1 ${LADO / 2}`,
  `L1 ${1 + RAIO}`,
  `A${RAIO} ${RAIO} 0 0 1 ${1 + RAIO} 1`,
  `L${LADO - 1 - RAIO} 1`,
  `A${RAIO} ${RAIO} 0 0 1 ${LADO - 1} ${1 + RAIO}`,
  `L${LADO - 1} ${LADO - 1 - RAIO}`,
  `A${RAIO} ${RAIO} 0 0 1 ${LADO - 1 - RAIO} ${LADO - 1}`,
  `L${1 + RAIO} ${LADO - 1}`,
  `A${RAIO} ${RAIO} 0 0 1 1 ${LADO - 1 - RAIO}`,
  `L1 ${LADO / 2}`,
].join(" ");

interface Props {
  /** Segundos para o anel fechar. Case com o intervalo da rotação de frases. */
  duracao: number;
  rotulo: string;
}

export function IndicadorDeScroll({ duracao, rotulo }: Props) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={() =>
        window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
      }
      className="relative size-36 rotate-90 cursor-pointer"
    >
      <svg
        className="absolute inset-0 size-full"
        viewBox={`0 0 ${LADO} ${LADO}`}
        fill="none"
        stroke="var(--color-cta)"
        strokeWidth="1"
        aria-hidden
      >
        <motion.path
          d={CONTORNO}
          pathLength={1}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: duracao, ease: EASE.OUT_SNAPPY }}
        />
      </svg>

      {/* A seta não gira junto: o `-rotate-90` cancela o giro do wrapper. */}
      <span className="flex size-full -rotate-90 items-center justify-center">
        <svg
          className="block"
          width="10"
          height="9"
          viewBox="0 0 10 9"
          fill="none"
          aria-hidden
        >
          <path
            d="M5 0 L5 7.5 M1.5 4.5 L5 8 L8.5 4.5"
            stroke="var(--color-cta)"
            strokeWidth="1.2"
          />
        </svg>
      </span>
    </button>
  );
}
