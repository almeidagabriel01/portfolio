"use client";

import { useSyncExternalStore } from "react";
import { useIntersectionObserver } from "./useIntersectionObserver";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Objeto estável no módulo, não literal no corpo do hook: o efeito de
 * `useIntersectionObserver` depende de `options`, e um literal novo a cada
 * render desconectaria e reconectaria o observer em todo commit.
 */
const OPTIONS: IntersectionObserverInit = {
  threshold: 0.15,
  rootMargin: "0px 0px -8% 0px",
};

/**
 * "Já hidratou?" por `useSyncExternalStore`: o snapshot do servidor é `false` e
 * o do cliente é `true`, sem `setState` dentro de efeito, que além de proibido
 * pelo lint (`react-hooks/set-state-in-effect`) custaria um render em cascata.
 * A subscrição é no-op porque o valor nunca muda depois da hidratação.
 */
const NEVER_CHANGES = () => () => {};
const ON_CLIENT = () => true;
const ON_SERVER = () => false;

/** Só transform e opacity, as duas propriedades que o compositor anima. */
const TRANSITION =
  "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none";

/**
 * Reveal de seção por interseção, com dois cuidados que a UI perde fácil:
 *
 * 1. **AD-004**: com `prefers-reduced-motion` a seção nasce visível e não há
 *    transição nenhuma para observar.
 * 2. **Sem JS o conteúdo continua na tela.** O estado escondido só é aplicado
 *    depois da hidratação; o HTML do servidor sai visível. Esconder texto atrás
 *    de um observer que nunca vai rodar deixaria a página em branco para quem
 *    não executa script, e o conteúdo destas seções é o produto.
 */
export function useSectionReveal<T extends Element = HTMLElement>() {
  const [ref, visible] = useIntersectionObserver<T>(OPTIONS);
  const reducedMotion = useReducedMotion();
  const hydrated = useSyncExternalStore(NEVER_CHANGES, ON_CLIENT, ON_SERVER);

  const hidden = hydrated && !reducedMotion && !visible;

  return {
    ref,
    className: `${TRANSITION} ${
      hidden ? "opacity-0 translate-y-24" : "opacity-100 translate-y-0"
    }`,
  };
}
