"use client";

import { cubicBezier } from "motion/react";
import {
  forwardRef,

  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { EASE } from "@/lib/motion";
import { criarCampo, type CampoWebGL } from "./campo.webgl";

export interface OpcoesDoCampo {
  /** Densidade da grelha. Maior = blocos **menores**. */
  escala?: number;
  /** Frequência do campo procedural, o tamanho das manchas. */
  escalaDoCampo?: number;
  /** Desliza a imagem através do limiar. É o botão de fade in/out. */
  brilho?: number;
  contraste?: number;
  /** O corte de 1 bit. */
  limiar?: number;
  raioDaBorda?: number;
  distorcao?: number;
  cor?: string;
  fundo?: string;
  /**
   * Segundos que o campo leva a emergir do preto ao montar. `0` desliga, e é o
   * default: quem não pede nada continua a acender de uma vez.
   *
   * O que anima é o `brilho`, não a opacidade do canvas — o campo **nasce
   * preto** e os blocos vão cruzando o limiar até a cobertura calibrada. É por
   * isso que o texto por cima nunca é afetado: a camada não esmaece, o
   * conteúdo dela é que aparece.
   */
  revelacao?: number;
}

/**
 * Valores. São o ponto de partida de todo call site; o hero só
 * troca `escala`.
 *
 * Tipado por `Required<OpcoesDoCampo>` e não por `as const`: com `as const` cada
 * campo vira um tipo literal (`0.16`, não `number`) e passar qualquer outro
 * valor deixa de compilar.
 */
export const CAMPO_PADRAO: Required<OpcoesDoCampo> = {
  escala: 0.16,
  escalaDoCampo: 3,
  /**
   * **Calibrado, não chutado.** `brilho` desliza o histograma da fonte
   * através do limiar, então o número depende da fonte: para uma foto, `0.73`
   * serve. A nossa é um FBM, cuja distribuição é estreita e
   * centrada, e com `0.73` quase nenhum bloco cruza `0.56` e a tela fica vazia.
   *
   * O valor foi achado medindo, não a olho: a cobertura âmbar de uma faixa da
   * primeira tela é **8,83%** dos pixels; varrendo o brilho com o
   * campo em cordilheira, `0.475 → 8,17%` e `0.48 → 10,37%`. `0.478` dá 9,54%.
   *
   * Quem mexer em `escalaDoCampo`, `contraste`, `limiar` ou na forma do campo
   * precisa recalibrar este número: todos dividem o mesmo eixo. A troca de
   * FBM cru para cordilheira, por exemplo, moveu o valor de 0,855 para 0,478.
   */
  brilho: 0.478,
  contraste: 2.91,
  limiar: 0.56,
  raioDaBorda: 0,
  distorcao: 1,
  cor: "#d09332",
  fundo: "#000000",
  revelacao: 0,
};

export interface CampoHandle {
  /** Densidade da grelha. Escrito direto no uniform, sem passar pelo React. */
  definirEscala(valor: number): void;
  /** Desliza a imagem através do limiar: é assim que o campo entra e sai. */
  definirBrilho(valor: number): void;
  /** Frequência do campo, o tamanho das manchas. Usado na calibração. */
  definirEscalaDoCampo(valor: number): void;
}

declare global {
  interface Window {
    /**
     * Seam do AD-003: quantas vezes o campo **renderizou** em React. O scroll
     * escreve nos uniforms por handle imperativo, então este número tem que
     * ficar parado enquanto a página rola. Se alguém assinar o scroll por
     * estado, ele sobe a cada frame.
     */
    __campoRenders?: number;
    /**
     * Seam de calibração: escreve direto nos uniforms sem rebuildar. Foi com
     * ele que `brilho` e `escalaDoCampo` foram ajustados contra a cobertura
     * medida.
     */
    __campo?: CampoHandle;
    /**
     * Seam de teste: o e2e conta frames reais para asserir que o loop parou.
     * O formato é o que o renderer do three expunha, porque é o que os testes
     * já liam — `info.render.frame` e `getPixelRatio()`.
     */
    __campoRenderer?: {
      domElement: HTMLCanvasElement;
      info: { render: { frame: number; calls: number } };
      getPixelRatio(): number;
    };
  }
}

interface Props {
  opcoes?: OpcoesDoCampo;
  /** Liga o rastro do mouse. Custa um render por frame e um `pointermove`. */
  usarMouse?: boolean;
  /** Elemento que define o retângulo do efeito, para mapear o ponteiro. */
  alvoDoPonteiro?: React.RefObject<HTMLElement | null>;
}

/**
 * O campo de blocos: o `<canvas>` e a política de quadros.
 *
 * O desenho em si mora em `campo.webgl.ts`, sem React e sem motor 3D — ver lá o
 * porquê. Aqui fica o que é do DOM e do ciclo de vida:
 *
 * - **quando desenhar.** Fora da tela ou com a aba oculta não se desenha nada;
 *   sob movimento reduzido desenha-se **um** quadro e para, que deixa o campo
 *   estático em vez de preto.
 * - **o tamanho**, por `ResizeObserver`, sem passar por estado de React: o
 *   AD-003 quer este componente fora do caminho de render, e o scroll muda o
 *   retângulo o tempo todo.
 * - **o ponteiro**, lido do retângulo do alvo a cada evento.
 * - **a revelação**, que sobe o `brilho` do preto até ao valor calibrado.
 */
export const CampoDeBlocos = forwardRef<CampoHandle, Props>(
  function CampoDeBlocos({ opcoes, usarMouse = false, alvoDoPonteiro }, ref) {
    const config = { ...CAMPO_PADRAO, ...opcoes };
    const canvas = useRef<HTMLCanvasElement>(null);
    const campo = useRef<CampoWebGL | null>(null);

    // Efeito sem deps: roda depois de todo render. Ver o seam acima.
    useEffect(() => {
      if (!process.env.NEXT_PUBLIC_E2E) return;
      window.__campoRenders = (window.__campoRenders ?? 0) + 1;
    });

    const reducedMotion = useReducedMotion();

    /**
     * As opções entram no renderizador **uma vez**, na criação. Depois disso
     * quem muda valores é o handle, direto no uniform. Guardadas num ref para
     * o efeito de criação não depender de um literal recriado a cada render —
     * senão o contexto WebGL era destruído e recriado por render.
     */
    const configInicial = useRef(config);

    /**
     * Sobe quando o contexto WebGL é restaurado, para reconstruir tudo.
     *
     * Perder o contexto é rotina (o SO reclama a GPU, a aba fica muito tempo em
     * segundo plano), e o `webglcontextlost` **só permite restauro se for
     * cancelado**. Sem cancelar, o canvas fica preto para sempre.
     */
    const [geracao, setGeracao] = useState(0);

    useEffect(() => {
      const elemento = canvas.current;
      if (!elemento) return;

      const aoPerder = (evento: Event) => evento.preventDefault();
      const aoRestaurar = () => setGeracao((n) => n + 1);
      elemento.addEventListener("webglcontextlost", aoPerder);
      elemento.addEventListener("webglcontextrestored", aoRestaurar);

      const atual = configInicial.current;
      const renderizador = criarCampo(elemento, {
        escala: atual.escala,
        escalaDoCampo: atual.escalaDoCampo,
        // Nasce preto quando há revelação: o loop sobe daqui até o valor
        // calibrado. Sem revelação, entra já no valor final, como sempre.
        brilho: atual.revelacao > 0 && !reducedMotion ? 0 : atual.brilho,
        contraste: atual.contraste,
        limiar: atual.limiar,
        raioDaBorda: atual.raioDaBorda,
        distorcao: atual.distorcao,
        cor: atual.cor,
        fundo: atual.fundo,
        usarMouse,
      });
      if (!renderizador) {
        elemento.removeEventListener("webglcontextlost", aoPerder);
        elemento.removeEventListener("webglcontextrestored", aoRestaurar);
        return;
      }
      campo.current = renderizador;
      if (process.env.NEXT_PUBLIC_E2E) window.__campoRenderer = renderizador;
      /**
       * Um quadro já, sem esperar pelo laço.
       *
       * É o que o `invalidate()` do invólucro anterior fazia na montagem e a
       * cada mudança de tamanho: garante que o campo tem imagem mesmo antes de
       * o observador de interseção se pronunciar, e que nunca existe um estado
       * em que o canvas está montado e preto à espera de política.
       */
      renderizador.desenhar(0);

      return () => {
        elemento.removeEventListener("webglcontextlost", aoPerder);
        elemento.removeEventListener("webglcontextrestored", aoRestaurar);
        campo.current = null;
        /**
         * Só apaga o seam se ele ainda for **este** renderizador. Ao trocar de
         * rota o campo novo monta antes de o antigo ser limpo, e um `delete`
         * cego apagava o ponteiro que o novo acabara de escrever — o e2e ficava
         * à espera de um renderer que existia.
         */
        if (process.env.NEXT_PUBLIC_E2E && window.__campoRenderer === renderizador) {
          delete window.__campoRenderer;
        }
        renderizador.destruir();
      };
    }, [usarMouse, reducedMotion, geracao]);

    // ── Tamanho ────────────────────────────────────────────────────────────
    useEffect(() => {
      const elemento = canvas.current;
      if (!elemento) return;
      const medir = () => {
        const caixa = elemento.getBoundingClientRect();
        campo.current?.definirTamanho(caixa.width, caixa.height);
        // Redimensionar limpa o buffer: sem repintar, o campo pisca preto até
        // ao próximo quadro do laço (e fica preto de vez se ele estiver parado).
        campo.current?.desenhar(0);
      };
      medir();
      const observador = new ResizeObserver(medir);
      observador.observe(elemento);
      return () => observador.disconnect();
    }, []);

    // ── Ponteiro ───────────────────────────────────────────────────────────
    useEffect(() => {
      if (!usarMouse) return;
      const aoMover = (evento: PointerEvent) => {
        const alvo = alvoDoPonteiro?.current;
        if (!alvo) return;
        // Leitura de layout por evento de ponteiro. É barata porque nada muda
        // o layout entre eventos, e evita ter de compensar o scroll do Lenis à
        // mão sobre um retângulo memorizado, que é onde essa conta erra.
        const caixa = alvo.getBoundingClientRect();
        if (caixa.width === 0 || caixa.height === 0) return;
        campo.current?.definirPonteiro(
          (evento.clientX - caixa.left) / caixa.width,
          1 - (evento.clientY - caixa.top) / caixa.height,
        );
      };
      window.addEventListener("pointermove", aoMover, { passive: true });
      return () => window.removeEventListener("pointermove", aoMover);
    }, [usarMouse, alvoDoPonteiro]);

    // ── Política de quadros e revelação ────────────────────────────────────
    const suavizar = useMemo(() => cubicBezier(...EASE.OUT_EXPO), []);

    useEffect(() => {
      const elemento = canvas.current;
      if (!elemento) return;

      let visivel = false;
      let oculta = document.hidden;
      let pedido = 0;
      let ultimo = 0;
      let tempo = 0;
      const revelacao = configInicial.current.revelacao;
      const brilhoFinal = configInicial.current.brilho;
      let revelado = !(revelacao > 0) || reducedMotion;

      const desenharUm = () => {
        campo.current?.desenhar(0);
      };

      const laco = (agora: number) => {
        const delta = ultimo ? (agora - ultimo) / 1000 : 0;
        ultimo = agora;
        if (delta > 0 && delta < 0.5) tempo += delta;

        if (!revelado) {
          const progresso = Math.min(1, tempo / revelacao);
          campo.current?.definirBrilho(brilhoFinal * suavizar(progresso));
          if (progresso >= 1) revelado = true;
        }

        campo.current?.desenhar(delta);
        pedido = requestAnimationFrame(laco);
      };

      const avaliar = () => {
        const deveCorrer = visivel && !oculta && !reducedMotion;
        if (deveCorrer && !pedido) {
          ultimo = 0;
          pedido = requestAnimationFrame(laco);
        } else if (!deveCorrer && pedido) {
          cancelAnimationFrame(pedido);
          pedido = 0;
        }
        // Movimento reduzido: **um** quadro, para o campo ficar parado em vez
        // de preto. `never` não desenharia nem esse.
        if (!deveCorrer && visivel && !oculta && reducedMotion) desenharUm();
      };

      /**
       * `rootMargin` de 200px: o campo volta a rodar um pouco antes de
       * aparecer, então ninguém encontra um frame velho entrando pela borda.
       */
      const observador = new IntersectionObserver(
        ([entrada]) => {
          visivel = entrada.isIntersecting;
          avaliar();
        },
        { rootMargin: "200px", threshold: 0 },
      );
      observador.observe(elemento);

      const aoTrocarAba = () => {
        oculta = document.hidden;
        avaliar();
      };
      document.addEventListener("visibilitychange", aoTrocarAba);

      return () => {
        observador.disconnect();
        document.removeEventListener("visibilitychange", aoTrocarAba);
        if (pedido) cancelAnimationFrame(pedido);
      };
    }, [reducedMotion, suavizar]);

    // ── Handle imperativo (AD-003) ─────────────────────────────────────────
    const handle = useMemo<CampoHandle>(
      () => ({
        definirEscala: (valor) => campo.current?.definirEscala(valor),
        definirBrilho: (valor) => campo.current?.definirBrilho(valor),
        definirEscalaDoCampo: (valor) =>
          campo.current?.definirEscalaDoCampo(valor),
      }),
      [],
    );
    useImperativeHandle(ref, () => handle, [handle]);

    useEffect(() => {
      if (!process.env.NEXT_PUBLIC_E2E) return;
      window.__campo = handle;
      return () => {
        delete window.__campo;
      };
    }, [handle]);

    return (
      <canvas
        ref={canvas}
        aria-hidden
        className="canvas-do-campo absolute inset-0"
        style={{ pointerEvents: "none" }}
      />
    );
  },
);
