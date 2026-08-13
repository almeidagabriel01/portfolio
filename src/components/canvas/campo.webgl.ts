import {
  amostraFragmentGLSL,
  campoFragmentGLSL,
  flowmapFragmentGLSL,
  vertexGLSL,
} from "./field.glsl";

/**
 * O campo de blocos em WebGL2 direto, sem motor 3D.
 *
 * ### Por que não three.js
 *
 * O efeito é **um quadrilátero de tela cheia com dois ou três fragment
 * shaders** e
 * framebuffers em ping-pong para o rastro do ponteiro. Não há cena, câmera,
 * malha, material, luz, nem grafo — nada do que um motor 3D existe para
 * resolver. Ainda assim, o `three` mais o `@react-three/fiber` custavam 244 kB
 * comprimidos e 898 kB depois de descomprimir, dos quais **53% nunca chegava a
 * executar**: animação esquelética, `AnimationMixer`, geração de environment
 * maps, maquinaria de geometria.
 *
 * O preço aparecia onde dói, que é o processador de um telemóvel comum: a
 * hidratação da home gastava ~1,3 s só a avaliar JS, e era ela — não a
 * animação — que segurava o TBT e o LCP do celular no PageSpeed.
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
 * 3. **O tamanho que define a grelha é o de CSS**, não o do buffer. É dele que
 *    sai `blocos = max(tamanho) * escala`, então usar o buffer mudaria o
 *    tamanho do bloco conforme a densidade do ecrã.
 *
 * A ordem dos passes é a de sempre: rastro → campo (no alvo de blocos) → tela,
 * tudo dentro do mesmo quadro.
 *
 * ### Dois regimes, escolhidos por quadro
 *
 * O alvo de um texel por bloco só é mais barato enquanto houver **mais pixels
 * do que blocos**. A escala do hero sobe de `0.41` a `1` com o scroll, e a
 * partir de certo ponto a grelha fica mais fina que o ecrã: o alvo passaria a
 * custar mais do que a tela inteira. Aí o desenho volta a ser direto, num
 * passe só, que é como este efeito sempre foi. Os dois regimes vivem no mesmo
 * programa, atrás do uniform `uDireto`: ver `field.glsl.ts` para o porquê.
 *
 * Medido a 1280×720, rolando o hero para fora: sem o regime direto a página
 * caía de 58 para 15 fps.
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
/**
 * O alvo do campo é redimensionado em degraus, não a cada pixel de grelha.
 *
 * A escala do hero é escrita a cada evento de scroll (0.41 → 1), e a grelha
 * acompanha: sem degrau, o alvo seria realocado ~60x/s durante a rolagem, que
 * é textura nova na GPU por quadro. Com degrau de 64 a rolagem inteira cabe em
 * uma dezena de realocações, ao custo de até 63 colunas de texels calculados à
 * toa — ~5% no hero.
 */
const DEGRAU_DO_ALVO = 64;

const emDegraus = (n: number) =>
  Math.max(DEGRAU_DO_ALVO, Math.ceil(n / DEGRAU_DO_ALVO) * DEGRAU_DO_ALVO);

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
  return canal < 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
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
    /**
     * **Log vazio quer dizer contexto perdido, não shader torto.** Num
     * contexto perdido toda compilação reprova e o `getShaderInfoLog` devolve
     * `null` — o erro que sai daqui então aponta para o GLSL, que é o único
     * sítio onde o defeito não está. Vale a distinção: foi ela que custou o
     * diagnóstico de `shader não compilou: null`.
     */
    if (gl.isContextLost()) throw new Error("contexto WebGL perdido");
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

interface Alvo {
  textura: WebGLTexture;
  fbo: WebGLFramebuffer;
  largura: number;
  altura: number;
}

/** Uma textura mais o seu framebuffer. */
function criarAlvo(
  gl: WebGL2RenderingContext,
  largura: number,
  altura: number,
  opcoes: { meiaPrecisao?: boolean; suave?: boolean },
): Alvo {
  const textura = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textura);
  const filtro = opcoes.suave ? gl.LINEAR : gl.NEAREST;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro);
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

  const alvo = { textura, fbo, largura: 0, altura: 0 };
  redimensionarAlvo(gl, alvo, largura, altura, opcoes.meiaPrecisao ?? false);
  return alvo;
}

