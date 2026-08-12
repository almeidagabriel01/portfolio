"use client";

import { AnimatePresence, motion } from "motion/react";
import { LinkDeRota as Link } from "@/components/ui/LinkDeRota";
import { useEffect, useRef, useState } from "react";
import { CampoDeBlocos } from "@/components/canvas/CampoDeBlocos";
import { CanvasDoCampo } from "@/components/canvas/CanvasDoCampo";
import { TituloDistribuido } from "@/components/motion/TituloDistribuido";
import { Botao, SetaDireita } from "@/components/ui/Botao";
import { Carrossel } from "@/components/ui/Carrossel";
import { portfolioProjects, type Project } from "@/data/projects";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTranslations } from "@/hooks/useTranslations";
import { EASE } from "@/lib/motion";
import { useStore } from "@/store";

/**
 * A grade mostra **todos** os projetos, em duas fileiras que são as duas
 * naturezas do trabalho: as entregas profissionais em cima, os exercícios de
 * curso embaixo. É a mesma divisão que a descrição da seção já anunciava
 * ("quatro entregas profissionais [...] e três exercícios de curso"), e é o que
 * permite as duas fileiras terem larguras de célula diferentes sem parecer
 * sobra: elas não são a mesma coisa cortada, são dois conjuntos.
 *
 * Antes daqui saía um `.slice(0, 6)` que deixava um estudo de fora, e o rótulo
 * dizia "Seis projetos publicados" enquanto `/projetos` listava sete.
 *
 * **A altura é o que não pode mudar**: duas fileiras de 260 dão os 520 do
 * painel ao lado, e é essa igualdade que faz o bloco fechar. Um terceiro grupo
 * exigiria repensar a proporção, não acrescentar uma fileira.
 */
const PROFISSIONAIS = portfolioProjects.filter(
  (project) => project.grupo !== "estudo",
);
const ESTUDOS = portfolioProjects.filter(
  (project) => project.grupo === "estudo",
);
const NA_GRADE: Project[] = [...PROFISSIONAIS, ...ESTUDOS];

/**
 * Quantas células cada fileira tem. O recorte da mídia sai daqui, então as duas
 * contas nunca divergem do que está na tela.
 *
 * **A grade em si é CSS** (`grid-cols-12`, as quatro primeiras em `col-span-3`
 * e as três últimas em `col-span-4`): classe do Tailwind é texto-fonte, não dá
 * para montar por template. Mudando o número de projetos de um grupo, é lá que
 * o span acompanha — e 12 só divide bem por 4 e por 3.
 */
const CELULAS_POR_FILEIRA = [PROFISSIONAIS.length, ESTUDOS.length] as const;

/**
 * As transições da célula, que **não** são a mesma de propósito.
 *
 * O nome sai mais devagar (0.4) do que o overlay entra (0.3), e é essa
 * defasagem que faz a célula ler como *troca* e não como crossfade. O scrim vai
 * sem `transition` porque o default do motion para opacidade já é o que o
 * bloco pede ali (0.3s, `[.25,.1,.35,1]`); declarar `{duration:.3}` mudaria
 * a curva para `easeOut`, que é a do overlay.
 */
const TRANSICAO_DO_NOME = { duration: 0.4, ease: EASE.OUT_SNAPPY } as const;
/**
 * A troca de mídia entre um card e o seguinte, medida em navegador: a camada
 * que sai vai a 0 enquanto a que entra vem de 0, **ao mesmo tempo**, e as duas
 * fecham em ~430ms. Amostrado no meio do caminho, `0.826` aos 96ms de 400,
 * que é `OUT_SNAPPY`, não `easeOut`.
 */
const TRANSICAO_DA_MIDIA = { duration: 0.4, ease: EASE.OUT_SNAPPY } as const;
/**
 * A abertura do recorte e o assentamento da escala, atrás da opacidade: **uma
 * constante para os dois, de propósito.**
 *
 * A escala já assentou em 0,8 contra 0,55 do recorte, e a defasagem pretendia
 * dar profundidade. O que ela dava era um rastro: com a janela inteira aberta
 * aos 550ms, o quadro continuava deslizando por mais um quarto de segundo e só
 * então parava, movimento sem gesto nenhum a justificar, porque a abertura que
 * o motivava já tinha acabado. Amarrados na mesma constante, param juntos e a
 * defasagem não volta por descuido.
 */
