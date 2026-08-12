import {
  campoFragmentGLSL,
  flowmapFragmentGLSL,
  vertexGLSL,
} from "./field.glsl";

/**
 * O campo de blocos em WebGL2 direto, sem motor 3D.
 *
 * ### Por que não three.js
 *
 * O efeito é **um quadrilátero de tela cheia com dois fragment shaders** e dois
 * framebuffers em ping-pong para o rastro do ponteiro. Não há cena, câmera,
 * malha, material, luz, nem grafo — nada do que um motor 3D existe para
 * resolver. Ainda assim, o `three` mais o `@react-three/fiber` custavam 244 kB
 * comprimidos e 898 kB depois de descomprimir, dos quais **53% nunca chegava a
 * executar**: animação esquelética, `AnimationMixer`, geração de environment
 * maps, maquinaria de geometria.
 *
 * O preço aparecia onde dói, que é o processador de um telemóvel comum. Medido
 * com a CPU 8x mais lenta, a mesma página com e sem o campo: **TBT de 400ms
 * contra 70ms**, e 78 contra 96 de desempenho. Não era a animação nem a duração
 * dela — era o motor.
 *
 * ### O que ficou igual
 *
 * **Os shaders são os mesmos ficheiros, sem uma vírgula mudada.** Eles já eram
 * GLSL ES 1.00, que o WebGL2 aceita tal como está, então o que aqui se
 * acrescenta são só as duas declarações de atributo que o three injetava por
 * baixo do pano (`position` e `uv`). É essa reutilização literal que garante
 * que o pixel é o mesmo, e não uma reimplementação parecida.
 *
 * Três detalhes que o three fazia por baixo e que estão replicados à mão,
 * porque cada um deles muda a imagem se ficar de fora:
 *
 * 1. **A cor vai linearizada.** O `THREE.Color` converte de sRGB para linear ao
 *    construir, e o canvas saía sem reconversão na apresentação. Resultado
 *    medido em produção: `#d09332` chega ao ecrã como `rgb(161,74,8)`. É a
 *    conversão que `paraLinear` refaz — passar o hex cru clarearia o âmbar
 *    inteiro.
 * 2. **O device pixel ratio é limitado a 2**, como o `dpr={[1, 2]}` do
 *    invólucro anterior: num ecrã 3x seguir o `devicePixelRatio` triplicaria a
 *    área a pintar sem que a grelha de 1 bit ganhasse nada.
 * 3. **`uResolucao` é o tamanho em pixels de CSS**, não o do buffer. É dele que
 *    sai `blocos = max(resolucao) * escala`, então usar o buffer mudaria o
 *    tamanho do bloco conforme a densidade do ecrã.
 *
 * A ordem dos passes também é a de antes: o rastro é desenhado **antes** do
 * pass principal do mesmo quadro, que é a ordem em que o `useFrame` corria
 * contra o render da cena.
 */

/** Resolução do rastro. 256² é o suficiente: ele é borrado por natureza. */
const RESOLUCAO_DO_FLUXO = 256;
/** Quanto do rastro sobrevive a cada frame. */
const DISSIPACAO = 0.98;
/** Raio do carimbo do cursor, em UV. */
const RAIO = 0.15;
/** O rastro perde 20% da velocidade por frame: é o que dá o rabo do cometa. */
const AMORTECIMENTO = 0.8;
/** O teto do `dpr`, como no invólucro anterior. */
const DPR_MAXIMO = 2;

export interface ConfiguracaoDoCampo {
  escala: number;
  escalaDoCampo: number;
  brilho: number;
  contraste: number;
  limiar: number;
  raioDaBorda: number;
  distorcao: number;
  cor: string;
  fundo: string;
  usarMouse: boolean;
}

/**
 * sRGB → linear, a mesma transferência que o `THREE.Color` aplica.
 *
 * Não é `pow(x, 2.2)`: a curva do sRGB tem um troço linear perto do zero, e é
 * essa forma exata que produz o `rgb(161,74,8)` medido.
 */
function paraLinear(canal: number): number {
  return canal < 0.04045
    ? canal / 12.92
    : ((canal + 0.055) / 1.055) ** 2.4;
}

function corParaVec3(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [
    paraLinear(((n >> 16) & 255) / 255),
    paraLinear(((n >> 8) & 255) / 255),
    paraLinear((n & 255) / 255),
  ];
}

function compilar(
  gl: WebGL2RenderingContext,
  tipo: number,
  fonte: string,
): WebGLShader {
  const shader = gl.createShader(tipo);
  if (!shader) throw new Error("shader não pôde ser criado");
  gl.shaderSource(shader, fonte);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader não compilou: ${log}`);
  }
  return shader;
}

/**
 * O que o three injetava no topo de todo vertex shader de `ShaderMaterial`.
 * Só estes dois atributos são lidos pelo nosso vértice.
 */
const ATRIBUTOS = /* glsl */ `
attribute vec3 position;
attribute vec2 uv;
`;

function criarPrograma(
  gl: WebGL2RenderingContext,
  fragmento: string,
): WebGLProgram {
  const programa = gl.createProgram();
  if (!programa) throw new Error("programa não pôde ser criado");
  const vs = compilar(gl, gl.VERTEX_SHADER, ATRIBUTOS + vertexGLSL);
  const fs = compilar(gl, gl.FRAGMENT_SHADER, fragmento);
  gl.attachShader(programa, vs);
  gl.attachShader(programa, fs);
  gl.linkProgram(programa);
  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) {
    throw new Error(`programa não linkou: ${gl.getProgramInfoLog(programa)}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return programa;
}

