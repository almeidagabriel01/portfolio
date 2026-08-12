"use client";

import { useFBO } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import {
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

/** Resolução do rastro. 256² é o suficiente: ele é borrado por natureza. */
const RESOLUCAO_DO_FLUXO = 256;
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
  /** Elemento que define o retângulo do efeito, o mesmo que o `<View>` segue. */
  alvoDoPonteiro?: React.RefObject<HTMLElement | null>;
}

export const CampoDeBlocos = forwardRef<CampoHandle, Props>(
  function CampoDeBlocos(
    { opcoes, usarMouse = false, alvoDoPonteiro },
    referencia,
  ) {
    const config = { ...CAMPO_PADRAO, ...opcoes };
    const { size, viewport, invalidate } = useThree();

    // Efeito sem deps: roda depois de todo render. Ver o seam acima.
    useEffect(() => {
      if (!process.env.NEXT_PUBLIC_E2E) return;
      window.__campoRenders = (window.__campoRenders ?? 0) + 1;
    });

    // ── Rastro do mouse ────────────────────────────────────────────────────
    // Dois alvos em ping-pong. `HalfFloatType` porque a velocidade é assinada
    // e satura feio em 8 bits.
    const alvoA = useFBO(RESOLUCAO_DO_FLUXO, RESOLUCAO_DO_FLUXO, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
    const alvoB = useFBO(RESOLUCAO_DO_FLUXO, RESOLUCAO_DO_FLUXO, {
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
     * **Escreva sempre por aqui, nunca no objeto `uniforms` abaixo.**
     *
     * O R3F não guarda o objeto que você passa em `<shaderMaterial
     * uniforms={...}>`. Ele copia campo a campo para dentro do material
     * (`applyProps`: "ShaderMaterial uniforms must keep a stable target
     * reference" → `Object.assign(targetUniform, uniform)`). O objeto local
     * vira, a partir daí, só o **valor inicial**: mutá-lo não chega ao shader.
     *
     * O sintoma é traiçoeiro: nenhum erro, nenhum warning, o shader compila e
     * desenha, e o campo simplesmente fica congelado no estado inicial. Foi o
     * que aconteceu aqui: `uTempo` e `uEscala` não saíam do lugar.
     */
    const escrever = useCallback((nome: string, valor: number) => {
      const uniform = material.current?.uniforms[nome];
      if (uniform) uniform.value = valor;
    }, []);

    const uniforms = useMemo(
      () => ({
        uFlowmap: { value: null as THREE.Texture | null },
        uCor: { value: new THREE.Color(config.cor) },
        uFundo: { value: new THREE.Color(config.fundo) },
        uResolucao: { value: new THREE.Vector2(1, 1) },
        uAspecto: { value: 1 },
        uEscala: { value: config.escala },
        uEscalaDoCampo: { value: config.escalaDoCampo },
        uBrilho: { value: config.brilho },
        uContraste: { value: config.contraste },
        uLimiar: { value: config.limiar },
        uRaioDaBorda: { value: config.raioDaBorda },
        uDistorcao: { value: config.distorcao },
        uTempo: { value: 0 },
      }),
      // Só na montagem: daqui em diante quem escreve nos uniforms é o
      // `useFrame` e o handle imperativo (AD-003, nada disso passa por render).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    const handle = useMemo<CampoHandle>(
      () => ({
        definirEscala(valor) {
          escrever("uEscala", valor);
          invalidate();
        },
        definirBrilho(valor) {
          escrever("uBrilho", valor);
          invalidate();
        },
        definirEscalaDoCampo(valor) {
          escrever("uEscalaDoCampo", valor);
          invalidate();
        },
      }),
      [escrever, invalidate],
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
      const alvo = material.current;
      if (!alvo) return;

      const agora = clock.getElapsedTime();
      const delta = agora - ultimoTique.current;
      ultimoTique.current = agora;
      if (delta > 0 && delta < 0.5) tempo.current += delta;
      alvo.uniforms.uTempo.value = tempo.current;

      const aspecto = size.height > 0 ? size.width / size.height : 1;
      alvo.uniforms.uResolucao.value.set(size.width, size.height);
      alvo.uniforms.uAspecto.value = aspecto;
      fluxo.material.uniforms.uAspecto.value = aspecto;

      if (!usarMouse) return;

      const { leitura, escrita } = pingPong.current;
      fluxo.material.uniforms.uAnterior.value = leitura.texture;
      fluxo.material.uniforms.uMouse.value.copy(mouse.current);
      fluxo.material.uniforms.uVelocidade.value.copy(velocidade.current);

      // Salva e restaura: o `<View>` do drei também mexe nesses dois, e deixar
      // o renderer apontando para o FBO deixa a tela preta.
      const alvoAnterior = gl.getRenderTarget();
      const autoClearAnterior = gl.autoClear;
      gl.setRenderTarget(escrita);
      gl.autoClear = false;
      gl.clear();
      gl.render(fluxo.cena, fluxo.camera);
      gl.setRenderTarget(alvoAnterior);
      gl.autoClear = autoClearAnterior;

      pingPong.current = { leitura: escrita, escrita: leitura };
      alvo.uniforms.uFlowmap.value = escrita.texture;

      velocidade.current.multiplyScalar(AMORTECIMENTO);
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
