"use client";

import { useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";

/**
 * `true` enquanto o último movimento de scroll foi para **baixo**.
 *
 * Direção, não posição: é o que colapsa o wordmark do
 * header. Rolar de volta para cima reexpande, mesmo sem chegar ao topo.
 *
 * O estado só muda quando a direção vira, então isto **não** re-renderiza a
 * cada frame de scroll: o `set` do React com o mesmo valor é descartado.
 */
export function useDirecaoDeScroll(): boolean {
  const { scrollY } = useScroll();
  const [descendo, setDescendo] = useState(false);

  useMotionValueEvent(scrollY, "change", (atual) => {
    const anterior = scrollY.getPrevious() ?? 0;
    // Empate (`atual === anterior`) mantém a direção: sem isso, o quique do
    // fim do scroll do Lenis piscava o logo.
    if (atual === anterior) return;
    setDescendo(atual > anterior);
  });

  return descendo;
}
