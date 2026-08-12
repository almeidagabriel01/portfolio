"use client";

import { AnimatePresence, motion } from "motion/react";
import { EASE } from "@/lib/motion";

/**
 * Rótulo que **se troca por si mesmo**: sai desfocando e encolhendo, entra
 * desfocado e maior.
 *
 * O truque de layout é a grelha de uma célula só. Os dois rótulos (o que sai e
 * o que entra) ocupam `grid-area: 1 / 1` (a utility `.area`), então convivem
 * empilhados no mesmo ponto durante a transição sem que a linha do nav se mexa
 * um pixel. Sem isso, `mode="popLayout"` tiraria o elemento do fluxo e a barra
 * inteira saltaria.
 *
 * A `key` combina o texto e o `gatilho`. O texto cobre a troca de idioma, que
 * ganha a animação de graça; o `gatilho` cobre o hover, onde o texto é o mesmo e
 * mesmo assim queremos que ele se refaça. Quem conta o gatilho é o pai: um
 * botão precisa disparar rótulo e ícone no mesmo `pointerenter`, e um contador
 * lá em cima é mais simples que dois handles imperativos aqui embaixo.
 */

interface Props {
  children: string;
  /** Incremente para refazer a animação sem mudar o texto. */
  gatilho?: number;
  className?: string;
  /** Classe do próprio rótulo, por dentro da grelha. */
  classeDoRotulo?: string;
}

export const TRANSICAO_DA_TROCA = {
  duration: 0.5,
  ease: EASE.IN_OUT_CUBIC,
} as const;

export function TrocaDeTexto({
  children,
  gatilho = 0,
  className,
  classeDoRotulo,
}: Props) {
  return (
    <div className={`grid items-center justify-center ${className ?? ""}`}>
      {/*
        `initial={false}`: sem isso o rótulo animaria na montagem da página, e o
        header inteiro entraria piscando. A entrada só vale para as trocas.
      */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`${gatilho}-${children}`}
          className={`area block ${classeDoRotulo ?? ""}`}
          initial={{ opacity: 0, scale: 1.3, filter: "blur(10px)" }}
          animate={{
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            // O atraso mínimo deixa o que sai começar antes; sem ele os dois
            // ficam legíveis ao mesmo tempo e a troca lê como borrão duplo.
            transition: { ...TRANSICAO_DA_TROCA, delay: 0.02 },
          }}
          exit={{
            opacity: 0,
            scale: 0.7,
            filter: "blur(10px)",
            transition: TRANSICAO_DA_TROCA,
          }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
