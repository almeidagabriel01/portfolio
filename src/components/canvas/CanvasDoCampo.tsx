"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
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
     *
     * O último canvas montado ganha a referência. Os testes de ciclo de vida
     * rodam em rota de um campo só (`/projetos`), onde não há ambiguidade.
     */
    __campoRenderer?: {
      domElement: HTMLCanvasElement;
      info: { render: { frame: number; calls: number } };
      getPixelRatio(): number;
    };
  }
}

/**
 * Shader que não compila, ou qualquer erro dentro da árvore do R3F, derruba
 * só este canvas. O conteúdo do site continua de pé.
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
 * A política de frames, **de dentro do canvas**.
 *
 * Mora aqui, e não como prop do `<Canvas>`, por causa do AD-003: o `<Canvas>`
 * reconfigura e **re-renderiza a árvore inteira do R3F a cada render seu**, sem
 * lista de dependências. Com `frameloop` vindo de fora, cada campo que entrava
 * ou saía da tela custava um render do `CampoDeBlocos` — o sensor de
 * `performance.spec` pegou. Como componente irmão, este portão re-renderiza
 * sozinho e não arrasta ninguém.
 *
 * Quatro estados: `never` para aba oculta e para campo fora da tela (nenhum
 * frame vale a pena), `demand` para movimento reduzido — o campo fica
 * **estático**, e `never` não desenharia nem o primeiro frame, o que entregaria
 * uma tela preta em vez de um campo parado.
 *
 * **O `invalidate` não é redundante.** Voltar de `never` não religa o rAF
 * global do R3F: ele para quando nenhum root está ativo e `setFrameloop` não o
 * acorda. Sem esta chamada, um campo que entra na tela fica preto para sempre
 * (medido: contador de frames parado em 0).
 */
function PortaoDeFrames() {
  const gl = useThree((estado) => estado.gl);
  const setFrameloop = useThree((estado) => estado.setFrameloop);
  const invalidate = useThree((estado) => estado.invalidate);
  const reducedMotion = useReducedMotion();
  const [oculta, setOculta] = useState(false);
  const [visivel, setVisivel] = useState(false);

  /**
   * O observado é o próprio `<canvas>`: dentro da árvore do R3F não há DOM para
   * pendurar um ref, e o nó do renderer é exatamente o retângulo que interessa.
   *
   * `rootMargin` de 200px: o campo volta a rodar um pouco antes de aparecer,
   * então ninguém encontra um frame velho entrando pela borda da tela.
   */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entrada]) => setVisivel(entrada.isIntersecting),
      { rootMargin: "200px", threshold: 0 },
    );
    observer.observe(gl.domElement);
    return () => observer.disconnect();
  }, [gl]);

  useEffect(() => {
    const aoTrocar = () => setOculta(document.hidden);
    aoTrocar();
    document.addEventListener("visibilitychange", aoTrocar);
    return () => document.removeEventListener("visibilitychange", aoTrocar);
  }, []);

  /**
   * Só aplica quando o modo **muda de verdade**. Sob movimento reduzido o modo
   * é `demand` esteja o campo na tela ou não, e reaplicá-lo custaria um
   * `invalidate` — ou seja, um frame — a cada vez que o observer se manifesta.
   * O PORT-03 cobra exatamente isso: com `reduce`, o contador de frames não
   * pode andar. Foi assim que o teste flagrou, de forma intermitente, o
   * observer chegando depois da primeira amostra.
   */
  const aplicado = useRef<"always" | "demand" | "never" | null>(null);
  useEffect(() => {
    const modo = oculta
      ? "never"
      : reducedMotion
        ? "demand"
        : visivel
          ? "always"
          : "never";
    if (aplicado.current === modo) return;
    aplicado.current = modo;
    setFrameloop(modo);
    if (modo !== "never") invalidate();
  }, [oculta, reducedMotion, visivel, setFrameloop, invalidate]);

  return null;
}

/** A sonda cria e descarta um contexto: uma vez por documento chega. */
let sondado = false;

