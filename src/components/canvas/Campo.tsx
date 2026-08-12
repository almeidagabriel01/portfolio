"use client";

import { CampoNoCanvas, type PropsDoCampo } from "./CampoNoCanvas";

/**
 * O campo: o ponto único por onde as seções o pedem.
 *
 * **Já foi uma fronteira de `next/dynamic`, e deixou de precisar de ser.** O
 * desenho passava por `three` mais `@react-three/fiber` — 904 kB que a
 * hidratação tinha de avaliar antes de a página responder, com metade do código
 * a nunca correr. Adiar esse peso valia o pedido extra que o carregamento
 * dinâmico custa.
 *
 * Hoje o campo é WebGL2 direto (ver `campo.webgl.ts`) e cabe em poucos kB: o
 * pedido extra passou a custar mais do que poupava, e atrasava visivelmente a
 * entrada do campo no hero. Import estático, portanto — e a camada fica por ser
 * o sítio onde os três call sites concordam sobre o que um campo é.
 *
 * Continua sem render no servidor sem que seja preciso pedi-lo: o
 * `CanvasDoCampo` devolve `null` até saber se há WebGL, o que só acontece
 * depois de hidratar.
 */
export function Campo(props: PropsDoCampo) {
  return <CampoNoCanvas {...props} />;
}
