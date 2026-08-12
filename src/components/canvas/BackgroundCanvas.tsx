"use client";

import { View } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
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
 * Shader que não compila, ou qualquer erro dentro da árvore do R3F, derruba
 * só o fundo. O conteúdo do site continua de pé.
 */
class CanvasBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * O único `<Canvas>` do documento (AD-002), fixo e cobrindo a viewport.
 *
 * Ele não desenha nada por conta própria: quem coloca cena aqui é cada `<View>`
 * do drei espalhado pelas seções, através do `<View.Port/>`. O `View` recorta o
 * render ao retângulo do elemento que ele segue, então uma seção pinta o campo
 * só na própria área e o resto do canvas fica transparente: sem painel opaco
 * por cima, sem JS de máscara.
 *
 * `z-100` e conteúdo em `z-200`, como em navegador: o canvas fica acima do
 * fundo do `<body>` e abaixo de todo o conteúdo.
 *
 * `linear` e `flat` **importam**: desligam a conversão para sRGB e o tone
 * mapping. Com tone mapping ligado o âmbar do campo sai deslocado, e o efeito
 * inteiro é 1 bit: não existe gradação para o tone mapping preservar.
 */
export function BackgroundCanvas() {
  const reducedMotion = useReducedMotion();
  const supported = useStore((state) => state.webglAvailable);
  const [hidden, setHidden] = useState(false);

  // Só após a hidratação: o servidor não tem WebGL, então renderizar o canvas
  // no HTML criaria mismatch com o cliente. O default `false` do store é o
  // valor do servidor.
  useEffect(() => {
    useStore.getState().setWebglAvailable(isWebGLAvailable());
  }, []);

  // Aba de fundo não precisa de frame nenhum.
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!supported) return null;

  return (
    <CanvasBoundary>
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-100 h-[100lvh] w-full"
      >
        <Canvas
          linear
          flat
          shadows={false}
          eventPrefix="client"
          /**
           * Três estados, não dois. `never` para aba oculta: nenhum frame vale
           * a pena. `demand` para movimento reduzido: o campo fica **estático**,
           * e `never` não desenharia nem o primeiro frame, o que entregaria uma
           * tela preta em vez de um campo parado.
           */
          frameloop={hidden ? "never" : reducedMotion ? "demand" : "always"}
          style={{ pointerEvents: "none" }}
          onCreated={(state) => {
            if (process.env.NEXT_PUBLIC_E2E) {
              window.__backgroundRenderer = state.gl;
            }
          }}
        >
          <View.Port />
        </Canvas>
      </div>
    </CanvasBoundary>
  );
}
