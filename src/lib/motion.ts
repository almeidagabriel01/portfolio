import type { Transition } from "motion/react";

/**
 * Vocabulário de movimento do site, a fonte única de curva e duração.
 *
 * `OUT_EXPO` e `OUT_SNAPPY` são hoje a mesma curva, dois nomes para um valor.
 * Mantidos os dois porque o call site diz qual intenção está sendo expressa, e
 * porque divergir depois (se algum dia divergirem) não deve exigir caçar call
 * site.
 */
export const EASE = {
  /** A curva assinatura. Sai rápido e assenta longo. */
  OUT_SNAPPY: [0.19, 1, 0.22, 1],
  OUT_EXPO: [0.19, 1, 0.22, 1],
  /** Simétrica. Usada em troca de texto e em animação de layout (FLIP). */
  IN_OUT_CUBIC: [0.645, 0.045, 0.355, 1],
  IN_OUT_QUART: [0.77, 0, 0.175, 1],
  IN_OUT_QUINT: [0.86, 0, 0.07, 1],
  IN_OUT_BASE: [0.25, 0.1, 0.25, 1],
  /** Recua antes de ir. O único com componente negativo. */
  ANTICIPATE: [1, -0.4, 0.35, 0.95],
} as const;

/**
 * A transição default. Espalhe com `{...TRANSICAO, duration: x}` quando quiser
 * outra duração mantendo a curva.
 *
 * Atenção: transição escrita crua (`{duration: .3}`) **não** herda esta curva e
 * cai no ease default do `motion`. Onde isso acontece é inconsistência, não
 * intenção.
 */
export const TRANSICAO = {
  layout: { duration: 0.4, ease: EASE.OUT_SNAPPY },
  duration: 0.4,
  ease: EASE.OUT_SNAPPY,
} as const satisfies Transition;

/**
 * Remapeia `valor` da faixa `[deA, ateA]` para `[deB, ateB]`.
 *
 * `travar` fixa a saída dentro de `[deB, ateB]`, e é o que impede o uniform do
 * shader de passar do alvo quando o scroll ultrapassa a janela medida.
 */
export function remapear(
  valor: number,
  deA: number,
  ateA: number,
  deB: number,
  ateB: number,
  travar = false,
): number {
  const t = ((valor - deA) / (ateA - deA)) * (ateB - deB) + deB;
  if (!travar) return t;
  const min = Math.min(deB, ateB);
  const max = Math.max(deB, ateB);
  return Math.min(Math.max(t, min), max);
}
