/**
 * O quadrado do card da trajetória: o sinal virando código.
 *
 * A caixa pede um retrato de 425×425, que é o que um bloco de depoimento
 * põe aqui: metade do card é o rosto de quem fala. Marco de carreira não tem
 * rosto, e um quadrado vazio de 425px lê como imagem que não carregou. Este
 * componente ocupa a caixa com desenho **derivado do próprio marco**.
 *
 * O que ele desenha é o arco da seção. `progresso` vai de 0 no primeiro marco
 * (a fibra) a 1 no último (o software), e a figura atravessa junto:
 *
 * - **0**: trinta canais verticais contínuos, finos e desiguais em brilho. É o
 *   que um analisador de espectro mostra numa fibra DWDM: luz repartida em
 *   comprimentos de onda, sinal analógico, ininterrupto.
 * - **meio**: os canais se partem em traços. O contínuo começa a ser
 *   amostrado.
 * - **1**: nove colunas de blocos quadrados. O sinal virou grade discreta:
 *   bitmap, código.
 *
 * Analógico → amostrado → digital, na mesma ordem em que a carreira andou. O
 * ornamento é o argumento da seção, não enfeite ao lado dele.
 *
 * Uma célula em branco por quadrado, e só uma: é o vocabulário de acento do site
 * (indicador do hero, CTA, aspas). Aparece uma vez e marca onde
 * olhar.
 */

/** Lado do `viewBox`. O contêiner é `aspect-square`, então 100 mapeia 1:1. */
const LADO = 100;

/**
 * Ruído determinístico em `[0,1)`, por hash **inteira**.
 *
 * Determinismo aqui não é preferência: o quadrado é renderizado no servidor e
 * de novo no cliente, e atributo que não bate é divergência de hidratação.
 *
 * A primeira versão usava a hash canônica de GLSL (`fract(sin(…) * 43758.5)`),
 * que é o idioma do resto do site, e **quebrou a hidratação**. `Math.sin` não
 * é especificado ao último bit: o V8 do Node e o do Chromium podem devolver
 * mantissas diferentes no mesmo argumento, e o React reclamou de `x1` no
 * terceiro card. `Math.imul` e deslocamento são exatos por especificação em
 * qualquer motor. O `arredondar` abaixo é a segunda trava: número que chega ao
 * DOM com 17 dígitos é frágil por natureza, e três casas já são finas demais
 * para o olho num quadrado de 425px.
 */
