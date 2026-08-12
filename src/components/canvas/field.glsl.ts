import { noiseGLSL } from "./noise.glsl";

/**
 * O campo de blocos: os shaders.
 *
 * O algoritmo, ponta a ponta:
 *
 * Um quad em **espaço de recorte** (o vértice escreve `gl_Position` direto, a
 * câmera nunca entra na conta) roda uma cadeia de operações que transforma um
 * campo contínuo numa imagem de **1 bit** (cada bloco é preto ou é âmbar, sem
 * meio-termo e sem antisserrilhado):
 *
 *   1. quantiza o UV numa grelha de blocos
 *   2. desloca o bloco pelo rastro do mouse (flowmap)
 *   3. amostra o campo, distorcido por ruído que anda no tempo
 *   4. aplica brilho e contraste
 *   5. mistura ruído branco proporcional ao brilho (dither)
 *   6. corta em `step(limiar)` → 1 bit
 *   7. recolore preto → âmbar
 *
 * **Uma simplificação deliberada.** A forma direta são três passes:
 * um FBO com a textura distorcida por ruído, depois o pass principal
 * amostrando esse FBO em `blockUv`. Como o pass principal tira **uma** amostra
 * por bloco, distorcer a imagem inteira e depois amostrar em `blockUv` dá o
 * mesmo resultado que distorcer `blockUv` e amostrar o campo, com um render
 * target a menos. Os passes 2 e 3 estão fundidos aqui.
 *
 * **E nada de foto.** O caminho óbvio para este efeito amostra uma textura
 * fotográfica, mas não é preciso: `saturation` é `0` em
 * todos os call sites, o que colapsaria a foto a **luminância pura** antes do
 * limiar: ela nunca seria usada como cor, só como máscara em escala de cinza. Um
 * FBM procedural ocupa o mesmo papel sem asset, sem request e sem licença.
 */

/** Quad em espaço de recorte. A câmera não participa. */
export const vertexGLSL = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

/**
 * Rastro do mouse, em ping-pong entre dois render targets.
 *
 * Técnica clássica de flowmap (difundida pelos exemplos da OGL): a cada frame o
 * alvo anterior é lido, atenuado por `uDissipacao`, e recebe um carimbo na
 * posição do cursor cuja intensidade cai com a distância. RG guardam a direção
 * do movimento, B guarda a força: é B que o pass principal usa para clarear os
 * blocos sob o cursor.
 */
export const flowmapFragmentGLSL = /* glsl */ `
precision highp float;

uniform sampler2D uAnterior;
uniform vec2 uMouse;
uniform vec2 uVelocidade;
uniform float uAspecto;
uniform float uRaio;
uniform float uDissipacao;

varying vec2 vUv;

void main() {
  vec3 acumulado = texture2D(uAnterior, vUv).rgb * uDissipacao;

  // Corrige o círculo do carimbo para a proporção real da tela: sem isto o
  // rastro vira elipse em viewport largo.
  vec2 doCursor = vUv - uMouse;
  doCursor.x *= uAspecto;

  // A força satura em 1 com queda cúbica: movimento rápido não estoura o
  // canal, só chega mais perto do teto.
  float forca = min(1.0, length(uVelocidade));
  vec3 carimbo = vec3(
    uVelocidade * vec2(1.0, -1.0),
    1.0 - pow(1.0 - forca, 3.0)
  );

  float peso = smoothstep(uRaio, 0.0, length(doCursor));

  gl_FragColor = vec4(mix(acumulado, carimbo, peso), 1.0);
}
`;

/**
 * O pass principal.
 *
 * Constantes vindas: limiar `0.56`, brilho `0.73`, contraste
 * `2.91`, saturação `0`, e `blocos = max(resolucao) * uEscala` com
 * `blocos.x *= aspecto`.
 */
