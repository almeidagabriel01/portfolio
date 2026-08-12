"use client";

import { motion } from "motion/react";
import { Fragment } from "react";
import { EASE, TRANSICAO } from "@/lib/motion";
import { separarPalavras } from "@/lib/texto";

/**
 * Título que entra **palavra a palavra**, cada uma saindo de desfocada e maior.
 *
 * Os números são os: `scale 1.3 → 1`, `blur(30px) → blur(0px)`,
 * 2s de duração, curva `OUT_EXPO`, e **0.3s de atraso por palavra**. Esse
 * escalonamento é largo de propósito: a última palavra de uma frase de cinco
 * só assenta perto dos 3,2s. É o que faz o hero ler como uma frase sendo dita,
 * não como um bloco aparecendo.
 *
 * O `<h1>` também faz `opacity 0 → 1` por fora: as palavras animam dentro de um
 * elemento que já está aparecendo, e é essa sobreposição que evita o "pisca"
 * da primeira palavra em telas lentas.
 *
 * Marcação de destaque: envolva a palavra em asteriscos no dicionário, como em
 * `"Engenharia de *Software*"`. Preferi isso a HTML no locale porque o texto
 * continua legível para quem traduz e não abre porta para markup arbitrário.
 */

const DURACAO = 2;
const ATRASO_POR_PALAVRA = 0.3;

interface Props {
  children: string;
  id?: string;
  className?: string;
  /** Somado ao atraso de cada palavra. */
  atrasoBase?: number;
  /**
   * Classe da palavra marcada. O default é o âmbar cheio, certo sobre preto
   * chapado. Quem renderiza **sobre o campo WebGL** precisa passar
   * `text-accent-soft`: os blocos do campo são exatamente `--color-accent`, e âmbar
   * sobre âmbar mede 1,67:1. A decisão fica no call site porque só ele sabe o
   * que está atrás.
   */
  classeDeDestaque?: string;
}

export function PalavrasQueEntram({
  children,
  id,
  className,
  atrasoBase = 0,
  classeDeDestaque = "text-accent",
}: Props) {
  const palavras = separarPalavras(children);

  return (
    <motion.h1
      id={id}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ ...TRANSICAO, duration: 0.5 }}
    >
      {palavras.map(({ texto, destacada }, indice) => {
        return (
          <Fragment key={`${indice}-${texto}`}>
            <motion.span
              className={`inline-block${destacada ? ` ${classeDeDestaque}` : ""}`}
              initial={{ scale: 1.3, opacity: 0, filter: "blur(30px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{
                ...TRANSICAO,
                duration: DURACAO,
                ease: EASE.OUT_EXPO,
                delay: atrasoBase + ATRASO_POR_PALAVRA * indice,
              }}
            >
              {texto}
            </motion.span>
            {/* Espaço como irmão literal, não `gap`: com `gap` a quebra de
                linha some e o título vira uma palavra só em viewport estreita. */}
            {indice < palavras.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </motion.h1>
  );
}
