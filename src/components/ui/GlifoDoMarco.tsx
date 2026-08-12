/**
 * O símbolo de cada marco da trajetória: o assunto, por cima da textura.
 *
 * O `Espectro` conta o **arco** (contínuo → discreto, fibra → software) e faz
 * isso bem, mas cinco campos da mesma família lidos de relance parecem cinco
 * variações do mesmo desenho: nada ali diz *o que* foi cada etapa. O glifo é o
 * assunto que faltava. É o papel que o retrato cumpre no card.
 *
 * **Traço, não ícone de biblioteca.** Mesma gramática do glifo do cabeçalho:
 * `fill: none`, traço em `ink`, pontas e junções arredondadas, sem
 * preenchimento a não ser onde ele significa alguma coisa (o núcleo da fibra).
 * Ícone de pacote traria outro peso de traço, outro grid e outro raio de canto,
 * e o card inteiro se denunciaria.
 *
 * **Silhuetas deliberadamente diferentes**: círculo, retângulo, barras,
 * ângulos, par de quadrados. Cinco desenhos bonitos com a mesma silhueta
 * resolveriam nada: de longe o que se lê é a forma geral, não o detalhe.
 */

/**
 * Um glifo por marco, **na ordem em que a seção os renderiza**: os quatro
 * primeiros vêm de `MARCOS_DA_JORNADA` e o quinto é o desfecho das empresas
 * próprias. `GlifoDoMarco.test.ts` trava essa contagem contra a seção: marco
 * novo sem glifo cairia num quadrado sem assunto, que é o defeito que este
 * arquivo existe para resolver.
 */
const GLIFOS = [
  /**
   * 1 · Huawei (INATEL): DWDM, fibra óptica.
   * Um prisma: um feixe entra e sai repartido em comprimentos de onda. É a
   * própria definição de *wavelength division multiplexing*, e o assunto exato
   * do estágio.
   *
   * A primeira versão era a secção da fibra, anéis concêntricos com marcas de
   * alinhamento. Na captura ela lia como **mira de arma**, não como óptica: três
   * círculos com cruz é retículo antes de ser conector, e nenhuma dose de
   * contexto desfaz isso.
   */
  <g key="prisma">
    <path d="M50 20 80 72H20Z" />
    <path d="M4 52h27" />
    {/* O leque abre largo de propósito: com os quatro feixes saindo em ângulos
        próximos, o conjunto fecha num bico e lê como ponta de seta, não como
        luz repartida. */}
    <path d="M70 52 96 22M70 52 96 38M70 52 96 54M70 52 96 70" />
  </g>,

  /**
   * 2 · INATEL (PDI): engenharia de software, aplicação web.
   * Uma janela de navegador. O trabalho ali era HTML, CSS, JS, React, Flask e
   * PHP, tudo o que termina numa página aberta.
   */
  <g key="web">
    <rect x="15" y="24" width="70" height="52" rx="6" />
    <path d="M15 39h70" />
    <circle cx="25" cy="31.5" r="2.6" fill="currentColor" stroke="none" />
    <circle cx="34" cy="31.5" r="2.6" fill="currentColor" stroke="none" />
  </g>,

  /**
   * 3 · INATEL (ND): Salesforce e webscraping.
   * Um grafo: registro central e os que se ligam a ele. CRM é relação entre
   * dados antes de ser tela, e o webscraping existia para alimentar essa
   * relação.
   *
   * As arestas param **antes** dos círculos, em vez de passarem por trás deles:
   * preencher os círculos para mascarar a linha abriria buracos na textura do
   * campo, que está logo atrás.
   */
  <g key="grafo">
    <circle cx="50" cy="50" r="10" />
    <circle cx="50" cy="18" r="7" />
    <circle cx="77.7" cy="66" r="7" />
    <circle cx="22.3" cy="66" r="7" />
    <path d="M50 40V25M58.7 55l12.9 7.5M41.3 55l-12.9 7.5" />
  </g>,

  /**
   * 4 · VS Telecom: desenvolvedor de software júnior.
   * O par de chevrons com a barra: o primeiro emprego em que o entregável é
   * código, e não relatório de estágio.
   */
  <g key="codigo">
    <path d="M40 30 22 50l18 20M60 30l18 20-18 20M55 26 45 74" />
  </g>,

  /**
   * 5 · SoftCode · ProOps: empresas próprias.
   * Dois quadrados que se sobrepõem: duas sociedades, uma software house e um
   * ERP, com a parte de baixo do trabalho em comum.
   */
  <g key="empresas">
    <rect x="18" y="18" width="46" height="46" rx="7" />
    <rect x="36" y="36" width="46" height="46" rx="7" />
  </g>,
];

/** Quantos marcos este arquivo cobre. Lido pelo teste que trava o pareamento. */
export const TOTAL_DE_GLIFOS = GLIFOS.length;

export function GlifoDoMarco({
  indice,
  className,
}: {
  indice: number;
  className?: string;
}) {
  const glifo = GLIFOS[indice];
  if (!glifo) return null;

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
      {glifo}
    </svg>
  );
}
