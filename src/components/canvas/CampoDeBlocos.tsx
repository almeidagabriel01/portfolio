"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { cubicBezier } from "motion/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { EASE } from "@/lib/motion";
import {
  blocosFragmentGLSL,
  campoFragmentGLSL,
  flowmapFragmentGLSL,
  vertexGLSL,
} from "./field.glsl";

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
  }
}

/**
 * Um render target do tamanho do rastro, criado uma vez e descartado no
 * desmonte.
 *
 * **Isto era `useFBO` do drei, e a troca é de peso, não de estilo.** O `useFBO`
 * é a única coisa que o projeto ainda importava de `@react-three/drei`, e o
 * pacote não se deixa tree-shakear: o chunk do campo carregava a biblioteca
 * inteira por causa de um hook de dez linhas. Estas são as dez linhas.
 */
function useAlvoDeRender(
  tamanho: number,
  opcoes: THREE.RenderTargetOptions,
): THREE.WebGLRenderTarget {
  /**
   * Só na montagem, e as deps ficam de fora de propósito: `opcoes` é um literal
   * do call site, recriado a cada render com o mesmo conteúdo, e incluí-lo
   * criaria um render target novo por render — dois contextos de textura
   * vazando por frame. O tamanho é constante.
   */
  const alvo = useMemo(
    () => new THREE.WebGLRenderTarget(tamanho, tamanho, opcoes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => () => alvo.dispose(), [alvo]);
  return alvo;
}

/** Resolução do rastro. 256² é o suficiente: ele é borrado por natureza. */
const RESOLUCAO_DO_FLUXO = 256;
/**
 * O alvo do campo é redimensionado em degraus, não a cada pixel de grelha.
 *
 * A escala do hero é escrita a cada evento de scroll (0.41 → 1), e a grelha
 * acompanha: sem degrau, o alvo seria realocado ~60x/s durante a rolagem, que
 * é troca de textura na GPU por frame. Com degrau de 64 a rolagem inteira cabe
 * em uma dezena de realocações, ao custo de até 63 colunas de texels
 * calculados à toa — ~5% no hero.
 */
const DEGRAU_DO_ALVO = 64;
const emDegraus = (n: number) =>
  Math.max(DEGRAU_DO_ALVO, Math.ceil(n / DEGRAU_DO_ALVO) * DEGRAU_DO_ALVO);
/** Quanto do rastro sobrevive a cada frame. */
const DISSIPACAO = 0.98;
/** Raio do carimbo do cursor, em UV. */
const RAIO = 0.15;
/** O rastro perde 20% da velocidade por frame: é o que dá o rabo do cometa. */
const AMORTECIMENTO = 0.8;

interface Props {
  opcoes?: OpcoesDoCampo;
  /** Liga o rastro do mouse. Custa dois render targets e um render por frame. */
  usarMouse?: boolean;
  /** Elemento que define o retângulo do efeito, para mapear o ponteiro. */
  alvoDoPonteiro?: React.RefObject<HTMLElement | null>;
}

export const CampoDeBlocos = forwardRef<CampoHandle, Props>(
  function CampoDeBlocos(
    { opcoes, usarMouse = false, alvoDoPonteiro },
    referencia,
  ) {
    const config = { ...CAMPO_PADRAO, ...opcoes };
    /**
     * Seletor por fatia, e não `useThree()` cru: sem seletor este componente
     * assina o store inteiro e re-renderiza a cada mudança de estado do R3F —
     * `frameloop` inclusive, que agora muda quando o campo entra e sai da tela.
     * O AD-003 quer este componente **fora** do caminho de render.
     */
    const size = useThree((estado) => estado.size);
    const viewport = useThree((estado) => estado.viewport);
    const invalidate = useThree((estado) => estado.invalidate);

    // Efeito sem deps: roda depois de todo render. Ver o seam acima.
    useEffect(() => {
      if (!process.env.NEXT_PUBLIC_E2E) return;
      window.__campoRenders = (window.__campoRenders ?? 0) + 1;
    });

    // ── Rastro do mouse ────────────────────────────────────────────────────
    // Dois alvos em ping-pong. `HalfFloatType` porque a velocidade é assinada
    // e satura feio em 8 bits.
    const alvoA = useAlvoDeRender(RESOLUCAO_DO_FLUXO, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
    const alvoB = useAlvoDeRender(RESOLUCAO_DO_FLUXO, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
    const pingPong = useRef({ leitura: alvoA, escrita: alvoB });

    const mouse = useRef(new THREE.Vector2(0.5, 0.5));
    const mouseAnterior = useRef(new THREE.Vector2(0.5, 0.5));
    const velocidade = useRef(new THREE.Vector2());

    /**
     * Cena privada para o rastro. Imperativa e não via `createPortal`: ela tem
     * um objeto só, é renderizada à mão dentro do `useFrame`, e nunca precisa
     * participar da árvore do React.
     */
    const fluxo = useMemo(() => {
      const cena = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const material = new THREE.ShaderMaterial({
        vertexShader: vertexGLSL,
        fragmentShader: flowmapFragmentGLSL,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uAnterior: { value: null as THREE.Texture | null },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uVelocidade: { value: new THREE.Vector2() },
          uAspecto: { value: 1 },
          uRaio: { value: RAIO },
          uDissipacao: { value: DISSIPACAO },
        },
      });
      cena.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
      return { cena, camera, material };
    }, []);

    useEffect(
      () => () => {
        fluxo.material.dispose();
        fluxo.cena.traverse((no) => {
          if (no instanceof THREE.Mesh) no.geometry.dispose();
        });
      },
      [fluxo],
    );

    const aoMoverPonteiro = useCallback(
      (evento: PointerEvent) => {
        const alvo = alvoDoPonteiro?.current;
        if (!alvo) return;
        // Leitura de layout por evento de ponteiro. É barata porque nada muda
        // o layout entre eventos, e evita ter de compensar o scroll do Lenis à
        // mão sobre um retângulo memorizado, que é onde essa conta erra.
        const caixa = alvo.getBoundingClientRect();
        if (caixa.width === 0 || caixa.height === 0) return;

        const x = (evento.clientX - caixa.left) / caixa.width;
        const y = 1 - (evento.clientY - caixa.top) / caixa.height;

        mouse.current.set(x, y);
        velocidade.current
          .subVectors(mouse.current, mouseAnterior.current)
          .multiplyScalar(5);
        mouseAnterior.current.copy(mouse.current);
      },
      [alvoDoPonteiro],
    );

    useEffect(() => {
      if (!usarMouse) return;
      window.addEventListener("pointermove", aoMoverPonteiro, {
        passive: true,
      });
      return () => window.removeEventListener("pointermove", aoMoverPonteiro);
    }, [usarMouse, aoMoverPonteiro]);

    // ── Pass principal ─────────────────────────────────────────────────────
    const material = useRef<THREE.ShaderMaterial>(null);

    /**
     * A revelação do campo, e por que ela é do `brilho` e não da opacidade.
     *
     * O campo entra **emergindo do preto**: os blocos vão cruzando o limiar até
     * a cobertura calibrada, em vez de a camada inteira esmaecer. Esmaecer o
     * canvas misturaria o campo com o que está por baixo e mudaria a
     * composição; deslizar o `brilho` mantém o efeito de 1 bit exato em todo
     * quadro — só há menos blocos acesos.
     *
     * Sob movimento reduzido não há revelação nenhuma, e não é só preferência:
     * ali o `frameloop` é `demand`, um único quadro é desenhado, e uma rampa
     * dependente de quadros congelaria o campo preto para sempre.
     */
    const reducedMotion = useReducedMotion();
    const revelando = config.revelacao > 0 && !reducedMotion;
    const revelado = useRef(!revelando);
    const suavizar = useMemo(() => cubicBezier(...EASE.OUT_EXPO), []);

    /**
     * O alvo do campo: um texel por bloco, `NEAREST` nas duas pontas.
     *
     * Nasce mínimo e é dimensionado no primeiro frame, quando o tamanho do
     * canvas e a escala corrente já são conhecidos. Filtro linear aqui
     * desfaria o efeito: entre dois blocos vizinhos apareceria meia cor, e o
     * campo é de 1 bit por definição.
     */
    const alvoDoCampo = useMemo(() => {
      const alvo = new THREE.WebGLRenderTarget(
        DEGRAU_DO_ALVO,
        DEGRAU_DO_ALVO,
        {
          minFilter: THREE.NearestFilter,
          magFilter: THREE.NearestFilter,
          depthBuffer: false,
          generateMipmaps: false,
        },
      );
      return alvo;
    }, []);
    useEffect(() => () => alvoDoCampo.dispose(), [alvoDoCampo]);

    /**
     * A cena do passe de blocos. Imperativa pelo mesmo motivo da do rastro: um
     * objeto só, renderizada à mão dentro do `useFrame`, nunca precisa
     * participar da árvore do React.
     *
     * **Estes uniforms são os únicos que o cálculo lê.** O material da tela
     * ficou com a cor, o recorte e o mapa de blocos; tudo que alimenta o ruído
     * mora aqui, e é aqui que o handle imperativo escreve.
     */
    const blocos = useMemo(() => {
      const cena = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const material = new THREE.ShaderMaterial({
        vertexShader: vertexGLSL,
        fragmentShader: blocosFragmentGLSL,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uFlowmap: { value: null as THREE.Texture | null },
          uBlocos: { value: new THREE.Vector2(1, 1) },
          uDeslocamento: { value: new THREE.Vector2() },
          uAspecto: { value: 1 },
          uEscalaDoCampo: { value: config.escalaDoCampo },
          // Nasce preto quando há revelação: o `useFrame` sobe daqui até o
          // valor calibrado. Sem revelação, entra já no valor final.
          uBrilho: { value: revelando ? 0 : config.brilho },
          uContraste: { value: config.contraste },
          uLimiar: { value: config.limiar },
          uDistorcao: { value: config.distorcao },
          uTempo: { value: 0 },
        },
      });
      cena.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
      return { cena, camera, material };
      // Só na montagem: daqui em diante quem escreve nos uniforms é o
      // `useFrame` e o handle imperativo (AD-003, nada disso passa por render).
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(
      () => () => {
        blocos.material.dispose();
        blocos.cena.traverse((no) => {
          if (no instanceof THREE.Mesh) no.geometry.dispose();
        });
      },
      [blocos],
    );

    /**
     * A escala vive num ref, e não num uniform, porque quem a consome é a
     * **CPU**: é dela que sai a contagem de blocos, e a contagem tem de ser o
     * mesmo float nos dois passes (ver `field.glsl.ts`). Calculá-la duas vezes
     * em GLSL abriria a porta a um bloco de diferença no arredondamento.
     */
    const escala = useRef(config.escala);

    const uniforms = useMemo(
      () => ({
        uCampo: { value: alvoDoCampo.texture },
        uCor: { value: new THREE.Color(config.cor) },
        uFundo: { value: new THREE.Color(config.fundo) },
        uBlocos: { value: new THREE.Vector2(1, 1) },
        uDeslocamento: { value: new THREE.Vector2() },
        uTamanhoDoAlvo: { value: new THREE.Vector2(1, 1) },
        uRaioDaBorda: { value: config.raioDaBorda },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    const handle = useMemo<CampoHandle>(
      () => ({
        definirEscala(valor) {
          escala.current = valor;
          invalidate();
        },
        definirBrilho(valor) {
          blocos.material.uniforms.uBrilho.value = valor;
          invalidate();
        },
        definirEscalaDoCampo(valor) {
          blocos.material.uniforms.uEscalaDoCampo.value = valor;
          invalidate();
        },
      }),
      [blocos, invalidate],
    );

    useImperativeHandle(referencia, () => handle, [handle]);

    useEffect(() => {
      if (!process.env.NEXT_PUBLIC_E2E) return;
      window.__campo = handle;
      return () => {
        delete window.__campo;
      };
    }, [handle]);

    /**
     * Relógio com guarda: delta ≥ 0.5s é descartado.
     *
     * Sem isso, voltar para a aba depois de um minuto entrega um delta enorme e
     * o campo **salta** para outra configuração em um frame, em vez de
     * continuar de onde parou.
     */
    const tempo = useRef(0);
    const ultimoTique = useRef(0);

    useFrame(({ gl, clock }) => {
      const naTela = material.current;
      if (!naTela) return;
      const alvo = blocos.material;

      const agora = clock.getElapsedTime();
      const delta = agora - ultimoTique.current;
      ultimoTique.current = agora;
      if (delta > 0 && delta < 0.5) tempo.current += delta;
      alvo.uniforms.uTempo.value = tempo.current;

      // `tempo.current` só corre quando há quadros, então um campo que entra
      // na tela mais tarde revela-se quando aparece, e não a meio.
      if (!revelado.current) {
        const progresso = Math.min(1, tempo.current / config.revelacao);
        alvo.uniforms.uBrilho.value = config.brilho * suavizar(progresso);
        if (progresso >= 1) revelado.current = true;
      }

      const aspecto = size.height > 0 ? size.width / size.height : 1;
      alvo.uniforms.uAspecto.value = aspecto;
      fluxo.material.uniforms.uAspecto.value = aspecto;

      /**
       * A grelha, calculada uma vez e distribuída aos dois passes. O `+2` é a
       * folga do arredondamento: o id vai de `floor(-blocos/2)` a
       * `ceil(blocos/2) - 1`, o que é um texel a mais que a parte inteira em
       * cada ponta.
       */
      const porLado = Math.max(size.width, size.height) * escala.current;
      const blocosX = porLado * aspecto;
      alvo.uniforms.uBlocos.value.set(blocosX, porLado);
      naTela.uniforms.uBlocos.value.copy(alvo.uniforms.uBlocos.value);

      const larguraDoAlvo = emDegraus(Math.ceil(blocosX) + 2);
      const alturaDoAlvo = emDegraus(Math.ceil(porLado) + 2);
      if (
        alvoDoCampo.width !== larguraDoAlvo ||
        alvoDoCampo.height !== alturaDoAlvo
      ) {
        alvoDoCampo.setSize(larguraDoAlvo, alturaDoAlvo);
      }
      const deslocX = Math.floor(larguraDoAlvo / 2);
      const deslocY = Math.floor(alturaDoAlvo / 2);
      alvo.uniforms.uDeslocamento.value.set(deslocX, deslocY);

      naTela.uniforms.uDeslocamento.value.set(deslocX, deslocY);
      naTela.uniforms.uTamanhoDoAlvo.value.set(larguraDoAlvo, alturaDoAlvo);

      // Salva e restaura: deixar o renderer apontando para um render target
      // deixa a tela preta.
      const alvoAnterior = gl.getRenderTarget();
      const autoClearAnterior = gl.autoClear;
      gl.autoClear = false;

      if (usarMouse) {
        const { leitura, escrita } = pingPong.current;
        fluxo.material.uniforms.uAnterior.value = leitura.texture;
        fluxo.material.uniforms.uMouse.value.copy(mouse.current);
        fluxo.material.uniforms.uVelocidade.value.copy(velocidade.current);

        gl.setRenderTarget(escrita);
        gl.clear();
        gl.render(fluxo.cena, fluxo.camera);

        pingPong.current = { leitura: escrita, escrita: leitura };
        alvo.uniforms.uFlowmap.value = escrita.texture;

        velocidade.current.multiplyScalar(AMORTECIMENTO);
      }

      // O campo, um texel por bloco. É o único passe caro do frame, e é por
      // isso que ele não roda na resolução da tela.
      gl.setRenderTarget(alvoDoCampo);
      gl.clear();
      gl.render(blocos.cena, blocos.camera);

      gl.setRenderTarget(alvoAnterior);
      gl.autoClear = autoClearAnterior;
    });

    // O `<View>` reporta o tamanho do retângulo que ele segue; um frame único é
    // pedido a cada mudança para o caso de `frameloop="demand"`.
    useEffect(() => {
      invalidate();
    }, [invalidate, viewport.width, viewport.height]);

    return (
      <mesh frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={material}
          vertexShader={vertexGLSL}
          fragmentShader={campoFragmentGLSL}
          uniforms={uniforms}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    );
  },
);