export const campoFragmentGLSL = /* glsl */ `
precision highp float;

uniform sampler2D uFlowmap;

uniform vec3 uCor;
uniform vec3 uFundo;

uniform vec2 uResolucao;
uniform float uAspecto;

uniform float uEscala;
uniform float uEscalaDoCampo;
uniform float uBrilho;
uniform float uContraste;
uniform float uLimiar;
uniform float uRaioDaBorda;
uniform float uDistorcao;
uniform float uTempo;

varying vec2 vUv;

${noiseGLSL}

/**
 * SDF de retângulo arredondado, centrado na origem. Negativo dentro.
 * Formulação padrão de Inigo Quilez.
 */
float caixaArredondada(vec2 p, vec2 meiaExtensao, float raio) {
  vec2 d = abs(p) - meiaExtensao + raio;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - raio;
}

/** Mesmo folclore de hash já usado em noise.glsl.ts, um valor por bloco. */
float hashDoBloco(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  // 1. Recorte arredondado. O hero usa raio 0 (retângulo cheio); o painel da
  //    seção de abordagem usa raio pequeno.
  float dentro = caixaArredondada(vUv - 0.5, vec2(0.5), uRaioDaBorda);
  if (dentro > 0.0) discard;

  // 2. Grelha de blocos, ancorada no centro para que mudar a escala não
  //    deslize o padrão lateralmente.
  float blocosPorLado = max(uResolucao.x, uResolucao.y) * uEscala;
  vec2 blocos = vec2(blocosPorLado);
  blocos.x *= uAspecto;

  vec2 centrado = vUv - 0.5;
  vec2 idDoBloco = floor(centrado * blocos);
  vec2 uvDoBloco = idDoBloco / blocos + 0.5;

  // 3. Rastro do mouse: desloca o bloco e guarda a força para clarear depois.
  vec3 fluxo = texture2D(uFlowmap, uvDoBloco).rgb;
  uvDoBloco += abs(fluxo.rg) * fluxo.b * 0.5;
  float forcaDoFluxo = abs(fluxo.r + fluxo.g) * fluxo.b;

  // 4. Distorção do campo: duas oitavas de ruído andando devagar no tempo.
  //    A segunda tem frequência dobrada e amplitude 4x: é ela que dá o
  //    caminhar orgânico; a primeira só faz o conjunto respirar.
  float t = uTempo * 0.005;
  vec2 desvio = vec2(
    simplex3(vec3(uvDoBloco * 2.0, sin(t))),
    simplex3(vec3(uvDoBloco * 2.0, cos(t + 0.5)))
  ) * 0.01;
  desvio += vec2(
    simplex3(vec3(uvDoBloco * 4.0, sin(t + 1.0))),
    simplex3(vec3(uvDoBloco * 4.0, cos(t + 1.5)))
  ) * 0.04;

  vec2 uvDoCampo = uvDoBloco + desvio * uDistorcao;

  // 5. O campo. Corrige a proporção para o padrão não esticar em tela larga.
  vec2 amostra = (uvDoCampo - 0.5) * vec2(uAspecto, 1.0) * uEscalaDoCampo;

  /**
   * Ruído **em cordilheira** ('1 - |fbm|'), não FBM cru.
   *
   * O FBM direto produz manchas arredondadas, tipo nuvem. Espelhá-lo em torno
   * do zero transforma cada cruzamento de zero numa crista: o resultado são
   * arcos longos e finos, que é a estrutura que o efeito pede: o que
   * sobrevive ao corte de 1 bit são bordas, não áreas chapadas.
   *
   * Comparado a olho contra a captura: a variante em nuvem
   * acertava a cobertura (9,18% contra 8,83%) e ainda assim lia diferente:
   * blob onde o alvo é veio. Cobertura igual não é semelhança.
   */
  float campo = 1.0 - abs(fbm3(vec3(amostra, t)));

  /**
   * 6. Brilho e contraste.
   *
   * A forma genérica disto é uma função contraste/saturação/brilho com
   * 'saturacao = 0'. Para uma entrada em escala de cinza (que é o nosso caso,
   * o FBM é escalar), ela colapsa **exatamente** nesta linha: a saturação zero
   * já reduz a luminância, e a luminância de um cinza é ele mesmo. Escrever a
   * forma vetorial aqui seria três multiplicações de matriz para chegar ao
   * mesmo número.
   *
   * O rastro do mouse entra como brilho extra: empurra mais blocos por cima do
   * limiar, e é isso que faz o âmbar "engrossar" sob o cursor.
   */
  float valor = mix(0.5, campo * (uBrilho + forcaDoFluxo * 0.5), uContraste);

  // 7. Dither: mistura ruído branco na proporção do próprio brilho. É o que
  //    esgarça a borda das manchas em vez de deixá-la lisa, e o que faz o
  //    campo ler como granulado, não como blob.
  valor = mix(valor, hashDoBloco(idDoBloco), clamp(valor, 0.0, 1.0));

  // 8. Um bit. Sem antisserrilhado: a aresta dura do bloco é o efeito.
  float aceso = step(uLimiar, valor);

  gl_FragColor = vec4(mix(uFundo, uCor, aceso), 1.0);
}
`;