/** Um alvo do ping-pong: textura de meia precisão mais o seu framebuffer. */
function criarAlvo(gl: WebGL2RenderingContext, meiaPrecisao: boolean) {
  const textura = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textura);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    meiaPrecisao ? gl.RGBA16F : gl.RGBA8,
    RESOLUCAO_DO_FLUXO,
    RESOLUCAO_DO_FLUXO,
    0,
    gl.RGBA,
    meiaPrecisao ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
    null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    textura,
    0,
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { textura, fbo };
}

export interface CampoWebGL {
  readonly domElement: HTMLCanvasElement;
  /** Contadores no formato que os seams de e2e já liam do renderer do three. */
  readonly info: { render: { frame: number; calls: number } };
  getPixelRatio(): number;
  /** Tamanho em pixels de CSS. */
  definirTamanho(largura: number, altura: number): void;
  definirPonteiro(x: number, y: number): void;
  definirEscala(valor: number): void;
  definirBrilho(valor: number): void;
  definirEscalaDoCampo(valor: number): void;
  /** Desenha um quadro. `delta` em segundos. */
  desenhar(delta: number): void;
  destruir(): void;
}

export function criarCampo(
  canvas: HTMLCanvasElement,
  config: ConfiguracaoDoCampo,
): CampoWebGL | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  /**
   * Meia precisão porque a velocidade do ponteiro é **assinada** e satura feio
   * em 8 bits. Sem a extensão o rastro continua a funcionar, só com menos
   * alcance — melhor que ficar sem ele.
   */
  const meiaPrecisao = Boolean(
    gl.getExtension("EXT_color_buffer_float") ??
      gl.getExtension("EXT_color_buffer_half_float"),
  );

  const programaDoCampo = criarPrograma(gl, campoFragmentGLSL);
  const programaDoFluxo = criarPrograma(gl, flowmapFragmentGLSL);

  // Quadrilátero de tela cheia: o mesmo que o `planeGeometry args={[2, 2]}`
  // entregava, em `TRIANGLE_STRIP` para dispensar índices.
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const posicoes = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posicoes);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    // prettier-ignore
    new Float32Array([-1, -1, 0,  1, -1, 0,  -1, 1, 0,  1, 1, 0]),
    gl.STATIC_DRAW,
  );
  const uvs = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvs);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    // prettier-ignore
    new Float32Array([0, 0,  1, 0,  0, 1,  1, 1]),
    gl.STATIC_DRAW,
  );

  for (const programa of [programaDoCampo, programaDoFluxo]) {
    const iPos = gl.getAttribLocation(programa, "position");
    const iUv = gl.getAttribLocation(programa, "uv");
    gl.bindVertexArray(vao);
    if (iPos >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, posicoes);
      gl.enableVertexAttribArray(iPos);
      gl.vertexAttribPointer(iPos, 3, gl.FLOAT, false, 0, 0);
    }
    if (iUv >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, uvs);
      gl.enableVertexAttribArray(iUv);
      gl.vertexAttribPointer(iUv, 2, gl.FLOAT, false, 0, 0);
    }
  }

  const u = (programa: WebGLProgram, nome: string) =>
    gl.getUniformLocation(programa, nome);

  const uCampo = {
    uFlowmap: u(programaDoCampo, "uFlowmap"),
    uCor: u(programaDoCampo, "uCor"),
    uFundo: u(programaDoCampo, "uFundo"),
    uResolucao: u(programaDoCampo, "uResolucao"),
    uAspecto: u(programaDoCampo, "uAspecto"),
    uEscala: u(programaDoCampo, "uEscala"),
    uEscalaDoCampo: u(programaDoCampo, "uEscalaDoCampo"),
    uBrilho: u(programaDoCampo, "uBrilho"),
    uContraste: u(programaDoCampo, "uContraste"),
    uLimiar: u(programaDoCampo, "uLimiar"),
    uRaioDaBorda: u(programaDoCampo, "uRaioDaBorda"),
    uDistorcao: u(programaDoCampo, "uDistorcao"),
    uTempo: u(programaDoCampo, "uTempo"),
  };
  const uFluxo = {
    uAnterior: u(programaDoFluxo, "uAnterior"),
    uMouse: u(programaDoFluxo, "uMouse"),
    uVelocidade: u(programaDoFluxo, "uVelocidade"),
    uAspecto: u(programaDoFluxo, "uAspecto"),
    uRaio: u(programaDoFluxo, "uRaio"),
    uDissipacao: u(programaDoFluxo, "uDissipacao"),
  };

  let a = criarAlvo(gl, meiaPrecisao);
  let b = criarAlvo(gl, meiaPrecisao);

  const dpr = Math.min(globalThis.devicePixelRatio || 1, DPR_MAXIMO);
  let largura = 1;
  let altura = 1;
  let tempo = 0;

  const escalaAtual = { valor: config.escala };
  const brilhoAtual = { valor: config.brilho };
  const escalaDoCampoAtual = { valor: config.escalaDoCampo };

  const mouse = { x: 0.5, y: 0.5 };
  const anterior = { x: 0.5, y: 0.5 };
  const velocidade = { x: 0, y: 0 };

  const cor = corParaVec3(config.cor);
  const fundo = corParaVec3(config.fundo);
  const info = { render: { frame: 0, calls: 0 } };

  // Constantes do programa do campo, escritas uma vez.
  gl.useProgram(programaDoCampo);
  gl.uniform3f(uCampo.uCor, cor[0], cor[1], cor[2]);
  gl.uniform3f(uCampo.uFundo, fundo[0], fundo[1], fundo[2]);
  gl.uniform1f(uCampo.uContraste, config.contraste);
  gl.uniform1f(uCampo.uLimiar, config.limiar);
  gl.uniform1f(uCampo.uRaioDaBorda, config.raioDaBorda);
  gl.uniform1f(uCampo.uDistorcao, config.distorcao);
  gl.uniform1i(uCampo.uFlowmap, 0);
  gl.useProgram(programaDoFluxo);
  gl.uniform1f(uFluxo.uRaio, RAIO);
  gl.uniform1f(uFluxo.uDissipacao, DISSIPACAO);
  gl.uniform1i(uFluxo.uAnterior, 0);

  gl.disable(gl.DEPTH_TEST);

  return {
    domElement: canvas,
    info,
    getPixelRatio: () => dpr,

    definirTamanho(l, h) {
      largura = Math.max(1, l);
      altura = Math.max(1, h);
      // Arredondar para cima: caixa fracionária faz o browser reamostrar um
      // efeito de 1 bit, e a cobertura muda de verdade (medido).
      canvas.width = Math.ceil(largura * dpr);
      canvas.height = Math.ceil(altura * dpr);
    },

    definirPonteiro(x, y) {
      mouse.x = x;
      mouse.y = y;
      velocidade.x = (mouse.x - anterior.x) * 5;
      velocidade.y = (mouse.y - anterior.y) * 5;
      anterior.x = mouse.x;
      anterior.y = mouse.y;
    },

    definirEscala(valor) {
      escalaAtual.valor = valor;
    },
    definirBrilho(valor) {
      brilhoAtual.valor = valor;
    },
    definirEscalaDoCampo(valor) {
      escalaDoCampoAtual.valor = valor;
    },

    desenhar(delta) {
      if (delta > 0 && delta < 0.5) tempo += delta;
      const aspecto = altura > 0 ? largura / altura : 1;

      gl.bindVertexArray(vao);

      // ── Rastro, antes do pass principal do mesmo quadro ──────────────────
      if (config.usarMouse) {
        gl.useProgram(programaDoFluxo);
        gl.bindFramebuffer(gl.FRAMEBUFFER, b.fbo);
        gl.viewport(0, 0, RESOLUCAO_DO_FLUXO, RESOLUCAO_DO_FLUXO);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, a.textura);
        gl.uniform2f(uFluxo.uMouse, mouse.x, mouse.y);
        gl.uniform2f(uFluxo.uVelocidade, velocidade.x, velocidade.y);
        gl.uniform1f(uFluxo.uAspecto, aspecto);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        info.render.calls++;

        const troca = a;
        a = b;
        b = troca;

        velocidade.x *= AMORTECIMENTO;
        velocidade.y *= AMORTECIMENTO;
      }

      // ── Pass principal ───────────────────────────────────────────────────
      gl.useProgram(programaDoCampo);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, a.textura);
      gl.uniform2f(uCampo.uResolucao, largura, altura);
      gl.uniform1f(uCampo.uAspecto, aspecto);
      gl.uniform1f(uCampo.uEscala, escalaAtual.valor);
      gl.uniform1f(uCampo.uEscalaDoCampo, escalaDoCampoAtual.valor);
      gl.uniform1f(uCampo.uBrilho, brilhoAtual.valor);
      gl.uniform1f(uCampo.uTempo, tempo);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      info.render.calls++;
      info.render.frame++;
    },

    destruir() {
      gl.deleteProgram(programaDoCampo);
      gl.deleteProgram(programaDoFluxo);
      gl.deleteBuffer(posicoes);
      gl.deleteBuffer(uvs);
      gl.deleteVertexArray(vao);
      for (const alvo of [a, b]) {
        gl.deleteTexture(alvo.textura);
        gl.deleteFramebuffer(alvo.fbo);
      }
      // **Sem `loseContext()` aqui.** Quando o contexto é perdido e restaurado,
      // o componente reconstrói o renderizador — e a limpeza do antigo corre
      // *depois* do restauro. Perder o contexto nesse ponto mataria o que
      // acabou de voltar. Os recursos já foram libertados acima; o contexto
      // segue o canvas quando ele sai do DOM.
    },
  };
}
