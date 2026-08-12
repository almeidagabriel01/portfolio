"use client";

import dynamic from "next/dynamic";
import type { PropsDoCampo } from "./CampoNoCanvas";

/**
 * O campo, **fora do caminho da hidratação**.
 *
 * O three.js mais o `@react-three/fiber` pesam 904 kB — ~56% de todo o JS
 * inicial da home. O chunk já entrava como `<script async>`, ou seja, nunca
 * bloqueou a **pintura**; o que ele bloqueava era a **hidratação**, porque o
 * módulo da página o importa estaticamente e o React não pode hidratar antes de
 * o grafo de módulos estar avaliado.
 *
 * E é a hidratação que manda no LCP desta página. Medido a 4x de CPU e 4G
 * lenta: `DOMContentLoaded` aos 1066 ms, mas o `<h1>` do hero só ficava visível
 * aos **3528 ms** — 2,4 s de parse e execute entre um e outro. A headline só
 * pinta quando a animação de entrada arranca, e a animação só arranca depois de
 * hidratar. Adiar este megabyte encurta exatamente esse intervalo.
 *
 * **`ssr: false` não custa um pixel**: o `CanvasDoCampo` já devolvia `null` no
 * servidor de propósito — ele só sabe se há WebGL depois de hidratar, e
 * renderizar o canvas no HTML criaria mismatch. O lugar do campo é preto até
 * ele acender, exatamente como sempre foi.
 *
 * Sem `loading` e sem portão de ociosidade: o componente entra na árvore no
 * primeiro render do cliente, então o chunk é pedido de imediato e o campo
 * acende assim que ele chega. Uma versão anterior atrasava o mount até ao
 * `load` + `requestIdleCallback` e saiu: não melhorava nada e punha a avaliação
 * de 900 kB em cima de quem já estava a interagir.
 */
const CampoCarregado = dynamic(
  () => import("./CampoNoCanvas").then((m) => m.CampoNoCanvas),
  { ssr: false },
);

export function Campo(props: PropsDoCampo) {
  return <CampoCarregado {...props} />;
}
