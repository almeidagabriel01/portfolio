"use client";

import { useMediaQuery } from "./useMediaQuery";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Fonte única de `prefers-reduced-motion` (AD-004), para consumidores
 * **imperativos**: a suavização do Lenis e o `frameloop` do canvas.
 *
 * Componentes animados **não** devem se apoiar neste hook. Quem desliga a
 * animação declarativa é o `<MotionConfig reducedMotion="user">` montado no
 * `SmoothScroll`: ele lê a preferência na hora de animar, não na hora de
 * renderizar, e por isso não tem a janela de um render em que o valor ainda é
 * o do servidor.
 *
 * O `true` no servidor mantém o default conservador do AD-004: ambiente que não
 * reporta a preferência não recebe movimento.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY, true);
}
