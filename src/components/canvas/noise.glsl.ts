/**
 * Ruído simplex 3D + FBM, escrito para este projeto (AD-001, nada copiado).
 *
 * Atribuição da técnica, como manda o AD-001:
 * - O algoritmo simplex é de Ken Perlin ("Noise hardware", 2001): distorce a
 *   grelha cúbica, escolhe o simplex que contém o ponto e soma a contribuição
 *   dos 4 cantos com queda radial.
 * - A ordenação dos cantos por `step()` em vez de `if` é a formulação
 *   branchless popularizada por Stefan Gustavson / Ashima Arts.
 * - O hash `fract(sin(dot(...)))` é folclore de GLSL, difundido por Inigo
 *   Quilez.
 * As constantes, a estrutura e o código abaixo são meus; nenhuma linha veio de
 * um arquivo de terceiros.
 */
export const noiseGLSL = /* glsl */ `
const float F3 = 0.33333333;
const float G3 = 0.16666667;

// Gradiente pseudo-aleatório por célula, em [-1, 1]^3.
vec3 cellGradient(vec3 cell) {
  vec3 h = vec3(
    dot(cell, vec3(127.1, 311.7, 74.7)),
    dot(cell, vec3(269.5, 183.3, 246.1)),
    dot(cell, vec3(113.5, 271.9, 124.6))
  );
  vec3 g = fract(sin(h) * 43758.5453) * 2.0 - 1.0;
  // Sem normalize cru: gradiente degenerado devolveria NaN e mancharia a tela.
  return g / max(length(g), 1e-4);
}

float simplex3(vec3 p) {
  // Distorce para a grelha simplética e acha o canto base.
  float skew = (p.x + p.y + p.z) * F3;
  vec3 cell = floor(p + skew);
  float unskew = (cell.x + cell.y + cell.z) * G3;
  vec3 d0 = p - (cell - unskew);

  // Ordem dos outros dois cantos por comparação vetorial, zero branch.
  vec3 ge = step(d0.yzx, d0);
  vec3 lt = 1.0 - ge;
  vec3 offset1 = min(ge, lt.zxy);
  vec3 offset2 = max(ge, lt.zxy);

  vec3 d1 = d0 - offset1 + G3;
  vec3 d2 = d0 - offset2 + 2.0 * G3;
  vec3 d3 = d0 - 1.0 + 3.0 * G3;

  // Queda radial: fora do raio do canto a contribuição é exatamente zero.
  vec4 falloff = max(
    0.5 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)),
    0.0
  );
  falloff = falloff * falloff * falloff * falloff;

  vec4 contribution = vec4(
    dot(cellGradient(cell), d0),
    dot(cellGradient(cell + offset1), d1),
    dot(cellGradient(cell + offset2), d2),
    dot(cellGradient(cell + 1.0), d3)
  );

  // 42.0 é o fator que leva a soma para aproximadamente [-1, 1].
  return 42.0 * dot(falloff, contribution);
}

// Exatamente 3 oitavas, desenroladas: sem loop dinâmico, sem branch. É o
// orçamento de GPU do design, não um detalhe de estilo.
float fbm3(vec3 p) {
  float sum = 0.5 * simplex3(p);
  sum += 0.25 * simplex3(p * 2.03);
  sum += 0.125 * simplex3(p * 4.01);
  return sum;
}
`;
