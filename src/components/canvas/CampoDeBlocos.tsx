"use client";

import { cubicBezier } from "motion/react";
import {
  forwardRef,
  useCallback,
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

/**
 * Quantas trocas de canvas seguidas se gastam a tentar reaver o contexto, e
 * quanto se espera entre elas.
 *
 * 10 × 250ms cobre com folga o que foi medido: o processo de GPU do Chrome a
 * reiniciar demora abaixo de um segundo. O tecto existe para o caso em que a
 * GPU não volta — sem ele seria um canvas novo a cada 250ms, para sempre.
 */
const TENTATIVAS = 10;
const ESPERA = 250;

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
    /**
     * Seam de teste: a revelação já terminou.
     *
     * O relógio não serve para esperar por ela — e o defeito de reconstrução
     * que a `canvas-robustness` cobre só existe **depois** de ela acabar, com a
     * rampa já encerrada. Amostrado cedo demais, o teste mede a rampa a repor o
     * brilho e passa sempre. Como `__campoRenderer`, só é inequívoco em rota
     * com um campo só.
     */
    __campoRevelado?: boolean;
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
     * **O último valor escrito em cada uniform depois da criação.**
     *
     * O renderizador nasce com `configInicial` e daí em diante quem manda é o
     * handle, direto no uniform (AD-003) — o `escala` do scroll no hero, o
     * `brilho` da revelação. Esses valores vivem **dentro** do renderizador, e
     * um renderizador novo nasce sem eles: toda reconstrução devolvia o campo
     * ao estado de montagem.
     *
     * Isso era invisível enquanto reconstruir só acontecia por perda de
     * contexto — mas `usarMouse` é dep do efeito de criação, e ele é
     * `(hover: hover)`, que o *device toolbar* do DevTools troca ao entrar e
     * sair da emulação. Medido: o hero rebuilda com `brilho: 0` (que é como
     * nasce quem tem revelação), a rampa que o subiria já terminou e vive noutro
     * efeito, que não re-corre — **campo preto, e não voltava mais**. Era este o
     * defeito relatado, e não a perda de contexto.
     *
     * Um ref e não estado: reescrever isto por evento de scroll seria um render
     * do campo por quadro, que é exactamente o que o AD-003 proíbe.
     */
    const ultimos = useRef<{
      escala?: number;
      brilho?: number;
      escalaDoCampo?: number;
    }>({});

    /**
     * A revelação é gesto de **primeira montagem**, e por isso mora aqui e não
     * no efeito que a corre.
     *
     * Num ref ela sobrevive a toda reconstrução: o campo nasce preto uma vez, na
     * chegada, e uma troca de renderizador depois disso repõe o brilho que já
     * estava em vez de esmaecer 2,4s outra vez do preto.
     */
    const revelado = useRef(false);

    /**
     * Sobe sempre que o contexto WebGL cai, e é a **`key` do `<canvas>`**.
     *
     * Perder o contexto é rotina: o SO reclama a GPU, a aba fica em segundo
     * plano, ou o DevTools liga a emulação de dispositivo — este último foi o
     * que apareceu em uso, e o campo não voltava mais.
     *
     * **Esperar pelo `webglcontextrestored` não basta.** O evento só chega se o
     * browser decidir restaurar, e quando ele não chega o canvas fica preto
     * para sempre. Trocar a `key` resolve na raiz: o React descarta o nó e
     * monta outro, e um `<canvas>` novo dá um contexto novo — sem depender da
     * boa vontade de ninguém.
     */
    const [geracao, setGeracao] = useState(0);

    /**
     * **O contexto só nasce quando o campo se aproxima da tela.**
     *
     * Os três campos da home montavam juntos, no carregamento, e criar um
     * custa caro onde não há GPU: são dois programas com sete ruídos simplex
     * cada, e o SwiftShader traduz isso na main thread. Medido a 4x de CPU,
     * 1350×940: a home bloqueava **323 ms** contra 86 ms de `/projects`, que
     * tem um campo só — e dois dos três nem estavam na tela.
     *
     * A margem é maior que a do laço de quadros (200px): a criação tem de
     * estar pronta **antes** de o campo precisar desenhar, senão a compilação
     * cai no meio da rolagem. Uma vez criado, não se desfaz — quem decide se
     * desenha continua sendo a política de quadros.
     *
     * O `<canvas>` em si é renderizado desde sempre: adiar o elemento mudaria
     * o layout, e o que é caro é o contexto, não o nó.
     */
    /**
     * **O contexto só nasce quando o campo se aproxima da tela — e sem passar
     * por estado de React.**
     *
     * Os três campos da home nasciam juntos, no carregamento, e criar um custa
     * caro onde não há GPU: são dois programas com sete ruídos simplex cada, e
     * o SwiftShader traduz isso na main thread. Medido a 4x de CPU, 1350×940:
     * a home bloqueava **323 ms** contra 86 ms de `/projects`, que tem um
     * campo só — e dois dos três nem estavam na tela.
     *
     * **Um `useState` aqui seria o defeito que o AD-003 proíbe**: `setPerto`
     * ao rolar é um render do campo por seção que entra, e o sensor de
     * `performance.spec` pega. Por isso o observador chama `criar()` direto, e
     * o que sobrevive entre execuções do efeito é um ref.
     *
     * A margem é maior que a do laço de quadros (200px): a criação tem de
     * estar pronta **antes** de o campo precisar desenhar, senão a compilação
     * cai no meio da rolagem. O `<canvas>` em si é renderizado desde sempre —
     * adiar o elemento mudaria o layout, e o que é caro é o contexto.
     */
    const jaNasceu = useRef(false);

    /**
     * Quantas trocas de canvas seguidas já se gastaram a tentar reaver o
     * contexto. Zera a cada criação bem sucedida, então cada perda nova começa
     * com o orçamento inteiro. Ver `TENTATIVAS`.
     */
    const tentativas = useRef(0);

    useEffect(() => {
      const elemento = canvas.current;
      if (!elemento) return;

      // `preventDefault` mantém a porta aberta para o browser restaurar
      // sozinho; a troca de `key` cobre o caso em que ele não restaura.
      const trocarDeCanvas = (evento: Event) => {
        evento.preventDefault();
        setGeracao((n) => n + 1);
      };
      elemento.addEventListener("webglcontextlost", trocarDeCanvas);

      let renderizador: CampoWebGL | null = null;
      let observador: IntersectionObserver | null = null;
      let retentativa: ReturnType<typeof setTimeout> | undefined;

      const criar = () => {
        const atual = configInicial.current;
        renderizador = criarCampo(elemento, {
          escala: atual.escala,
          escalaDoCampo: atual.escalaDoCampo,
          // Nasce preto quando há revelação **por revelar**: o loop sobe daqui
          // até o valor calibrado. Sem revelação, ou já revelado, entra no valor
          // final — ver `revelado` e `ultimos`.
          brilho:
            atual.revelacao > 0 && !reducedMotion && !revelado.current
              ? 0
              : atual.brilho,
          contraste: atual.contraste,
          limiar: atual.limiar,
          raioDaBorda: atual.raioDaBorda,
          distorcao: atual.distorcao,
          cor: atual.cor,
          fundo: atual.fundo,
          usarMouse,
        });
        /**
         * Devolver `null` é "não deu **agora**" — contexto perdido, ou o
         * browser no teto de contextos vivos.
         *
         * **E "agora" tem de virar "daqui a pouco", senão é para sempre.** Um
         * `<canvas>` sem contexto nunca mais emite `webglcontextlost`, que é o
         * único gatilho que troca a `key`: falhando uma vez, não existe evento
         * nenhum capaz de acordar este campo outra vez. Era isto que se via ao
         * ligar o *device toolbar* do DevTools — o browser larga os contextos
         * de toda a página de uma vez e o processo de GPU reinicia, então a
         * recriação imediata apanha a GPU ainda a levantar-se, e o campo do
         * hero desaparecia sem erro nenhum e não voltava mais.
         *
         * A retentativa é uma **troca de canvas**, não outro `getContext` no
         * mesmo nó: quando o que voltou foi um contexto já perdido (o guarda
         * `isContextLost` de `criarCampo`), `getContext` devolve esse mesmo
         * objeto morto a todas as chamadas seguintes. Só um nó novo dá contexto
         * novo — a mesma razão pela qual `geracao` é a `key`.
         */
        if (!renderizador) {
          if (tentativas.current < TENTATIVAS) {
            tentativas.current++;
            retentativa = setTimeout(() => setGeracao((n) => n + 1), ESPERA);
          }
          return;
        }
        tentativas.current = 0;
        campo.current = renderizador;
        jaNasceu.current = true;

        /**
         * O que já tinha sido escrito volta **antes do primeiro quadro**, senão
         * o campo pisca no estado de montagem: no hero, a grelha do topo em vez
         * da que a rolagem já tinha pedido. Ver `ultimos`.
         */
        const { escala, brilho, escalaDoCampo } = ultimos.current;
        if (escala !== undefined) renderizador.definirEscala(escala);
        if (brilho !== undefined) renderizador.definirBrilho(brilho);
        if (escalaDoCampo !== undefined)
          renderizador.definirEscalaDoCampo(escalaDoCampo);
        if (process.env.NEXT_PUBLIC_E2E) window.__campoRenderer = renderizador;

        /**
         * **O tamanho antes do primeiro quadro.** O efeito que segue o
         * retângulo (abaixo) já correu quando o campo nasce mais tarde, e ele
         * escreve num `campo.current` que ainda era nulo: o renderizador
         * ficava no tamanho mínimo, `1×1`, e pintava um pixel. Sem erro
         * nenhum — só um campo que some, que foi como o teste de contraste da
         * home pegou ("o campo de partículas não estava pintando").
         */
        const caixa = elemento.getBoundingClientRect();
        renderizador.definirTamanho(caixa.width, caixa.height);

        /**
         * Um quadro já, sem esperar pelo laço: o campo tem imagem mesmo antes
         * de a política de quadros se pronunciar, e nunca existe um estado em
         * que o canvas está montado e preto à espera dela.
         */
        renderizador.desenhar(0);
      };

      if (jaNasceu.current) {
        // Já houve contexto neste canvas: um restauro não espera por
        // interseção nenhuma, o campo está à vista.
        criar();
      } else {
        observador = new IntersectionObserver(
          ([entrada]) => {
            if (!entrada.isIntersecting) return;
            observador?.disconnect();
            observador = null;
            criar();
          },
          { rootMargin: "600px", threshold: 0 },
        );
        observador.observe(elemento);
      }

      return () => {
        observador?.disconnect();
        clearTimeout(retentativa);
        elemento.removeEventListener("webglcontextlost", trocarDeCanvas);
        if (!renderizador) return;
        campo.current = null;
        /**
         * Só apaga o seam se ele ainda for **este** renderizador. Ao trocar de
         * rota o campo novo monta antes de o antigo ser limpo, e um `delete`
         * cego apagava o ponteiro que o novo acabara de escrever — o e2e ficava
         * à espera de um renderer que existia.
         */
        if (
          process.env.NEXT_PUBLIC_E2E &&
          window.__campoRenderer === renderizador
        ) {
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
      // `geracao`: o contexto perdido troca o `<canvas>`, e um observador
      // preso ao nó antigo nunca mais mede nada.
    }, [geracao]);

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

    /**
     * **Um quadro avulso, e é o que o `invalidate()` do R3F fazia.**
     *
     * Sob movimento reduzido o laço não corre, mas o hero continua a escrever a
     * escala do campo a cada evento de scroll. Sem repintar, essa escrita não
     * chegava ao ecrã e o campo ficava congelado na densidade da montagem. Com
     * o laço a correr não há nada a fazer: o quadro seguinte já leva o valor.
     */
    const emLaco = useRef(false);
    const quadroPedido = useRef(0);
    const pedirQuadro = useCallback(() => {
      if (emLaco.current || quadroPedido.current) return;
      quadroPedido.current = requestAnimationFrame(() => {
        quadroPedido.current = 0;
        campo.current?.desenhar(0);
      });
    }, []);

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
      // `revelado` é ref de componente, não local do efeito: ele re-corre a
      // cada troca de `<canvas>` e a revelação não pode recomeçar do preto.
      const marcarRevelado = () => {
        revelado.current = true;
        if (process.env.NEXT_PUBLIC_E2E) window.__campoRevelado = true;
      };
      if (!(revelacao > 0) || reducedMotion) marcarRevelado();

      const desenharUm = () => {
        campo.current?.desenhar(0);
      };

      const laco = (agora: number) => {
        const delta = ultimo ? (agora - ultimo) / 1000 : 0;
        ultimo = agora;
        if (delta > 0 && delta < 0.5) tempo += delta;

        if (!revelado.current) {
          const progresso = Math.min(1, tempo / revelacao);
          const valor = brilhoFinal * suavizar(progresso);
          ultimos.current.brilho = valor;
          campo.current?.definirBrilho(valor);
          if (progresso >= 1) marcarRevelado();
        }

        campo.current?.desenhar(delta);
        pedido = requestAnimationFrame(laco);
      };

      const avaliar = () => {
        const deveCorrer = visivel && !oculta && !reducedMotion;
        emLaco.current = deveCorrer;
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
        emLaco.current = false;
        if (pedido) cancelAnimationFrame(pedido);
        if (quadroPedido.current) cancelAnimationFrame(quadroPedido.current);
      };
      // `geracao` pela mesma razão do observador de tamanho: o nó muda.
    }, [reducedMotion, suavizar, geracao]);

    // ── Handle imperativo (AD-003) ─────────────────────────────────────────
    const handle = useMemo<CampoHandle>(
      () => ({
        // Cada escrita fica gravada em `ultimos` para sobreviver a uma troca de
        // renderizador. É uma atribuição de propriedade por evento, ao lado de
        // uma escrita de uniform que já acontecia: nada por quadro muda.
        definirEscala: (valor) => {
          ultimos.current.escala = valor;
          campo.current?.definirEscala(valor);
          pedirQuadro();
        },
        definirBrilho: (valor) => {
          ultimos.current.brilho = valor;
          campo.current?.definirBrilho(valor);
          pedirQuadro();
        },
        definirEscalaDoCampo: (valor) => {
          ultimos.current.escalaDoCampo = valor;
          campo.current?.definirEscalaDoCampo(valor);
          pedirQuadro();
        },
      }),
      [pedirQuadro],
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
        /**
         * A `key` é a geração: contexto perdido troca o nó, e nó novo dá
         * contexto novo. Ver `geracao`.
         */
        key={geracao}
        ref={canvas}
        aria-hidden
        className="canvas-do-campo absolute inset-0"
        style={{ pointerEvents: "none" }}
      />
    );
  },
);
