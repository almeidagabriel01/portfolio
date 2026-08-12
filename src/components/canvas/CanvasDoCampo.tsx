"use client";

import { Canvas, type CanvasProps } from "@react-three/fiber";
import { Component, useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Shader que não compila, ou qualquer erro dentro da árvore do R3F, derruba
 * só o canvas. O conteúdo do site continua de pé.
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
 * O `<Canvas>` do projeto, com a política de frames e o espaço de cor num lugar
 * só. Dois call sites: o `BackgroundCanvas` fixo (AD-002) e o painel da
 * `Empresas` no estreito, que precisa de canvas **próprio** (ver lá o porquê).
 *
 * `linear` e `flat` **não são opcionais**: desligam a conversão para sRGB e o
 * tone mapping. Com tone mapping ligado o âmbar do campo sai deslocado, e o
 * efeito inteiro é 1 bit — não existe gradação para o tone mapping preservar.
 * Por isso eles moram aqui e não em cada call site: copiá-los é esquecê-los.
 */
export function CanvasDoCampo({
  children,
  onCreated,
}: {
  children: ReactNode;
  onCreated?: CanvasProps["onCreated"];
}) {
  const reducedMotion = useReducedMotion();
  const [hidden, setHidden] = useState(false);

  // Aba de fundo não precisa de frame nenhum.
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <CanvasBoundary>
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
        onCreated={onCreated}
      >
        {children}
      </Canvas>
    </CanvasBoundary>
  );
}
