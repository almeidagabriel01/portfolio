"use client";

import { motion } from "motion/react";
import { Carrossel } from "@/components/ui/Carrossel";
import { Espectro } from "@/components/ui/Espectro";
import { GlifoDoMarco } from "@/components/ui/GlifoDoMarco";
import { useTranslations } from "@/hooks/useTranslations";
import { TRANSICAO } from "@/lib/motion";

/**
 * SEC-01: o arco DWDM → software, em cinco marcos, no molde do bloco `quotes`
 *: um carrossel horizontal onde o card ativo fica em escala
 * cheia, os vizinhos recuam e o texto deles apaga.
 *
 * Os quatro primeiros são **lidos da jornada**, não reescritos: índices em
 * `journey.experiences`, que é reverse-cronológica. Ler o texto de lá é o que
 * cumpre "cada marco ancora num fato da jornada, nenhuma afirmação sem fonte":
 * corrigir a jornada corrige o arco junto, e não existe cópia para divergir.
 *
 *   4 → Huawei (INATEL), DWDM, out 2021
 *   3 → INATEL, PDI, ago 2022
 *   2 → INATEL, ND, fev 2023 (Salesforce, webscraping)
 *   0 → VS Telecom, desenvolvedor júnior, abr 2025
 *
 * O quinto marco é o desfecho (as empresas próprias) e é o único texto novo,
 * porque sociedade não é emprego e não está na jornada.
 *
 * A ordem é **crescente** de propósito, e é o oposto da de `/about`. Aqui o
 * tempo corre para frente porque a seção é um arco; lá é um histórico. Quem
 * "consertar" uma pela outra quebra as duas.
 */
export const MARCOS_DA_JORNADA = [4, 3, 2, 0];

interface Marco {
  cargo: string;
  empresa: string;
  periodo: string;
  desc: string;
}

/**
 * Estados de entrada dos reveals do card, nos valores medidos em navegador.
 *
 * Os pares são **por linha**: quem está à esquerda parte de `x:+20` e quem está
 * à direita parte de `x:-20`, então os dois lados assentam vindo um em direção
 * ao outro. O escalonamento é aritmética manual (0.4 → 0.5), não
 * `staggerChildren`: é o que mantém as duas linhas independentes
 * de quantos filhos cada uma tem.
 */
const CORPO = {
  oculto: { opacity: 0, y: 20, filter: "blur(10px)" },
  visivel: { opacity: 1, y: 0, filter: "blur(0px)" },
};
const DA_ESQUERDA = {
  oculto: { opacity: 0, x: -20 },
  visivel: { opacity: 1, x: 0 },
};
const DA_DIREITA = {
  oculto: { opacity: 0, x: 20 },
  visivel: { opacity: 1, x: 0 },
};

const T_CORPO = { ...TRANSICAO, duration: 0.9 };
const T_LINHA_CARGO = { ...TRANSICAO, duration: 0.3, delay: 0.4 };
const T_LINHA_EMPRESA = { ...TRANSICAO, duration: 0.3, delay: 0.5 };

/**
 * A troca ativo/inativo é **CSS**, não `motion`: é o único jeito de ela
 * acompanhar o scroll do trilho sem um re-render por frame.
 *
 * **`scale`, não `transform`.** Escrever `transition-[transform, opacity]`
 * (com espaço, valor arbitrário que o Tailwind rejeita) não emite regra
 * `transition-property` nenhuma, e o
 * efeito passa a funcionar por acidente, sobre o `all` que é o valor inicial da
 * propriedade. Corrigir para `transition-[transform,_opacity]` seria **pior que
 * o bug**: o Tailwind v4 emite `scale-95` na propriedade `scale`, não numa
 * matriz de `transform` (medido, o `transform` computado do card recuado lê
 * `none`), e a regra correta deixaria a escala saltar sem transição nenhuma,
 * com a caixa final idêntica. Invisível para geometria.
 */
const ESTADO = "ease-snappy transition-[scale,_opacity] duration-300";