function ruido(a: number, b: number): number {
  let h = Math.imul(a + 1, 374761393) + Math.imul(b + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const arredondar = (n: number) => Math.round(n * 1000) / 1000;

/**
 * A geometria de um quadrado, isolada da marcação para poder ser conferida sem
 * montar React (`Espectro.test.tsx`).
 *
 * **Cada canal é uma `<line>` só, tracejada, não uma lista de retângulos.** Um
 * campo de blocos desenhado célula a célula custa ~200 nós por card e ~1000 na
 * seção, que é HTML a mais em toda visita. O `stroke-dasharray` produz a mesma
 * imagem com um nó por coluna, e o `stroke-dashoffset` por canal (tirado do
 * ruído) tira a regularidade que denunciaria o truque: cada coluna entra numa
 * fase, e o conjunto lê como tecido em vez de tabela.
 */
export function geometriaDoEspectro(progresso: number, semente: number) {
  const p = Math.min(Math.max(progresso, 0), 1);

  const colunas = Math.round(30 - 21 * p);
  const linhas = Math.round(1 + (colunas - 1) * p);
  const passo = LADO / colunas;
  const periodo = LADO / linhas;

  /**
   * Espessura e traço convergem para o mesmo número em `p = 1` (7,22 sobre um
   * passo de 11,11): é o que faz a célula final ser **quadrada**. Divergir aqui
   * devolveria retângulos, e retângulo alto continua lendo como traço. A
   * chegada em bloco é o que fecha a narrativa.
   */
  const espessura = arredondar(passo * (0.24 + 0.41 * p));
  const traco = arredondar(periodo * (1 - 0.35 * p));

  const canais = Array.from({ length: colunas }, (_, j) => {
    // Queda suave para as bordas: o quadrado ganha um miolo luminoso em vez de
    // uma trama chapada. Rasa de propósito (0,55 no piso). Funda demais, a
    // borda apaga e o quadrado deixa de ter aresta, que é o que dá a ele a
    // presença do retrato que ele substitui.
    const centro = Math.sin((Math.PI * (j + 0.5)) / colunas);
    const brilho = ruido(semente, j);
    /**
     * Nem todo canal atravessa o quadrado inteiro, e a irregularidade **some
     * ao longo do arco**: no primeiro marco os traços têm 58% a 100% da altura
     * e as pontas ficam desencontradas; no último todos vão de borda a borda.
     *
     * É o terceiro eixo da mesma narrativa, e ele apareceu na captura: com
     * todos os canais rentes, o marco da fibra lia como **código de barras**:
     * rígido, gráfico, sem nada de óptico. Ponta desigual devolve o espectro. E
     * a ordem chegando junto com a digitalização é o que faz o último quadrado
     * parecer grade, e não ruído grosso.
     */
    const comprimento = LADO * (1 - 0.42 * (1 - p) * ruido(j, semente + 7));
    return {
      x: arredondar(j * passo + passo / 2),
      y1: arredondar((LADO - comprimento) / 2),
      y2: arredondar((LADO + comprimento) / 2),
      opacidade: arredondar((0.3 + 0.7 * brilho) * (0.55 + 0.45 * centro)),
      /**
       * Os canais mais fortes trocam de âmbar. `--color-accent` é a cor dos blocos
       * do campo WebGL e assenta contra o preto; o `--color-accent-soft` existe
       * exatamente para o âmbar que precisa **ler** sobre chapado. Misturar os
       * dois dá faixa de luminância ao quadrado. Sem ela a trama fica plana,
       * que foi como saiu na primeira captura.
       */
      forte: brilho > 0.86,
      // Em `linhas === 1` o canal é contínuo e o tracejado não se aplica:
      // `stroke-dasharray` com vão zero é caso de borda de renderizador.
      tracejado:
        linhas === 1
          ? null
          : { traco, vao: arredondar(periodo - traco) },
      fase: arredondar(ruido(j, semente) * periodo),
    };
  });

  const colunaAcento = Math.floor(ruido(semente, 99) * colunas);
  const linhaAcento = Math.floor(ruido(99, semente) * linhas);
  // O acento não acompanha o traço no começo: em `p = 0` o traço tem a altura
  // inteira do quadrado, e uma barra branca de 100 de altura deixa de ser
  // acento e vira o assunto. Travado em três passos, ele continua sendo marca.
  const alturaAcento = Math.min(traco, passo * 3);

  return {
    lado: LADO,
    colunas,
    linhas,
    espessura,
    canais,
    acento: {
      x: arredondar(colunaAcento * passo + (passo - espessura) / 2),
      y: arredondar(linhaAcento * periodo + (periodo - alturaAcento) / 2),
      largura: espessura,
      altura: arredondar(alturaAcento),
    },
  };
}

interface Props {
  /** 0 no primeiro marco, 1 no último. */
  progresso: number;
  /** Índice do marco. Só desloca o ruído. A figura é função do progresso. */
  semente: number;
}

export function Espectro({ progresso, semente }: Props) {
  const g = geometriaDoEspectro(progresso, semente);

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${g.lado} ${g.lado}`}
      className="size-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {g.canais.map((canal) => (
        <line
          key={canal.x}
          x1={canal.x}
          y1={canal.y1}
          x2={canal.x}
          y2={canal.y2}
          stroke={
            canal.forte ? "var(--color-accent-soft)" : "var(--color-accent)"
          }
          strokeWidth={g.espessura}
          strokeDasharray={
            canal.tracejado
              ? `${canal.tracejado.traco} ${canal.tracejado.vao}`
              : undefined
          }
          strokeDashoffset={canal.tracejado ? canal.fase : undefined}
          opacity={canal.opacidade}
        />
      ))}
      <rect
        x={g.acento.x}
        y={g.acento.y}
        width={g.acento.largura}
        height={g.acento.altura}
        fill="var(--color-cta)"
      />
    </svg>
  );
}