const TRANSICAO_DA_ABERTURA = {
  duration: 0.55,
  ease: EASE.OUT_SNAPPY,
} as const;

const FILEIRAS = CELULAS_POR_FILEIRA.length;

/**
 * Onde a célula `indice` fica na malha, em fração de 0 a 1: qual fileira e que
 * faixa horizontal ela ocupa. As fileiras têm contagens diferentes (4 e 3),
 * então a largura da célula depende de qual delas é.
 */
function lugarDaCelula(indice: number) {
  let fileira = 0;
  let restante = indice;
  while (fileira < FILEIRAS - 1 && restante >= CELULAS_POR_FILEIRA[fileira]) {
    restante -= CELULAS_POR_FILEIRA[fileira];
    fileira++;
  }
  const largura = 1 / CELULAS_POR_FILEIRA[fileira];
  return {
    fileira,
    esquerda: restante * largura,
    largura,
    topo: fileira / FILEIRAS,
    altura: 1 / FILEIRAS,
  };
}

/**
 * O retângulo da célula `indice`, em `inset()` percentual sobre a malha inteira.
 *
 * É daqui que a mídia **abre**: ela nasce recortada exatamente na célula
 * apontada e cresce até tomar a malha inteira. O gesto óbvio seria entrar só
 * por opacidade; o recorte é acréscimo, e usa a geometria que o bloco já tem em
 * vez de inventar um gesto: a grade abre uma janela, e a janela é a célula que
 * você apontou. Percentual e não pixel: nada a medir, nada a ressincronizar
 * quando a coluna muda de largura.
 */
function recorteDaCelula(indice: number): string {
  const { esquerda, largura, topo, altura } = lugarDaCelula(indice);
  const pct = (n: number) => `${(n * 100).toFixed(4)}%`;
  return `inset(${pct(topo)} ${pct(1 - esquerda - largura)} ${pct(1 - topo - altura)} ${pct(esquerda)})`;
}

const RECORTE_ABERTO = "inset(0% 0% 0% 0%)";

/**
 * O centro da célula `indice`, como `transform-origin`.
 *
 * **É o que conserta o escorregão em X.** A escala pivota no centro do próprio
 * vídeo, mas o recorte abre ancorado na borda da célula, então, olhando pela
 * janela, o conteúdo entrava 25px deslocado e deslizava para o lugar conforme a
 * escala assentava. Pivotando no centro da célula apontada, o ponto que está
 * sob o cursor fica **parado** e o resto cresce em volta dele, que é o gesto que
 * a abertura já sugeria.
 */
function origemDaCelula(indice: number): string {
  const { esquerda, largura, topo, altura } = lugarDaCelula(indice);
  const pct = (n: number) => `${(n * 100).toFixed(4)}%`;
  return `${pct(esquerda + largura / 2)} ${pct(topo + altura / 2)}`;
}
const TRANSICAO_DO_OVERLAY = { duration: 0.3 } as const;
const TRANSICAO_DO_ROTULO = {
  duration: 0.3,
  delay: 0.1,
  ease: EASE.OUT_SNAPPY,
} as const;

/**
 * `next/link` animado. A célula inteira é o link e é ela também quem escuta o
 * hover: um `<a>` cru custaria navegação de cliente inteira em todo case.
 */
const LinkAnimado = motion.create(Link);

/**
 * SEC-10 e SEC-18 no molde do bloco *portfolio*, o primeiro
 * depois do hero.
 *
 * O bloco tem duas metades e as duas importam. À esquerda, uma malha de 3 × 2
 * onde apontar para uma célula **escurece as outras** e revela o que aquela
 * entrega é. À direita, um painel do mesmo tamanho com o campo de blocos, duas
 * linhas de rótulo distribuídas ponta a ponta e um botão no meio. A versão
 * anterior daqui tinha só a metade esquerda, com metade da altura.
 *
 * Dois detalhes carregam o efeito:
 *
 * 1. **`emDestaque` é um só, no nível do bloco.** Se cada célula guardasse o
 *    próprio hover, as irmãs não teriam como escurecer e sobraria um card
 *    piscando sozinho.
 * 2. **A mídia é uma só e é irmã da malha**, cobrindo todas as células de uma
 *    vez. É isso que faz o hover parecer que a grade abriu uma janela, em vez
 *    de sete janelinhas independentes.
 *
 * Não temos wordmark das marcas, e inventar um asset seria mentir sobre elas: o
 * nome ocupa a caixa do logo (20px de altura, 120 de largura).
 */
