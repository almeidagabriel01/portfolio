"use client";

import { useState, useEffect, useRef, type RefObject } from "react";

/**
 * Genérico em vez de `RefObject<any>`: quem chama declara o elemento que
 * observa e o ref sai tipado. A interface vazia que existia aqui era só um
 * apelido de `IntersectionObserverInit`: o tipo nativo entra direto.
 */
export const useIntersectionObserver = <T extends Element = HTMLElement>({
  root = null,
  rootMargin = "0px",
  threshold = 0.15,
}: IntersectionObserverInit = {}): [RefObject<T | null>, boolean] => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<T>(null);

  // As dependências são os campos, não o objeto. Depender de `options` fazia o
  // efeito rodar em todo commit de quem passasse um literal (que é a forma
  // natural de chamar), desconectando e reconectando o observer a cada render.
  // Assim o chamador escreve `useIntersectionObserver({ threshold: 0.2 })` sem
  // precisar hastear uma constante para o escopo do módulo.
  //
  // Ressalva: `threshold` aceita array, e um array literal volta a re-inscrever
  // por identidade. Quem precisar de múltiplos limiares passa uma constante
  // estável. O caso comum, um número, está coberto.
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { root, rootMargin, threshold },
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [root, rootMargin, threshold]);

  return [ref, isVisible];
};