/**
 * O canvas de um campo, **dentro do elemento que ele preenche**.
 *
 * ### Por que não há um canvas único e fixo (AD-002 revogado, AD-047)
 *
 * A arquitetura anterior tinha um `<Canvas>` `fixed` cobrindo a viewport e um
 * `<View>` do drei por seção, que recortava o render ao retângulo do elemento
 * seguido. O recorte é lido com `getBoundingClientRect()` **dentro do
 * `useFrame`**, ou seja, na main thread, e escrito em coordenadas de viewport.
 *
 * Só que o scroll de toque não é da main thread: com `syncTouch: false` (PORT-05)
 * quem rola é o compositor, e o rAF fica para trás. O retângulo pintado então
 * desliza para longe do elemento durante o arrasto e reencontra o lugar quando
 * o scroll para. Medido em aparelho: o painel da `Empresas` descia até debaixo
 * do rótulo da seção seguinte, e no hero a passagem para o preto — que é DOM, e
 * portanto acompanha o scroll — deixava de cobrir o rodapé do campo, expondo uma
 * tira de blocos sem esmaecimento.
 *
 * **Não é consertável mantendo o canvas fixo**: enquanto a pintura for main
 * thread e o scroll for do compositor, as duas camadas divergem. A alternativa
 * seria `syncTouch: true`, que devolve o scroll à main thread ao custo de
 * sequestrar o toque no site inteiro.
 *
 * A primeira correção pôs canvas próprio só abaixo do `md`, e isso estava
 * errado pelo motivo certo: o critério não é largura, é **quem move o scroll**.
 * iPad e notebook com tela sensível rolam pelo compositor a 1024px e teriam o
 * mesmo defeito. Como o `<View>` só sobreviveria em aparelhos exclusivamente de
 * mouse, ele saiu inteiro: cada campo tem o seu canvas, em qualquer largura, e
 * o compositor move os pixels junto com a página como faria com uma imagem.
 *
 * O preço, medido e aceito: até três contextos WebGL na home em vez de um (o
 * R3F compartilha um único rAF entre canvases), e um contexto novo por rota, já
 * que o campo não persiste mais entre navegações. Ele também não persistia
 * antes: o `CampoDeBlocos` remontava com o `<View>` e o relógio zerava.
 *
 * Em troca, durante um arrasto rápido o campo **congela** no último frame
 * apresentado, em vez de animar fora do lugar.
 *
 * ### O que este componente carrega
 *
 * `linear` e `flat` **não são opcionais**: desligam a conversão para sRGB e o
 * tone mapping. Com tone mapping ligado o âmbar do campo sai deslocado, e o
 * efeito inteiro é 1 bit — não existe gradação para o tone mapping preservar.
 * Ficam aqui, e não em cada call site, porque copiá-los é esquecê-los. A
 * política de frames e o portão de WebGL, pelo mesmo motivo.
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

  return (
    <CanvasBoundary>
      <Canvas
        linear
        flat
        shadows={false}
        eventPrefix="client"
        /**
         * **`scroll: false`, e sem isto o refactor custaria caro.**
         *
         * O default do R3F remede o canvas a cada scroll, porque `size` carrega
         * `top`/`left` para converter coordenada de ponteiro. Com o canvas
         * fixo isso nunca mudava; com o canvas **dentro da página**, o topo
         * muda em todo scroll, o store do R3F reemite `size`, e todo
         * `useThree()` re-renderiza — o `CampoDeBlocos` inclusive, ~20x/s por
         * canvas. É exatamente o que o AD-003 proíbe, e foi o sensor de
         * `performance.spec` que pegou: 6 renders viraram 9 ao rolar.
         *
         * Nada aqui depende de `top`/`left`: o canvas não recebe evento
         * (`pointerEvents: none`) e o rastro do hero lê o retângulo do próprio
         * alvo a cada `pointermove`.
         */
        resize={{ scroll: false }}
        /**
         * Estático de propósito: quem manda no loop é o `PortaoDeFrames`,
         * por dentro. `never` até ele decidir, para não haver um frame
         * desenhado antes da política valer.
         */
        frameloop="never"
        /**
         * **A caixa do canvas é arredondada para cima, e isso não é
         * preciosismo.**
         *
         * O painel da `Empresas` mede 487,5px (a largura sai de `cqw`, não de
         * um número redondo). O R3F dimensiona o buffer em inteiros, então o
         * canvas saía 487 dentro de uma caixa de 487,5 e o browser reamostrava
         * a diferença. Num efeito de **1 bit** isso não passa despercebido:
         * medido em dpr 1, a cobertura do painel subia de 5,90% para 9,52% e os
         * pixels de âmbar puro caíam de 14.047 para 3.189 — o resto virava
         * borda interpolada. Era assim que o `<View>` sempre desenhou: recorte
         * inteiro dentro de um canvas do tamanho da viewport.
         *
         * A regra mora em `globals.css`, e não neste `style`, porque precisa de
         * `@supports` **e** de um piso de 100%: o `style` inline substitui o do
         * R3F, e um `round()` que o browser não entenda levaria a altura junto
         * — invólucro de altura zero, campo que não pinta. A sobra de meio
         * pixel morre no `overflow-clip` do painel; onde a caixa já é inteira
         * (hero, painel da `Entregas`) nada muda.
         */
        className="canvas-do-campo"
        style={{ pointerEvents: "none" }}
        onCreated={(state) => {
          if (process.env.NEXT_PUBLIC_E2E) {
            window.__campoRenderer = state.gl;
          }
        }}
      >
        <PortaoDeFrames />
        {children}
      </Canvas>
    </CanvasBoundary>
  );
}
