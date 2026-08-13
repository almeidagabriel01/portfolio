"use client";

import { Component, useEffect, type ReactNode } from "react";
import { isWebGLAvailable } from "@/lib/webgl";
import { useStore } from "@/store";

/**
 * Shader que não compila, ou qualquer erro dentro do campo, derruba só este
 * canvas. O conteúdo do site continua de pé.
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

/** A sonda cria e descarta um contexto: uma vez por documento chega. */
let sondado = false;

/**
 * O portão do campo: só monta onde há WebGL, e isola a falha.
 *
 * ### Por que cada campo tem o seu canvas (AD-002 revogado, AD-047)
 *
 * A arquitetura anterior tinha um canvas `fixed` cobrindo a viewport e um
 * recorte por seção, lido com `getBoundingClientRect()` **dentro do loop de
 * quadros**, ou seja, na main thread, e escrito em coordenadas de viewport.
 *
 * Só que o scroll de toque não é da main thread: com `syncTouch: false`
 * (PORT-05) quem rola é o compositor, e o rAF fica para trás. O retângulo
 * pintado então desliza para longe do elemento durante o arrasto e reencontra o
 * lugar quando o scroll para. Medido em aparelho: o painel da `Empresas` descia
 * até debaixo do rótulo da seção seguinte, e no hero a passagem para o preto —
 * que é DOM, e portanto acompanha o scroll — deixava de cobrir o rodapé do
 * campo, expondo uma tira de blocos sem esmaecimento.
 *
 * **Não é consertável mantendo o canvas fixo**: enquanto a pintura for main
 * thread e o scroll for do compositor, as duas camadas divergem. A alternativa
 * seria `syncTouch: true`, que devolve o scroll à main thread ao custo de
 * sequestrar o toque no site inteiro.
 *
 * A primeira correção pôs canvas próprio só abaixo do `md`, e isso estava
 * errado pelo motivo certo: o critério não é largura, é **quem move o scroll**.
 * iPad e notebook com tela sensível rolam pelo compositor a 1024px e teriam o
 * mesmo defeito. Cada campo tem o seu canvas, em qualquer largura, e o
 * compositor move os pixels junto com a página como faria com uma imagem.
 *
 * O preço, medido e aceito: até três contextos WebGL na home em vez de um. Em
 * troca, durante um arrasto rápido o campo **congela** no último quadro
 * apresentado, em vez de animar fora do lugar.
 */
export function CanvasDoCampo({ children }: { children: ReactNode }) {
  const temWebGL = useStore((state) => state.webglAvailable);

  // Só após a hidratação: o servidor não tem WebGL, então renderizar o canvas
  // no HTML criaria mismatch com o cliente. O default `false` do store é o
  // valor do servidor.
  useEffect(() => {
    if (sondado) return;
    sondado = true;
    useStore.getState().setWebglAvailable(isWebGLAvailable());
  }, []);

  if (!temWebGL) return null;

  return <CanvasBoundary>{children}</CanvasBoundary>;
}