/**
 * O glifo do cabeçalho: quatro feixes entrando pela esquerda, convergindo num
 * ponto e saindo como um só.
 *
 * A caixa é de 144×123 e pede um ornamento. Este é desenho próprio, e é o
 * desenho certo no assunto: acoplamento de fibra é literalmente o que abre o
 * arco desta seção.
 */
function GlifoDeConvergencia() {
  return (
    <svg
      aria-hidden
      width="144"
      height="123"
      viewBox="0 0 144 123"
      fill="none"
      className="mr-20 inline-block h-auto w-66 shrink-0 align-baseline md:w-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.75 6.5L99 61.5M1.75 39.5L99 61.5M1.75 83.5L99 61.5M1.75 116.5L99 61.5M99 61.5H142.25"
        stroke="var(--color-accent)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Um marco.
 *
 * Componente próprio, e não um trecho de JSX dentro de `renderizar`: o
 * `renderizar` do `Carrossel` é chamado de dentro do `map` dele, e um hook ali
 * penduraria estado na fibra do carrossel: quantidade variável de hooks por
 * render.
 *
 * **O gatilho dos reveals é `ativo`, não `useInView`.** É a divergência mais
 * contra-intuitiva desta seção: não existe um
 * `useInView`, um `useScroll` nem um `MotionValue` no bloco de quotes inteiro.
 * O único acoplamento a scroll é o do trilho, que produz um inteiro. Por isso o
 * reveal **reverte** quando o card sai do centro (`x`/`y` voltam ao offset), o
 * que o AD-007 não proíbe: aquilo é sobre *entrada*, e isto é estado, da mesma
 * categoria que parallax.
 */
function CartaoDoMarco({
  marco,
  ordinal,
  progresso,
  semente,
  ativo,
}: {
  marco: Marco;
  ordinal: string;
  progresso: number;
  semente: number;
  ativo: boolean;
}) {
  return (
    <>
      <div className={`${ESTADO} relative ${ativo ? "scale-100 opacity-100" : "opacity-80 md:scale-95 md:opacity-45"}`}>
        {/*
          O quadrado que em navegador é o retrato do depoente. Marco de
          carreira não tem rosto: aqui ele é o desenho do próprio arco, contínuo
          no primeiro marco e discreto no último (ver `Espectro`).
        */}
        {/* `grid` e não `flex`: os dois filhos ocupam a mesma célula pelo
            `.area`, e é isso que empilha campo e glifo sem `absolute`. */}
        <div className="relative grid aspect-square w-full overflow-clip rounded-[1.6rem] bg-surface">
          {/*
            **O espectro esborrata com a velocidade do trilho.**

            Uma linha vertical arrastada na horizontal, fotografada com o
            obturador aberto, sai larga e fraca: é o rastro. O quadrado já é
            feito de linhas verticais, então esticar em `x` e baixar a opacidade
            é literalmente o borrão de movimento daquela figura, e não um efeito
            emprestado. O `skewX` assinado inclina para o lado de onde o gesto
            veio.

            As duas variáveis vêm do `Carrossel`, publicadas no trilho e herdadas
            até aqui. Nenhum componente re-renderiza para isso acontecer. Sob
            `prefers-reduced-motion` elas nunca saem de zero, e o `calc` devolve
            a identidade sem precisar de um segundo caminho de código.

            A curva assenta longo de propósito: o rastro entra junto com o
            arremesso e leva meio segundo para se recompor, que é o tempo que o
            trilho leva para encaixar.
          */}
          <div
            className="ease-snappy area size-full transition-[transform,_opacity,_filter] duration-500"
            style={{
              transform:
                "skewX(calc(var(--arrasto, 0) * -9deg)) scaleX(calc(1 + var(--forca, 0) * 0.4))",
              /**
               * Desfoque isotrópico que **lê como direcional**, e de graça: a
               * figura é feita de linhas verticais compridas, e borrar uma
               * linha vertical só tem efeito visível na horizontal: nas pontas
               * o vertical some contra o preto. Um `feGaussianBlur` com
               * `stdDeviation="N 0"` daria o borrão direcional de verdade, mas
               * o atributo não lê custom property, e aqui não faz falta.
               */
              filter: "blur(calc(var(--forca, 0) * 3.5px))",
              // Recuado para 0,62: o campo virou **textura** quando ganhou um
              // assunto por cima. Cheio, ele disputa o traço do glifo e os dois
              // perdem, e é a mesma razão pela qual o véu da `Entregas` existe
              // sobre o vídeo.
              opacity: "calc(0.7 - var(--forca, 0) * 0.16)",
            }}
          >
            <Espectro progresso={progresso} semente={semente} />
          </div>

          {/*
            O assunto do card. `area` põe os dois na mesma célula de grade em vez
            de um `absolute`, então a caixa continua sendo a do campo e não há
            posicionamento a ressincronizar.

            **Sem o rastro.** O glifo é o que o marco *é*; o campo é a luz. Dar
            borrão de movimento aos dois apagaria a distinção entre fundo e
            assunto justamente no quadro em que ela mais aparece.
          */}
          {/*
            `relative` é **load-bearing**, e o defeito não dava erro nenhum: a
            camada do campo tem `transform` e `filter`, o que faz dela um
            contexto de empilhamento, e contexto de empilhamento pinta depois
            do fundo de um irmão não-posicionado, ainda que venha antes no DOM.
            Sem isto o campo cobria o véu radial e o glifo inteiro; como ele está
            a 70% de opacidade, o glifo continuava **aparecendo por baixo**,
            só que lavado, e o véu simplesmente não existia na tela.
          */}
          <div className="area relative flex-center">
            {/*
              Um véu radial atrás do glifo, e ele é necessário: no último marco a
              textura é um mosaico de blocos cheios, e o traço de 2,6 do glifo
              some dentro dela. O gradiente fecha em `--color-surface`, que é a cor
              do próprio card, então o que se vê não é uma mancha, é a textura
              se afastando para o assunto aparecer. Mesma função do véu sobre o
              vídeo na `Entregas`.
            */}
            <div className="flex-center size-[62%] bg-[radial-gradient(closest-side,var(--color-surface)_52%,transparent)]">
              <GlifoDoMarco indice={semente} className="w-[74%]" />
            </div>
          </div>
        </div>

        {/*
          Os quatro marcadores de canto, a −5px e com 8px de lado. É por eles
          que o card do meio lê como *enquadrado* em vez de só maior, e é por
          eles que o `py-10` do `<li>` existe: o trilho clipa o eixo Y, e sem os
          10px de respiro os marcadores de cima e de baixo seriam cortados.

          Sem transição: o pulo de opacidade é o "clique" visual contra
          os 300ms da escala.
        */}
        <div
          aria-hidden
          className={`absolute inset-0 hidden md:flex ${ativo ? "opacity-100" : "opacity-0"}`}
        >
          <div className="absolute -top-5 -left-5 size-8 bg-accent" />
          <div className="absolute -top-5 -right-5 size-8 bg-accent" />
          <div className="absolute -right-5 -bottom-5 size-8 bg-accent" />
          <div className="absolute -bottom-5 -left-5 size-8 bg-accent" />
        </div>
      </div>

      {/*
        Duplo fade, e os dois são necessários: este wrapper apaga o bloco
        inteiro em 300ms enquanto os filhos `motion` ainda estão nos 900ms
        deles. O CSS é quem ganha na percepção; ter só um muda o tempo.

        `opacity: 0` e não um piso claro, porque foi medido e resolve de
        quebra o que o AD-012 registrou: texto a 45% dentro de card inativo dava
        1,9:1 na tela, e texto que não está na tela não tem contraste a
        reprovar. O harness solta da fila quem estiver abaixo de 0,05 de
        opacidade efetiva.
      */}
      <div
        // O gancho do `<noscript>` do `layout.tsx` (AD-011): esta opacidade vem
        // de classe, não do `initial` do motion, então o seletor de estilo
        // inline de lá não a alcança, e sem JS o trilho nunca sai do primeiro
        // card.
        data-recuado={ativo ? undefined : ""}
        className={`ease-snappy flex flex-col gap-32 transition-opacity duration-300 ${ativo ? "opacity-100" : "opacity-0"}`}
      >
        <motion.div
          className="flex"
          initial={CORPO.oculto}
          animate={ativo ? CORPO.visivel : CORPO.oculto}
          transition={T_CORPO}
        >
          <p className="type-m-20 text-ink md:type-m-24">{marco.desc}</p>
        </motion.div>

        {/*
          Duas linhas, cada uma com um par que converge: é a anatomia do card
          (nome + link do site; cargo + logo).

          **O período mora na segunda linha, e isso foi medido na tela.** O
          slot da direita da primeira linha costuma ser uma URL curta; aqui o da
          esquerda é o cargo "Engenharia de Software (PDI)" a 24px. Com o
          período de 22 caracteres ao lado, o cargo caía para três linhas e
          encostava nele. Na segunda linha a esquerda é curta ("Huawei
          (INATEL)") e os dois cabem.

          `flex-wrap` e não `w-full` na esquerda: `justify-between` já joga os
          dois para as pontas quando cabem, e quebra para duas linhas quando não
          cabem, que é o caso do estreito, onde 265px não seguram empresa e
          período lado a lado.
        */}
        <div className="flex flex-col gap-2 md:gap-12">
          {/* Esta linha **não** quebra: com `flex-wrap`, o cargo cabendo em
              uma linha empurrava o `01 / 05` para uma segunda, alinhado à
              esquerda e órfão. Sem quebra e com `min-w-0`, quem cede é o cargo,
              que quebra dentro de si mesmo, onde a quebra é natural. */}
          <div className="flex items-baseline justify-between gap-x-24">
            <motion.div
              className="flex min-w-0"
              initial={DA_DIREITA.oculto}
              animate={ativo ? DA_DIREITA.visivel : DA_DIREITA.oculto}
              transition={T_LINHA_CARGO}
            >
              <h3 className="type-m-20 text-ink md:type-m-24">
                {marco.cargo}
              </h3>
            </motion.div>
            <motion.div
              className="flex shrink-0"
              initial={DA_ESQUERDA.oculto}
              animate={ativo ? DA_ESQUERDA.visivel : DA_ESQUERDA.oculto}
              transition={T_LINHA_CARGO}
            >
              {/* Posição no arco. `aria-hidden` porque os pontos do carrossel
                  já dizem isso a quem não vê a tela. Este slot costuma levar
                  o link do site, e um `01` solto a 10px ficava
                  órfão ao lado de um cargo de 24px. */}
              <p
                aria-hidden
                className="type-eyebrow whitespace-nowrap text-ink/55 tabular-nums"
              >
                {ordinal}
              </p>
            </motion.div>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-x-24 gap-y-4">
            <motion.div
              className="flex min-w-0"
              initial={DA_DIREITA.oculto}
              animate={ativo ? DA_DIREITA.visivel : DA_DIREITA.oculto}
              transition={T_LINHA_EMPRESA}
            >
              {/* Caixa alta aqui seria erro: `SoftCode` e `ProOps` são marca, e
                  `Empresas.tsx` já as escreve com a caixa que elas têm. O
                  molde pediria `type-eyebrow` nesta linha; o `type-m-16` é
                  escolha deliberada, e é sobre o nome próprio. */}
              <p translate="no" className="type-m-16 text-ink/55">
                {marco.empresa}
              </p>
            </motion.div>
            <motion.div
              className="flex shrink-0"
              initial={DA_ESQUERDA.oculto}
              animate={ativo ? DA_ESQUERDA.visivel : DA_ESQUERDA.oculto}
              transition={T_LINHA_EMPRESA}
            >
              <p className="type-eyebrow whitespace-nowrap text-ink/55 tabular-nums">
                {marco.periodo}
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}

export function Trajetoria() {
  const t = useTranslations();

  const marcos: Marco[] = [
    ...MARCOS_DA_JORNADA.map((indice) => t.journey.experiences[indice]),
    t.trajectory.own,
  ];

  const titulo = `${t.trajectory.title}${t.trajectory.highlight}`;

  return (
    /**
     * Sem `w-calc` na seção e sem reveal de seção: as duas coisas são a
     * medição, não gosto. O trilho vai às **bordas da viewport** em navegador,
     * o que só é possível com a coluna morando nos blocos internos (AD-014); e
     * o cabeçalho daqui **não anima**, porque não existe um `useInView` no bloco
     * de quotes inteiro. O instinto de pendurar um `TituloDistribuido` aqui é
     * divergência, e foi por isso que ele saiu.
     */
    <section
      aria-labelledby="trajetoria"
      className="flex w-full flex-col gap-50 overflow-clip md:gap-100"
    >
      <div className="w-calc flex flex-col">
        <h2
          id="trajetoria"
          className="strong-accent type-m-40 leading-none text-balance max-w-[90%] md:flex md:type-m-64 md:max-w-full"
        >
          <GlifoDeConvergencia />
          <span className="md:max-w-900">
            {t.trajectory.title}
            <strong>{t.trajectory.highlight}</strong>
          </span>
        </h2>
      </div>

      {/*
        A invariante que faz a conta do índice fechar, e a frase mais importante
        do spec: `padding-inline == scroll-padding-inline`. Com as
        duas iguais, a posição de encaixe do card *i* é exatamente
        `i * (largura + gap)`, que é a divisão que o `Carrossel` faz para saber
        quem está ativo. Se divergirem, o índice erra perto das bordas.

        `100vw` e não `100%`: o trilho sangra a seção inteira agora, e
        `50%` de um contêiner com calha centraria no lugar errado.

        Sem `go(1)` no mount. Rolar para o segundo card ao montar faz sentido
        com oito depoimentos, é um "tem mais aqui"; com cinco marcos
        significaria que o começo do arco nunca é o que aparece, e o arco só faz
        sentido começando na fibra. Divergência decidida, não esquecimento.
      */}
      <Carrossel
        className="flex w-full flex-col flex-nowrap gap-50 md:gap-100"
        itens={marcos}
        // Chave por posição, nunca pelo texto: trocar de idioma remonta o card,
        // e remontar reinicia o reveal de 0.9s, que piscaria a cada troca de
        // língua.
        chave={(_marco, indice) => `marco-${indice}`}
        // A mesma divisão da `Entregas`: o trilho leva o rótulo da seção e os
        // pontos levam o título. Sem o `TituloDistribuido`, `trajectory.label`
        // deixou de aparecer na tela. Este é o trabalho que sobrou para ele, e
        // é o certo: "Como cheguei aqui" nomeia a lista que rola.
        rotulo={t.trajectory.label}
        rotuloDosPontos={titulo}
        classeDoTrilho="gap-32 px-[calc((100vw-26.5rem)*0.5)] scroll-px-[calc((100vw-26.5rem)*0.5)] md:gap-148 md:px-[calc((100vw-42.5rem)*0.5)] md:scroll-px-[calc((100vw-42.5rem)*0.5)]"
        classeDoItem="flex w-265 shrink-0 snap-center flex-col gap-32 py-10 md:w-425"
        classeDosPontos=""
        renderizar={(marco, indice, ativo) => (
          <CartaoDoMarco
            marco={marco}
            ordinal={`${String(indice + 1).padStart(2, "0")} / ${String(marcos.length).padStart(2, "0")}`}
            progresso={indice / (marcos.length - 1)}
            semente={indice}
            ativo={ativo}
          />
        )}
      />
    </section>
  );
}
