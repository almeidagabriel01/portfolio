"use client";

import { View } from "@react-three/drei";
import { useEffect } from "react";
import { CanvasDoCampo } from "@/components/canvas/CanvasDoCampo";
import { isWebGLAvailable } from "@/lib/webgl";
import { useStore } from "@/store";

declare global {
  interface Window {
    /**
     * Seam de teste, atrás de `NEXT_PUBLIC_E2E`: o e2e conta frames reais, e
     * `info.render.frame` é o contador do próprio three.js. Sem isso não há
     * como asserir que o loop parou (PORT-03) sem instrumentar um contador
     * paralelo que não prova nada sobre o renderer.
     */
    __backgroundRenderer?: {
      domElement: HTMLCanvasElement;
      info: { render: { frame: number; calls: number } };
      getPixelRatio(): number;
    };
  }
}

/**
 * O `<Canvas>` que cobre a viewport (AD-002), fixo.
 *
 * Ele não desenha nada por conta própria: quem coloca cena aqui é cada `<View>`
 * do drei espalhado pelas seções, através do `<View.Port/>`. O `View` recorta o
 * render ao retângulo do elemento que ele segue, então uma seção pinta o campo
 * só na própria área e o resto do canvas fica transparente: sem painel opaco
 * por cima, sem JS de máscara.
 *
 * **O recorte só cola no scroll da main thread.** O `View` lê
 * `getBoundingClientRect()` do alvo dentro do `useFrame` e escreve o scissor em
 * coordenadas de viewport. No toque o scroll é do compositor (`syncTouch:
 * false`) e o rAF fica para trás, então o retângulo pintado **descola** do
 * elemento enquanto o dedo arrasta e reencontra o lugar quando o scroll para.
 * Quem precisa de um recorte colado no estreito não usa `View`: usa
 * `CanvasDoCampo` dentro do próprio elemento, que o compositor move junto com a
 * página. É o que a `Empresas` faz.
 *
 * `z-100` e conteúdo em `z-200`, como em navegador: o canvas fica acima do
 * fundo do `<body>` e abaixo de todo o conteúdo.
 */
export function BackgroundCanvas() {
  const supported = useStore((state) => state.webglAvailable);

  // Só após a hidratação: o servidor não tem WebGL, então renderizar o canvas
  // no HTML criaria mismatch com o cliente. O default `false` do store é o
  // valor do servidor.
  useEffect(() => {
    useStore.getState().setWebglAvailable(isWebGLAvailable());
  }, []);

  if (!supported) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-100 h-[100lvh] w-full"
    >
      <CanvasDoCampo
        onCreated={(state) => {
          if (process.env.NEXT_PUBLIC_E2E) {
            window.__backgroundRenderer = state.gl;
          }
        }}
      >
        <View.Port />
      </CanvasDoCampo>
    </div>
  );
}