function redimensionarAlvo(
  gl: WebGL2RenderingContext,
  alvo: Alvo,
  largura: number,
  altura: number,
  meiaPrecisao: boolean,
) {
  if (alvo.largura === largura && alvo.altura === altura) return;
  alvo.largura = largura;
  alvo.altura = altura;
  gl.bindTexture(gl.TEXTURE_2D, alvo.textura);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    meiaPrecisao ? gl.RGBA16F : gl.RGBA8,
    largura,
    altura,
    0,
    gl.RGBA,
    meiaPrecisao ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
    null,
  );
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
  /**
   * `perderContexto` **falso só no rebuild por restauro**: ver o corpo, em
   * `destruir`.
   */
  destruir(perderContexto?: boolean): void;
}

export function criarCampo(
  canvas: HTMLCanvasElement,
  config: ConfiguracaoDoCampo,
): CampoWebGL | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    // Nenhum dos três muda um pixel aqui: não há aresta de geometria dentro da
    // tela para o MSAA suavizar (o recorte arredondado sai de `discard`, que
    // mata todas as amostras do fragmento), e todo passe desenha sem teste de
    // profundidade. O que eles custavam era o resolve e a limpeza por quadro.
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  /**
   * Contexto perdido não se conserta compilando por cima: tudo reprova e o
   * log vem vazio. Sair aqui é o que transforma isso num campo que não acende
   * (e volta no `webglcontextrestored`) em vez de num erro no meio da página.
   */
  if (gl?.isContextLost()) return null;
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

  const programaDaTela = criarPrograma(gl, amostraFragmentGLSL);
  const programaDoCampo = criarPrograma(gl, campoFragmentGLSL);
  const programaDoFluxo = config.usarMouse
    ? criarPrograma(gl, flowmapFragmentGLSL)
    : null;
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

  const ligarAtributos = (programa: WebGLProgram) => {
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
  };

  const programas = [programaDaTela, programaDoCampo];
  if (programaDoFluxo) programas.push(programaDoFluxo);
  for (const programa of programas) ligarAtributos(programa);

  const u = (programa: WebGLProgram, nome: string) =>
    gl.getUniformLocation(programa, nome);


  const uTela = {
    uCampo: u(programaDaTela, "uCampo"),
    uCor: u(programaDaTela, "uCor"),
    uFundo: u(programaDaTela, "uFundo"),
    uBlocos: u(programaDaTela, "uBlocos"),
    uDeslocamento: u(programaDaTela, "uDeslocamento"),
    uTamanhoDoAlvo: u(programaDaTela, "uTamanhoDoAlvo"),
    uRaioDaBorda: u(programaDaTela, "uRaioDaBorda"),
  };
  const uCampo = Object.fromEntries(
    [
      "uFlowmap",
      "uBlocos",
      "uDeslocamento",
      "uAspecto",
      "uEscalaDoCampo",
      "uBrilho",
      "uContraste",
      "uLimiar",
      "uDistorcao",
      "uTempo",
      "uCor",
      "uFundo",
      "uRaioDaBorda",
      "uDireto",
    ].map((nome) => [nome, u(programaDoCampo, nome)]),
  );
  const uFluxo = programaDoFluxo && {
    uAnterior: u(programaDoFluxo, "uAnterior"),
    uMouse: u(programaDoFluxo, "uMouse"),
    uVelocidade: u(programaDoFluxo, "uVelocidade"),
    uAspecto: u(programaDoFluxo, "uAspecto"),
    uRaio: u(programaDoFluxo, "uRaio"),
    uDissipacao: u(programaDoFluxo, "uDissipacao"),
  };

  // O alvo do campo: um texel por bloco, `NEAREST` nas duas pontas. Filtro
  // linear aqui desfaria o efeito — entre dois blocos vizinhos apareceria meia
  // cor, e o campo é de 1 bit por definição.
  const alvoDosBlocos = criarAlvo(gl, DEGRAU_DO_ALVO, DEGRAU_DO_ALVO, {});
  const pingPong = config.usarMouse
    ? [
        criarAlvo(gl, RESOLUCAO_DO_FLUXO, RESOLUCAO_DO_FLUXO, {
          meiaPrecisao,
          suave: true,
        }),
        criarAlvo(gl, RESOLUCAO_DO_FLUXO, RESOLUCAO_DO_FLUXO, {
          meiaPrecisao,
          suave: true,
        }),
      ]
    : [];

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

  // Uniforms constantes, escritos uma vez.
  gl.useProgram(programaDaTela);
  gl.uniform3f(uTela.uCor, cor[0], cor[1], cor[2]);
  gl.uniform3f(uTela.uFundo, fundo[0], fundo[1], fundo[2]);
  gl.uniform1f(uTela.uRaioDaBorda, config.raioDaBorda);
  gl.uniform1i(uTela.uCampo, 0);
  gl.useProgram(programaDoCampo);
  gl.uniform1f(uCampo.uContraste, config.contraste);
  gl.uniform1f(uCampo.uLimiar, config.limiar);
  gl.uniform1f(uCampo.uDistorcao, config.distorcao);
  gl.uniform1f(uCampo.uRaioDaBorda, config.raioDaBorda);
  gl.uniform3f(uCampo.uCor, cor[0], cor[1], cor[2]);
  gl.uniform3f(uCampo.uFundo, fundo[0], fundo[1], fundo[2]);
  gl.uniform1i(uCampo.uFlowmap, 0);
  if (programaDoFluxo && uFluxo) {
    gl.useProgram(programaDoFluxo);
    gl.uniform1f(uFluxo.uRaio, RAIO);
    gl.uniform1f(uFluxo.uDissipacao, DISSIPACAO);
    gl.uniform1i(uFluxo.uAnterior, 0);
  }

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

      /**
       * A grelha, calculada uma vez e entregue aos dois passes. O `+2` é a
       * folga do arredondamento: o id vai de `floor(-blocos/2)` a
       * `ceil(blocos/2) - 1`, o que é um texel a mais que a parte inteira em
       * cada ponta.
       */
      const porLado = Math.max(largura, altura) * escalaAtual.valor;
      const blocosX = porLado * aspecto;

      /**
       * O cruzamento entre os dois regimes: enquanto a grelha couber em menos
       * texels do que o ecrã tem pixels, calcular por bloco é mais barato;
       * passando disso, o alvo custaria mais do que desenhar direto.
       */
      const porBloco =
        (blocosX + 2) * (porLado + 2) < canvas.width * canvas.height;

      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);

      /**
       * **O alvo é redimensionado antes de qualquer bind de leitura.**
       *
       * `redimensionarAlvo` liga a textura do alvo à unidade 0 para lhe trocar
       * o tamanho. Feito depois de ligar o rastro, era essa textura que ficava
       * na unidade quando o passe do campo desenhava **para dentro dela**:
       * feedback loop, `GL_INVALID_OPERATION`, e o quadro não sai. Acontecia em
       * todo redimensionamento — a montagem inclusive, que é quando o alvo sai
       * do tamanho mínimo para o real.
       */
      let larguraDoAlvo = 0;
      let alturaDoAlvo = 0;
      let deslocX = 0;
      let deslocY = 0;
      if (porBloco) {
        larguraDoAlvo = emDegraus(Math.ceil(blocosX) + 2);
        alturaDoAlvo = emDegraus(Math.ceil(porLado) + 2);
        redimensionarAlvo(gl, alvoDosBlocos, larguraDoAlvo, alturaDoAlvo, false);
        deslocX = Math.floor(larguraDoAlvo / 2);
        deslocY = Math.floor(alturaDoAlvo / 2);
      }

      // ── Rastro, antes do campo do mesmo quadro ───────────────────────────
      if (programaDoFluxo && uFluxo) {
        const [leitura, escrita] = pingPong;
        gl.useProgram(programaDoFluxo);
        gl.bindFramebuffer(gl.FRAMEBUFFER, escrita.fbo);
        gl.viewport(0, 0, RESOLUCAO_DO_FLUXO, RESOLUCAO_DO_FLUXO);
        gl.bindTexture(gl.TEXTURE_2D, leitura.textura);
        gl.uniform2f(uFluxo.uMouse, mouse.x, mouse.y);
        gl.uniform2f(uFluxo.uVelocidade, velocidade.x, velocidade.y);
        gl.uniform1f(uFluxo.uAspecto, aspecto);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        info.render.calls++;

        pingPong[0] = escrita;
        pingPong[1] = leitura;

        velocidade.x *= AMORTECIMENTO;
        velocidade.y *= AMORTECIMENTO;
      }

      // ── O campo ──────────────────────────────────────────────────────────
      // É o único passe caro do quadro. No regime por bloco ele corre num alvo
      // do tamanho da grelha; no direto, na resolução da tela.
      gl.useProgram(programaDoCampo);
      // Sem rastro nenhum ligado não há textura na unidade 0, e amostrar uma
      // textura incompleta devolve preto — que é o rastro em repouso, e o que
      // o three entregava com o uniform em `null`. **O `else` não é higiene**:
      // sem ele a unidade continuaria com a textura que o passe anterior lá
      // deixou, e ler a textura do alvo em que se desenha é o mesmo feedback
      // loop descrito acima.
      if (pingPong.length) gl.bindTexture(gl.TEXTURE_2D, pingPong[0].textura);
      else gl.bindTexture(gl.TEXTURE_2D, null);
      gl.uniform2f(uCampo.uBlocos, blocosX, porLado);
      gl.uniform1f(uCampo.uAspecto, aspecto);
      gl.uniform1f(uCampo.uEscalaDoCampo, escalaDoCampoAtual.valor);
      gl.uniform1f(uCampo.uBrilho, brilhoAtual.valor);
      gl.uniform1f(uCampo.uTempo, tempo);
      gl.uniform1f(uCampo.uDireto, porBloco ? 0 : 1);

      if (!porBloco) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        info.render.calls++;
        info.render.frame++;
        return;
      }

      gl.uniform2f(uCampo.uDeslocamento, deslocX, deslocY);
      gl.bindFramebuffer(gl.FRAMEBUFFER, alvoDosBlocos.fbo);
      gl.viewport(0, 0, larguraDoAlvo, alturaDoAlvo);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      info.render.calls++;

      // ── A tela: uma amostra por pixel ────────────────────────────────────
      gl.useProgram(programaDaTela);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.bindTexture(gl.TEXTURE_2D, alvoDosBlocos.textura);
      gl.uniform2f(uTela.uBlocos, blocosX, porLado);
      gl.uniform2f(uTela.uDeslocamento, deslocX, deslocY);
      gl.uniform2f(uTela.uTamanhoDoAlvo, larguraDoAlvo, alturaDoAlvo);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      info.render.calls++;
      info.render.frame++;
    },

    destruir(perderContexto = true) {
      gl.deleteProgram(programaDaTela);
      gl.deleteProgram(programaDoCampo);
      if (programaDoFluxo) gl.deleteProgram(programaDoFluxo);
      gl.deleteBuffer(posicoes);
      gl.deleteBuffer(uvs);
      gl.deleteVertexArray(vao);
      for (const alvo of [alvoDosBlocos, ...pingPong]) {
        gl.deleteTexture(alvo.textura);
        gl.deleteFramebuffer(alvo.fbo);
      }
      /**
       * **Devolver o contexto é obrigatório, e tem uma exceção.**
       *
       * Apagar os recursos não devolve o contexto: o browser tem um teto de
       * contextos vivos por processo (16 no Chrome) e ele só baixa quando o GC
       * recolhe o canvas, o que pode demorar. Trocar de rota várias vezes
       * esgotava o teto e o campo seguinte nascia **preto** — foi assim que o
       * `canvas-persistence` pegou. O R3F fazia isto por baixo
       * (`forceContextLoss()` ao desmontar); aqui é explícito.
       *
       * A exceção é o rebuild por `webglcontextrestored`: aí o contexto que
       * está a ser largado é o **mesmo objeto** que acabou de voltar à vida, e
       * perdê-lo mataria o campo que se estava a reconstruir.
       *
       * **E a perda vai para o fim da fila, atrás de um teste de `isConnected`.**
       * Em desenvolvimento o React monta, limpa e remonta cada efeito (Strict
       * Mode). O `<canvas>` é o **mesmo elemento** nas duas montagens, e
       * `getContext` num canvas cujo contexto foi perdido devolve esse mesmo
       * contexto, perdido — a segunda montagem então reprova toda compilação
       * com log vazio (`shader não compilou: null`) e derruba a página. O
       * microtask corre depois do commit do React: numa remontagem o elemento
       * continua no documento e a perda é cancelada; num desmonte a sério ele
       * já saiu, e o contexto é devolvido como tem de ser.
       */
      if (!perderContexto) return;
      queueMicrotask(() => {
        if (canvas.isConnected) return;
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      });
    },
  };
}
