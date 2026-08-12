/**
 * O painel do cartão de credencial: o que em navegador é a foto da matéria.
 *
 * O molde *stories* dá 450px de imagem para 137 de texto: a imagem é 77% do
 * cartão. Credencial não tem foto, e um retângulo `bg-current/20` vazio nesse
 * tamanho lê como imagem quebrada, a mesma conclusão da `Trajetoria` (AD-021).
 *
 * A linguagem é a do sistema: traço em `ink`, `fill: none`, pontas
 * arredondadas, um símbolo por cartão com **silhueta distinta**: de longe o
 * que se lê é a forma geral. O que muda é a textura: aqui é uma malha de pontos
 * regular, e não os canais verticais do `Espectro`. Duas seções seguidas com o
 * mesmo fundo leriam como repetição, que foi exatamente a crítica que trouxe os
 * glifos.
 */

/** Passo da malha, em unidades do `viewBox`. */
const PASSO = 6.25;
const COLUNAS = Math.round(100 / PASSO);

/**
 * Um símbolo por cartão, **na ordem em que a seção os renderiza**. A contagem é
 * travada contra a lista de cartões em `SeloDaCredencial.test.ts`.
 */
const SIMBOLOS = [
  /**
   * 1 · Bacharelado em Engenharia de Software, INATEL.
   * Capelo geométrico: a base larga que estreita até o ápice, quatro anos
   * empilhados terminando num ponto.
   */
  <g key="formacao">
    <path d="M18 40 50 26l32 14-32 14z" />
    <path d="M30 47v18c0 6 9 10 20 10s20-4 20-10V47" />
    <path d="M78 44v20" />
  </g>,

  /**
   * 2 · Inglês avançado e as certificações.
   * Globo com meridianos: idioma é o que atravessa fronteira, e é o cartão que
   * carrega as duas credenciais de fora do curso.
   */
  <g key="idioma">
    <circle cx="50" cy="50" r="30" />
    <ellipse cx="50" cy="50" rx="13" ry="30" />
    <path d="M22 40h56M22 60h56" />
  </g>,

  /**
   * 3 · Prêmio Municipal de Inovações, Werk.
   * Troféu: taça, alças, haste e base.
   *
   * A primeira versão era um estouro de oito raios: mais abstrato e, na
   * captura, mais perto de um sol do que de um prêmio. Troféu é o único
   * desenho que ninguém precisa decifrar.
   */
  <g key="premio">
    <path d="M30 20h40v16c0 11-9 20-20 20s-20-9-20-20V20Z" />
    <path d="M30 27h-7c-4 0-7 3-7 8s3 8 7 8h4" />
    <path d="M70 27h7c4 0 7 3 7 8s-3 8-7 8h-4" />
    <path d="M50 56v14M38 70h24l3 12H35z" />
  </g>,
];

/** Quantos cartões este arquivo cobre. Lido pelo teste que trava o pareamento. */
export const TOTAL_DE_SELOS = SIMBOLOS.length;

export function SeloDaCredencial({ indice }: { indice: number }) {
  const simbolo = SIMBOLOS[indice];
  if (!simbolo) return null;

  return (
    // `grid` para as três camadas ocuparem a mesma célula por `.area`, sem
    // `absolute`: a caixa continua sendo a do painel.
    <div className="grid size-full overflow-clip rounded-[1.6rem] bg-ink/6">
      {/*
        A malha é regular e determinística: nenhum ruído, nenhum `Math.random`
        (AD-021). O que dá vida a ela é a queda radial do véu por cima, não o
        acaso. `preserveAspectRatio="none"` porque o painel é mais alto que
        largo e a malha deve continuar quadrada em px, não em unidades do
        `viewBox`.
      */}
      <svg
        aria-hidden
        viewBox={`0 0 100 ${100 * (450 / 345)}`}
        className="area size-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="var(--color-accent)" opacity="0.45">
          {Array.from({ length: COLUNAS }, (_, coluna) =>
            Array.from({ length: Math.round(COLUNAS * (450 / 345)) }, (_, linha) => (
              <rect
                key={`${coluna}-${linha}`}
                x={coluna * PASSO + PASSO / 2 - 0.55}
                y={linha * PASSO + PASSO / 2 - 0.55}
                width="1.1"
                height="1.1"
              />
            )),
          )}
        </g>
      </svg>

      {/*
        O mesmo véu radial do glifo da trajetória, e pelo mesmo motivo: sem ele o
        traço de 2,6 se perde dentro da malha.

        Fecha em `--color-surface` e não em `--color-black`: o painel é
        `ink/6` sobre preto, o que resolve em #0f0e0d. Fechar no preto
        cheio deixaria o miolo **mais escuro** que a borda e leria como mancha,
        em vez de como a malha se afastando.
      */}
      <div className="area flex-center">
        <div className="flex-center size-[58%] bg-[radial-gradient(closest-side,var(--color-surface)_50%,transparent)]">
          <GlifoDaCredencial indice={indice} className="w-[72%]" />
        </div>
      </div>
    </div>
  );
}

function GlifoDaCredencial({
  indice,
  className,
}: {
  indice: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      {SIMBOLOS[indice]}
    </svg>
  );
}