/**
 * Qual célula está apontada, e se a mídia dela deve **abrir** ou apenas cruzar
 * com a anterior.
 *
 * `abrir` é decidido no instante do apontamento porque é só ali que a
 * informação existe: veio do vazio, ou de outro card?
 */
interface Destaque {
  slug: string;
  abrir: boolean;
}

export function Entregas() {
  const t = useTranslations();
  const locale = useStore((state) => state.locale);
  const [destaque, setDestaque] = useState<Destaque | null>(null);
  const emDestaque = destaque?.slug ?? null;

  /**
   * Quando o último apontamento terminou.
   *
   * **Não dá para perguntar "o destaque era nulo?"**: indo de um card ao
   * vizinho, o ponteiro atravessa a divisa e o `onHoverEnd` do primeiro dispara
   * **antes** do `onHoverStart` do segundo. O estado passa por `null` no
   * caminho, e a pergunta ingênua responde "veio do vazio" em toda troca, que
   * era justamente o caso em que o recorte não pode abrir.
   *
   * A condição que importa é outra: **a camada anterior ainda está na tela?**
   * Ela sai em `TRANSICAO_DA_MIDIA.duration`, então é isso que se mede.
   */
  const fimDoAnterior = useRef(0);

  /**
   * O bloco da mídia está por perto?
   *
   * **Um observador no bloco, não um por cartão.** O cartão vive num trilho com
   * `overflow-x`, e a intersecção é calculada contra o recorte de **todo**
   * ancestral que rola: o sétimo cartão, a ~1.800px à direita, nunca
   * "intersecta" a viewport por mais folga de `rootMargin` que se dê — medido,
   * `9999px` na horizontal não muda um bit. O que se quer saber é outra coisa,
   * e é do bloco: ele está perto o bastante para o visitante alcançar qualquer
   * cartão com um deslize?
   */
  const [blocoDaMidia, blocoPerto] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0,
    rootMargin: "200px",
  });

  const apontar = (slug: string) =>
    setDestaque((atual) =>
      atual?.slug === slug
        ? atual
        : {
            slug,
            abrir:
              performance.now() - fimDoAnterior.current >
              TRANSICAO_DA_MIDIA.duration * 1000,
          },
    );

  const largar = () => {
    fimDoAnterior.current = performance.now();
    setDestaque(null);
  };

  /**
   * Onde não há ponteiro não há hover, e um reveal que só o hover abre deixaria
   * o conteúdo inalcançável no celular. Sem hover, a célula nasce aberta, que
   * é também o que o servidor renderiza, então o texto está no HTML e continua
   * legível sem JS (AD-011).
   */
  const temPonteiro = useMediaQuery("(hover: hover)");

  /**
   * Qual das duas apresentações monta a mídia. As duas existem no mesmo DOM e
   * `display:none` **não** impede o browser de baixar e decodificar um
   * `<video autoplay>`. Sem esta escolha, o desktop carregaria os sete vídeos
   * do carrossel além do da célula apontada.
   */
  const ehLargo = useMediaQuery("(min-width: 48rem)");

  /*
    Aqui existia um `preload` das capturas do hover: a camada do largo montava
    **vazia** por ~330ms nas duas células que não tinham vídeo, porque o poster
    dos vídeos já vinha baixado pelo HTML do estreito e a captura não. As duas
    células agora têm vídeo como todas as outras (`Project.video` é
    obrigatório), então não há mais uma segunda mídia para aquecer: o poster
    serve as duas apresentações e desce uma vez só.
  */

  const indiceEmDestaque = NA_GRADE.findIndex(
    (project) => project.slug === emDestaque,
  );
  const destacado =
    indiceEmDestaque >= 0 ? NA_GRADE[indiceEmDestaque] : undefined;

  return (
    <section
      aria-labelledby="entregas"
      className="relative flex w-full flex-col gap-50 overflow-clip py-30 md:gap-100 md:py-50"
    >
      <div className="w-calc flex flex-col gap-32 md:gap-80">
        <TituloDistribuido id="entregas" rotulo={t.deliveries.label}>
          {`${t.deliveries.title}*${t.deliveries.highlight}*`}
        </TituloDistribuido>

        {/* Largura em pixel, não em `ch`: o `ch` resolve contra o root de 10px
            e devolve uma coluna estreita demais. */}
        <p className="mx-auto text-center type-m-16 text-balance text-ink/55 md:max-w-655 md:type-m-24">
          {t.deliveries.description}
        </p>
      </div>

      {/*
        A moldura só existe a partir do `md`. Abaixo disso a mesma lista vira
        carrossel, e uma borda em volta de um trilho que rola cortaria o cartão
        que sangra pela direita, então o wrapper também só ganha a coluna no
        `md`, para o trilho poder ir até as bordas da viewport.

        `border-[#57534e]` é o hex medido em navegador, e não
        `border-line` (`#2a2622`): essa é 2,3× mais escura e some contra o
        preto. A malha é o grafismo dominante do bloco, então o hex entra como
        fato (AD-008). Literal e não constante: o Tailwind varre o texto-fonte, e
        classe montada por template literal não chega a existir.
      */}
      <div
        ref={blocoDaMidia}
        className="relative md:w-calc md:grid md:grid-cols-2 md:border md:border-[#57534e]"
      >
        <div className="relative">
          {/*
            A mídia: um vídeo do site rolando, montado no hover, cobrindo as
            as células, a mesma construção. Imagem parada lê
            como screenshot colado; é o movimento que faz a grade parecer ter
            aberto uma janela.
          */}
          {ehLargo && (
            <div aria-hidden className="absolute inset-0">
              {/*
                `AnimatePresence` **sem** `mode="wait"`: medido em navegador, a
                camada que sai e a que entra convivem e cruzam. Com `wait` a
                antiga teria de terminar antes, e a troca de card viraria um
                piscar para o preto no meio do caminho.

                A `key` é o slug, então trocar de card desmonta uma camada e
                monta outra, que é o que dá a "abertura" a cada card novo. Um
                `<video>` só, trocando de `src`, salta.
              */}
              <AnimatePresence>
                {destacado && (
                  <motion.div
                    key={destacado.slug}
                    /*
                      `overflow-clip` **não** é redundante com o `clipPath`.
                      Quem segurava o vídeo em 1.08 era só o recorte, e recorte
                      é rasterizado no grid de pixel do dispositivo: com o bloco
                      pousado em Y fracionário (o layout dá 471,53), a aresta do
                      `inset(0%)` arredonda para fora e o quadro sem véu pinta a
                      linha de 1px da moldura, a "borda clara" que aparecia em
                      cima e, em larguras onde a calha cai em meio pixel, também
                      à esquerda. O `overflow` corta pela caixa, antes do
                      recorte, e some com a sobra.
                    */
                    className="absolute inset-0 overflow-clip"
                    /*
                      **O recorte só abre vindo do vazio.**

                      Entre um card e outro, a camada nova cresce por cima da
                      antiga, que ainda está saindo, e o encontro das duas na
                      aresta do recorte são dois vídeos diferentes colados num
                      corte duro, que é a "bordinha" que aparecia e sumia. Com a
                      grade já aberta, a troca é o crossfade puro:
                      as duas camadas cobrem tudo e não há aresta onde discordar.

                      O empurrão da escala fica nos dois casos: ele não cria
                      fronteira, porque a camada inteira anda junto.
                    */
                    initial={{
                      opacity: 0,
                      clipPath: destaque?.abrir
                        ? recorteDaCelula(indiceEmDestaque)
                        : RECORTE_ABERTO,
                    }}
                    animate={{ opacity: 1, clipPath: RECORTE_ABERTO }}
                    /*
                      A saída é só opacidade, como em navegador. Fechar o
                      recorte junto poria duas cortinas em direções opostas no
                      mesmo instante, e o que se lê aí é confusão, não troca.
                    */
                    exit={{ opacity: 0 }}
                    transition={{
                      ...TRANSICAO_DA_MIDIA,
                      clipPath: TRANSICAO_DA_ABERTURA,
                    }}
                  >
                    {/*
                      O empurrão. Anda junto com o recorte e para junto com ele:
                      a janela abre e o quadro chega no mesmo instante, sem
                      sobra deslizando depois que não há mais o que abrir.
                    */}
                    {/*
                      Uma mídia só, para os sete. Aqui havia um ramo com
                      `<Image>` para os projetos sem gravação: a mesma célula
                      abria com vídeo num projeto e com captura parada no
                      vizinho, e as duas versões tinham timing e modo de falha
                      diferentes. Com `Project.video` obrigatório o ramo não
                      tem mais o que atender.
                    */}
                    <motion.video
                      poster={destacado.poster}
                      autoPlay
                      muted
                      loop
                      playsInline
                      initial={{ scale: 1.08 }}
                      animate={{ scale: 1 }}
                      transition={TRANSICAO_DA_ABERTURA}
                      style={{
                        transformOrigin: origemDaCelula(indiceEmDestaque),
                        // O mesmo piso do cartão do estreito: `autoPlay`
                        // derruba a *show poster flag* já na montagem, e a
                        // camada abriria vazia no vão até o primeiro quadro.
                        // Ver o `<video>` da `Celula`.
                        backgroundImage: `url("${destacado.poster}")`,
                      }}
                      className="size-full bg-cover bg-top bg-no-repeat object-cover object-top"
                    >
                      {/* WebM primeiro: quem sabe VP9 baixa o menor. */}
                      <source src={destacado.video} type="video/webm" />
                      <source src={destacado.videoMp4} type="video/mp4" />
                    </motion.video>
                    {/*
                      Véu fixo sobre a mídia, e o número é medido, não gostado.

                      Os vídeos são peças de marca, escuras e
                      feitas para levar texto por cima; os nossos são páginas
                      reais, e o `proops` tem luminância mediana 0,99. Só com o
                      scrim de foco (0.5, fato) o rótulo de 12px
                      fica a 3,3:1 sobre branco e reprova o AA.

                      `/35` é o piso que resolve o pior caso (branco puro cai a
                      0,325 em sRGB e o rótulo sobe para ~6,5:1) sem apagar o
                      caso oposto: a LyftConnect é um site escuro, e a 0,55 o
                      vídeo dela sumia. Quem confere é `home.spec.ts`, que mede
                      o contraste na tela.
                    */}
                    <div className="absolute inset-0 bg-black/15" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <Carrossel
            itens={NA_GRADE}
            chave={(project) => project.slug}
            rotulo={t.deliveries.label}
            rotuloDosPontos={`${t.deliveries.title}${t.deliveries.highlight}`}
            /*
              Um DOM só para as duas apresentações. Duplicar a marcação
              (grade escondida no estreito, carrossel escondido no largo)
              custaria dois lugares para corrigir cada vez que uma entrega
              muda.

              O trilho é flex com snap no estreito (cartões de 265px
              centrados) e vira malha de três colunas no largo.
            */
            /*
              No largo, duas fileiras com contagens diferentes: `grid-cols-12`
              com as quatro entregas profissionais em `col-span-3` e os três
              estudos em `col-span-4`. As variantes `nth-child` mantêm o
              trilho único que o estreito precisa para o snap — duplicar a
              marcação custaria dois lugares para corrigir a cada entrega nova.
            */
            classeDoTrilho="gap-32 px-[calc((100vw-26.5rem)*0.5)] scroll-px-[calc((100vw-26.5rem)*0.5)] md:grid md:grid-cols-12 md:gap-0 md:overflow-visible md:px-0 md:[&>*:nth-child(-n+4)]:col-span-3 md:[&>*:nth-child(n+5)]:col-span-4"
            classeDoItem="w-265 shrink-0 snap-center md:w-full"
            // Os pontos não têm o que navegar quando todas as células estão na
            // tela ao mesmo tempo.
            className="md:[&>[role=group]]:hidden"
            renderizar={(project, _indice, ativo) => (
              <Celula
                project={project}
                ativo={ativo}
                locale={locale}
                rotuloDaAtribuicao={t.deliveries.by}
                rotuloDeEstudo={t.projects.groups.estudo}
                rotuloDoCase={t.projects.viewCase}
                emDestaque={emDestaque}
                temPonteiro={temPonteiro}
                blocoPerto={blocoPerto}
                ehLargo={ehLargo}
                aoEntrar={() => apontar(project.slug)}
                aoSair={largar}
              />
            )}
          />
        </div>

        {/*
          A metade direita. Tem exatamente o mesmo tamanho da malha
          (669 × 520), e é o que dá ao bloco a proporção que ele tem.
        */}
        <div className="relative hidden flex-col items-center justify-between p-30 md:flex">
          {/* Canvas próprio dentro do painel, não recorte de canvas fixo: ver
              `CanvasDoCampo`.

              Atrás de `ehLargo` e não só do `hidden md:flex` do pai: `display:
              none` esconde o canvas, mas o contexto WebGL continua criado e o
              loop continua a desenhar num retângulo de tamanho zero. Este
              painel não existe abaixo do `md`; o contexto dele também não deve. */}
          {ehLargo && (
            <div className="absolute inset-0">
              {/*
                **Os dois números são medidos, não escolhidos.**

                `escala`: contei as corridas de pixel âmbar no retângulo do
                painel: o passo do bloco é 5px, e invertido em
                `passo = 0,7773 / escala` dá 0,1555. É o default do
                `CAMPO_PADRAO`, e confirma que o `0.08` da Empresas está com o
                dobro do tamanho.

                `brilho`: o default (`0.478`) foi calibrado na escala do hero
                (`0.41`) e aqui dá 8,63% de cobertura. A cobertura que o painel
                pede é **4,70%**, e a curva é íngreme: `0.462` dá 2,93%,
                `0.472` dá 6,37%. `0.467` dá 4,70% em cheio. Quem mexer em
                `escala`, `escalaDoCampo`, `contraste` ou `limiar` recalibra
                este número: todos dividem o mesmo eixo.
              */}
              <CanvasDoCampo>
                <CampoDeBlocos opcoes={{ escala: 0.16, brilho: 0.467 }} />
              </CanvasDoCampo>
            </div>
          )}

          <LinhaDeRotulo pontas={t.deliveries.panelTop} />

          <div className="relative">
            <Botao href="/projetos" icone={<SetaDireita />}>
              {t.deliveries.all}
            </Botao>
          </div>

          <LinhaDeRotulo pontas={t.deliveries.panelBottom} />

          <Marcador posicao="-top-4 -left-4" />
          <Marcador posicao="-bottom-4 -left-4" />
        </div>

        {/* Os quadrados de canto: 8px centrados na quina pelo recuo de 4px. São
            seis no bloco: quatro na moldura e dois na linha do meio. */}
        <Marcador posicao="-top-4 -left-4" />
        <Marcador posicao="-top-4 -right-4" />
        <Marcador posicao="-right-4 -bottom-4" />
        <Marcador posicao="-bottom-4 -left-4" />
      </div>

      {/*
        O mesmo botão do painel, para o estreito. `hidden`/`md:hidden` e não duas
        instâncias vivas: `display:none` tira o elemento da árvore de
        acessibilidade, então em qualquer viewport existe **um** link para
        `/projetos`.
      */}
      <div className="w-calc flex-center md:hidden">
        <Botao href="/projetos" icone={<SetaDireita />}>
          {t.deliveries.all}
        </Botao>
      </div>
    </section>
  );
}

/** Rótulo de duas pontas: primeira palavra à esquerda, segunda à direita. */
function LinhaDeRotulo({ pontas }: { pontas: readonly [string, string] }) {
  return (
    <p className="relative flex w-full items-center justify-between type-eyebrow text-ink">
      <span>{pontas[0]}</span>
      <span>{pontas[1]}</span>
    </p>
  );
}

/** Os quadrados só existem junto da moldura, que é `md:`. */
function Marcador({ posicao }: { posicao: string }) {
  return (
    <span
      aria-hidden
      className={`absolute hidden size-8 bg-accent md:block ${posicao}`}
    />
  );
}

interface CelulaProps {
  project: Project;
  locale: "pt" | "en";
  rotuloDaAtribuicao: string;
  rotuloDeEstudo: string;
  rotuloDoCase: string;
  emDestaque: string | null;
  temPonteiro: boolean;
  /** O bloco da mídia está perto da viewport? Ver o observador em `Entregas`. */
  blocoPerto: boolean;
  /** No largo quem mostra a mídia é a camada única da malha. */
  ehLargo: boolean;
  /** Slide corrente do carrossel. Só ele toca. */
  ativo: boolean;
  aoEntrar: () => void;
  aoSair: () => void;
}

function Celula({
  project,
  locale,
  rotuloDaAtribuicao,
  rotuloDeEstudo,
  rotuloDoCase,
  emDestaque,
  temPonteiro,
  blocoPerto,
  ehLargo,
  ativo,
  aoEntrar,
  aoSair,
}: CelulaProps) {
  const midia = useRef<HTMLVideoElement>(null);
  /**
   * O cartão está na tela? O carrossel fica bem abaixo da primeira dobra, e é
   * isto que impede o vídeo de existir para o browser antes de alguém chegar
   * perto dele. Ver `deveTocar`.
   */
  /**
   * **Um decodificador, não sete — e nenhum antes da hora.**
   *
   * No estreito todos os cartões existem ao mesmo tempo, e `autoPlay` em todos
   * põe sete vídeos decodificando em paralelo num aparelho de bateria. Quem
   * toca é o slide corrente; os outros ficam no primeiro quadro, que é o
   * `poster`.
   *
   * **E o `<source>` só entra no DOM quando o cartão está na tela**, o que não
   * é micro-otimização: medido no WebKit (motor do Safari), um `<video>` com
   * `<source>` filho **segura o evento `load` da página** enquanto faz a
   * seleção de recurso, mesmo com `preload="none"` — cinco cartões seguravam o
   * `load` da home por **3,2 segundos**, com DOMContentLoaded aos 22ms e nenhum
   * recurso pendente. E o Safari só restaura a posição de scroll **no `load`**:
   * recarregar a página no meio da hero deixava o visitante no topo por três
   * segundos e depois jogava a página para onde ele estava. Sem `<source>`, a
   * seleção de recurso termina na hora e o `load` volta a ser imediato.
   *
   * Por efeito e não por `autoPlay`: o atributo só vale na montagem, e o slide
   * ativo muda enquanto o elemento continua o mesmo. O `load()` é o que faz o
   * elemento reparar nos `<source>` que acabaram de aparecer.
   */
  const deveTocar = !ehLargo && ativo && blocoPerto;
  useEffect(() => {
    const video = midia.current;
    if (!video) return;
    if (deveTocar) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [deveTocar]);
  const alguem = emDestaque !== null;
  const este = emDestaque === project.slug;
  const aberto = temPonteiro ? (este ? 1 : 0) : 1;

  /**
   * A célula inteira é o link, como em navegador. Não há botão nenhum dentro
   * dela, e o destino é sempre o case: `case` é obrigatório em `Project`.
   *
   * Havia aqui um `temCase ? case : site ao vivo` que também trocava o alvo
   * (aba nova) e o rótulo acessível. Duas células podiam sair do site e cinco
   * não, na mesma fileira.
   */
  const href = `/projetos/${project.slug}`;

  return (
    <LinkAnimado
      href={href}
      aria-label={`${rotuloDoCase} ${project.nome}`}
      // `onHoverStart`/`onHoverEnd` do motion e não `onMouseEnter`: o motion
      // filtra ponteiro grosso, e o `mouseenter` sintético do toque deixaria a
      // célula presa em destaque depois de um tap.
      onHoverStart={aoEntrar}
      onHoverEnd={aoSair}
      onFocus={aoEntrar}
      onBlur={aoSair}
      className="group flex w-full flex-col gap-32 focus-visible:outline-2 focus-visible:outline-accent md:relative md:h-260 md:gap-0 md:border-r md:border-b md:border-[#57534e]"
    >
      {/*
        A caixa da mídia. No estreito ela **é** o cartão (265 × 345, cantos de
        1.6rem); no largo ela cobre a célula inteira e vira o palco das três
        camadas do hover.
      */}
      <div className="relative h-345 w-full overflow-clip rounded-[1.6rem] bg-ink/20 md:absolute md:inset-0 md:h-auto md:rounded-none md:bg-transparent">
        {/* Só no estreito: no largo quem mostra a mídia é a camada única da
            malha, e um vídeo por célula devolveria as sete janelinhas.

            Aqui existia um segundo ramo, com `<Image>`, para os projetos que
            não tinham gravação — dois dos sete. Ele trazia junto o problema de
            carregamento que o ramo do vídeo não tem: o `lazy` do `next/image`
            decide pela viewport, e num trilho horizontal o cartão seis
            posições à direita nunca entra nela, então a captura ficava por
            carregar e a caixa aparecia cinza ao deslizar até lá. Dois ramos,
            dois modos de falha. Com `Project.video` obrigatório sobra um. */}
        {!ehLargo && (
          <>
            <video
              ref={midia}
              aria-hidden
              poster={project.poster}
              muted
              loop
              playsInline
              /*
                Só o slide corrente, e só na tela, baixa. Com `metadata` em
                todos, abrir a home no celular puxava ~190 kB de vídeo que
                ninguém ia ver; assim o cartão mostra o poster e o arquivo só
                desce quando o dedo chega nele.
              */
              preload={deveTocar ? "auto" : "none"}
              /*
                **O poster também como fundo do elemento, e é isto que mata a
                piscada cinza.**

                O atributo `poster` é conteúdo substituído, e o `<video>` só o
                representa enquanto a *show poster flag* está de pé. `play()`
                derruba essa flag na hora; o primeiro quadro decodificado chega
                um quadro de composição depois. Nesse vão o elemento não
                representa nada, e o que aparece é o `bg-ink/20` da caixa — o
                cinza. Medido: o quadro cinza cai 18–26ms **depois** do evento
                `playing`, uma vez por cartão, na primeira ativação.

                O fundo CSS é pintado na caixa do próprio elemento, debaixo do
                conteúdo substituído, e não depende de flag nenhuma: o poster
                fica lá o tempo todo e o vão não tem mais o que revelar. Mesma
                URL do atributo, então é o mesmo cache — nenhum byte a mais.

                Cobre também os outros vãos da mesma família (`load()`, erro de
                decodificação, troca de recurso), que é por que a correção mora
                aqui e não numa guarda em volta do `play()`.
              */
              style={{ backgroundImage: `url("${project.poster}")` }}
              className="absolute inset-0 size-full bg-cover bg-top bg-no-repeat object-cover object-top"
            >
              {deveTocar && (
                <>
                  <source src={project.video} type="video/webm" />
                  <source src={project.videoMp4} type="video/mp4" />
                </>
              )}
            </video>
            {/*
              O mesmo véu da camada do desktop, aqui dentro do cartão. O
              molde supõe um vídeo de marca, escuro e feito para levar o logo
              por cima; os nossos screenshots são páginas claras e o nome
              pousava em cima de uma manchete. Sem isto, `bg-ink/20` do
              cartão não escurece nada: ele fica **atrás** da imagem.
            */}
            <div aria-hidden className="absolute inset-0 bg-black/15" />
          </>
        )}

        {/* O scrim escurece **mais** as irmãs (0.75) do que a apontada (0.5). É
            a diferença entre as duas que produz o foco. */}
        <motion.div
          aria-hidden
          className="absolute inset-0 hidden bg-black md:block"
          animate={{ opacity: alguem ? (este ? 0.5 : 0.75) : 0 }}
        />

        <motion.div
          className="relative flex h-full items-center justify-center"
          animate={{ opacity: alguem ? (este ? 1 : 0) : 1 }}
          transition={TRANSICAO_DO_NOME}
        >
          {/* A caixa do wordmark: 20px de altura, 120 de largura.
              O nome ocupa esse espaço em vez de exceder. */}
          <h3
            translate="no"
            className="max-w-145 text-center type-m-24 leading-none text-ink md:max-w-120 md:type-m-16"
          >
            {project.nome}
          </h3>
        </motion.div>
      </div>

      {/*
        Os rótulos. No estreito ficam embaixo do cartão; no largo viram o
        overlay do hover dentro da célula, com um em cada extremo.
      */}
      <motion.div
        className="flex flex-col gap-4 md:absolute md:inset-0 md:justify-between md:gap-16 md:px-20 md:py-24 md:text-center"
        animate={{ opacity: aberto }}
        transition={TRANSICAO_DO_OVERLAY}
      >
        {/* Os dois convergem ao mesmo tempo de direções opostas: este desce
            (+10 → 0) enquanto o de baixo sobe (−10 → 0). Sem escalonamento
            entre eles: o encontro é o gesto. */}
        <motion.p
          data-entregue-por={project.entreguePor}
          className="type-eyebrow text-ink"
          animate={{ opacity: aberto, y: aberto ? 0 : 10 }}
          transition={TRANSICAO_DO_ROTULO}
        >
          {project.entreguePor ? (
            <>
              {rotuloDaAtribuicao}{" "}
              <span translate="no">{project.entreguePor}</span>
            </>
          ) : (
            rotuloDeEstudo
          )}
        </motion.p>

        <motion.p
          className="type-m-16 text-ink md:type-m-12 xl:type-m-16"
          animate={{ opacity: aberto, y: aberto ? 0 : -10 }}
          transition={TRANSICAO_DO_ROTULO}
        >
          {project.descricao[locale]}
        </motion.p>
      </motion.div>
    </LinkAnimado>
  );
}
