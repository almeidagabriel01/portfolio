"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Uma media query como estado de React, correta já no primeiro render do
 * cliente.
 *
 * `useSyncExternalStore` e não `useEffect`: com efeito, todo consumidor tem um
 * render em que o valor ainda é o do servidor, e é nessa janela que animação de
 * entrada decide errado se deve ou não rodar.
 *
 * @param query          a media query, ex. `"(min-width: 768px)"`
 * @param valorNoServidor o que responder onde não há `matchMedia`: servidor e
 *                        ambientes sem suporte. Para consulta de layout o
 *                        default `false` serve; para preferência de
 *                        acessibilidade o valor conservador é `true`.
 */
export function useMediaQuery(query: string, valorNoServidor = false): boolean {
  const subscribe = useCallback(
    (aoMudar: () => void) => {
      const mql = globalThis.matchMedia?.(query);
      if (!mql) return () => {};
      mql.addEventListener("change", aoMudar);
      return () => mql.removeEventListener("change", aoMudar);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => globalThis.matchMedia?.(query).matches ?? valorNoServidor,
    [query, valorNoServidor],
  );

  const getServerSnapshot = useMemo(
    () => () => valorNoServidor,
    [valorNoServidor],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
