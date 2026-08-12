"use client";

import { View } from "@react-three/drei";
import { CampoDeBlocos } from "@/components/canvas/CampoDeBlocos";
import { CanvasDoCampo } from "@/components/canvas/CanvasDoCampo";
import { TituloDistribuido } from "@/components/motion/TituloDistribuido";
import { Botao, SetaExterna } from "@/components/ui/Botao";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTranslations } from "@/hooks/useTranslations";
import { useStore } from "@/store";

/**
 * SEC-02 e SEC-03: as duas empresas com composição societária e o que cada uma
 * faz. Nome e endereço são marca, não copy: ficam aqui e são pareados por
 * posição com `companies.entries` do locale, o mesmo padrão de `journey`.
 *
 * `softcodedev.com.br` sem `www`: o host com `www` responde 522.
 */
const COMPANIES = [
  { nome: "SoftCode", href: "https://softcodedev.com.br/" },
  { nome: "ProOps", href: "https://www.proops.com.br/" },
];

/**
 * `escala` e `brilho` são **medidos neste call site**, não herdados (AD-015). O
 * passo de bloco aqui é ~2,6px num painel de 488 e a cobertura âmbar é 5,73%,
 * outra ordem de grandeza do painel da `Entregas`, que é retangular.
 */
const CAMPO = { escala: 0.625, brilho: 0.4705, raioDaBorda: 0.035 };

/**
 * O molde de *abordagem*, medido em 1440×900 (topo 3650, altura
 * 2219) e em 390×844.
 *
 * A anatomia: um cartão `bg-surface` de canto 24px ocupando a seção inteira, com
 * cabeçalho centrado, uma régua com marcadores nas pontas, e embaixo duas
 * colunas: à esquerda um painel quadrado que **gruda no centro da viewport**,
 * à direita os blocos de texto passando por ele.
 *
 * **A coluna gruda sem medir nada em JS.** O caminho óbvio escreve `--height`,
 * `--padding-top` e `--padding-bottom` por `ResizeObserver` e usa
 * `sticky top-[calc((100vh-var(--height))*0.5)]`, e serve `NaNpx` no SSR
 * enquanto a medição não aconteceu. As três variáveis são deriváveis: as duas
 * colunas são `w-1/2` da mesma linha, e o painel é `aspect-square`, então a
 * altura dele **é** a largura de qualquer uma das duas. `container-type:
 * inline-size` põe isso em `cqw` e o CSS resolve sozinho, no primeiro quadro,
 * em qualquer largura.
 *
 * **O SVG de raios não entra, e isso foi medido.** O molde põe oito raios
 * de 6px dentro do painel, girando com o scroll. Escondendo o canvas do
 * R3F eles aparecem inteiros; com o canvas visível, **nenhum pixel deles chega
 * à tela**: o WebGL pinta por cima. Desenhar elemento invisível é só peso,
 * e cortá-lo evita mais um mapeamento de scroll sujeito ao AD-009.
 */
export function Empresas() {
  const t = useTranslations();
  /**
   * `useSyncExternalStore` por baixo: já no primeiro render do cliente o valor
   * é o certo, então não há um frame com o ramo errado montado.
   */
  const ehLargo = useMediaQuery("(min-width: 768px)");
  // Mesmo portão do `BackgroundCanvas`: `false` no servidor e até a hidratação
  // resolver se há WebGL.
  const temWebGL = useStore((state) => state.webglAvailable);

  return (
    <section
      aria-labelledby="empresas"
      className="relative flex w-full flex-col md:px-50 md:pb-50"
    >
      {/*
        O brilho de fundo. O molde pede um vídeo desfocado a `opacity-20`
        num retângulo 16/9 de 8/12 da largura, **no rodapé** do bloco, não no
        topo, que é onde o gradiente daqui estava. Um radial dá o mesmo halo sem
        asset, sem request e sem decodificação de vídeo em segundo plano.

        **O alfa é 0.15 e não pode voltar a 0.35.** Ele nasceu 0.35 com o azul
        da v4, e a troca de paleta manteve o número: azul a 35% sobre preto
        resolve em 1,34:1, âmbar a 35% em 1,63:1, ou seja, o mesmo alfa em
        matiz mais claro virou um véu por cima da coluna de texto. Não é falha
        de WCAG (o texto seguia em 10,78:1, e por isso a suíte não pegou), é
        perda de nitidez percebida. A 0.15 o halo fica em 1,14:1 e o texto sobe
        para 15,7:1.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 -bottom-40 left-0 flex-center md:bottom-0"
      >
        <div className="aspect-video w-8/12 rounded-[4.0798rem] bg-[radial-gradient(ellipse_at_center,rgba(255,90,31,0.15),transparent_70%)] blur-[6rem]" />
      </div>

      {/*
        Canto de 24px numa caixa que sangra a viewport no estreito: abaixo do
        `md` a seção não tem calha (`md:px-50`), então o cartão encosta nas
        bordas e só as quinas arredondam.

        **`ink/6` e não `bg-surface`, e o motivo é o canvas.** O `--color-surface`
        (#0d0c0b) é opaco, e o `<Canvas>` global mora em `z-100`, **atrás** do
        conteúdo em `z-200`: o `View` do drei só aparece porque o que está por
        cima dele é transparente. Com o cartão opaco o painel saía **preto**, sem
        erro nenhum: a caixa media 487,5 certinho, o `View` montava, e não havia
        um pixel âmbar. Sobre preto, `#f5e9df` a 6% resolve em #0f0e0d, a mesma
        cor, agora deixando o campo passar.
      */}
      <div className="relative rounded-[2.4rem] bg-ink/6 px-33 py-100 md:px-110 md:py-150">
        <div className="flex flex-col gap-50 md:gap-100">
          <div className="flex flex-col gap-32 md:gap-100">
            {/* Aqui o título é **centrado**, não alinhado à coluna: o
                `TituloDistribuido` já distribui de `justify-center` para
                `justify-between`, que é exatamente o gesto medido. */}
            <TituloDistribuido id="empresas" rotulo={t.companies.label}>
              {`${t.companies.title}*${t.companies.highlight}*`}
            </TituloDistribuido>

            <div className="mx-auto flex md:max-w-655">
              <p className="type-m-16 text-center text-balance text-ink/55 md:type-m-24">
                {t.companies.description}
              </p>
            </div>
          </div>

          {/* A régua, com um quadrado de 8px em cada ponta, meio passo acima da
              linha (`-top-4`). Some abaixo do `md`. */}
          <div aria-hidden className="relative hidden w-full md:flex">
            <div className="h-1 w-full bg-ink/10" />
            <span className="absolute -top-4 left-0 size-8 bg-accent" />
            <span className="absolute -top-4 right-0 size-8 bg-accent" />
          </div>

          <div className="relative flex w-full flex-col gap-50 [container-type:inline-size] md:flex-row md:gap-145">
            {/*
              `container-type: inline-size` é o que substitui o `--height` do
              JS: `100cqw` é a largura desta coluna, que por ser `w-1/2` de uma
              linha com `gap-145` é a mesma da coluna de texto. E, como o painel
              é `aspect-square`, é também a altura dele. Medido em 1440: 487,5.

              `100svh` e não `100vh`: no iOS o `vh` conta a barra de endereço
              recolhida, e o painel ficaria descentrado enquanto ela está aberta.
            */}
            <div className="relative w-full [container-type:inline-size] md:w-1/2">
              <div className="relative aspect-square overflow-clip rounded-[1.6rem] md:sticky md:top-[calc((100svh-100cqw)*0.5)]">
                {/*
                  **Dois caminhos para o mesmo campo, e o motivo é o scroll de
                  toque.** O `<View>` do drei recorta o canvas fixo pelo
                  `getBoundingClientRect()` do alvo, lido no `useFrame`. No
                  estreito o scroll é do compositor (`syncTouch: false`) e o rAF
                  fica para trás: medido no celular, o quadrado descia até
                  debaixo do rótulo "Software house" enquanto o dedo arrastava e
                  só voltava ao lugar quando o scroll parava. Não há como colar
                  um recorte pintado na main thread num conteúdo que o
                  compositor move.

                  Abaixo do `md`, então, o campo ganha canvas **próprio dentro do
                  painel**: aí não há recorte nenhum, e o compositor move os
                  pixels junto com a página, como faria com uma imagem. O preço
                  é um segundo contexto WebGL no celular e um campo que
                  **congela** durante o arrasto rápido (o compositor reexibe o
                  último frame) — congelar colado é melhor que animar descolado.

                  A `Entregas` não precisa disso: o painel dela é `md:flex`.
                */}
                {ehLargo ? (
                  <View className="size-full">
                    <CampoDeBlocos opcoes={CAMPO} />
                  </View>
                ) : (
                  temWebGL && (
                    <>
                      <CanvasDoCampo>
                        <CampoDeBlocos opcoes={CAMPO} />
                      </CanvasDoCampo>
                      {/*
                        O véu que o cartão dava de graça. No largo o campo é
                        visto **através** do `bg-ink/6`, e aqui ele passou a
                        pintar por cima: medido, o âmbar saía (161,74,8) contra
                        (167,84,21), e o fundo do campo, preto puro, contra o
                        #0f0e0d do cartão. Repor a mesma camada por cima devolve
                        a composição idêntica (161·0,94 + 245·0,06 = 167).
                      */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-ink/6"
                      />
                    </>
                  )
                )}
              </div>
            </div>

            {/*
              O ritmo da coluna de texto sai das mesmas duas variáveis: o vão
              entre blocos é meia altura de painel e o recuo do topo centra o
              primeiro bloco contra ele. Os coeficientes são a resolução medida
              em 1440 (243,75 e 152,7) postos em `cqw`, o que os mantém
              proporcionais em qualquer largura sem medir nada.

              **A unidade tem de vir do contêiner de cima.** `container-type` no
              próprio elemento não vale para as propriedades dele: `cqw` resolve
              sempre contra o contêiner **ancestral** mais próximo, e sem um
              deles cai no viewport: medido, `50cqw` virou 720px em vez de
              243,75. Por isso quem declara o contêiner aqui é a linha, e a
              largura do painel volta a ser derivada dela: `(100cqw − 14.5rem)/2`.
            */}
            <ul className="flex w-full flex-col gap-50 md:w-1/2 md:gap-[calc((100cqw-14.5rem)/4)] md:pt-[calc((100cqw-14.5rem)*0.157)]">
              {COMPANIES.map((company, index) => {
                const entry = t.companies.entries[index];
                return (
                  <li
                    key={company.nome}
                    className="flex max-w-430 flex-col gap-32"
                  >
                    <div className="flex flex-col gap-16">
                      <p className="flex items-center gap-12 type-eyebrow text-ink">
                        <span aria-hidden className="size-8 shrink-0 bg-accent" />
                        {entry.tipo}
                      </p>
                      <div className="h-1 w-full bg-ink/10" />
                    </div>

                    <h3
                      translate="no"
                      className="type-m-32 text-ink md:type-m-40"
                    >
                      {company.nome}
                    </h3>

                    <p className="type-m-16 text-pretty text-ink/55 md:type-m-24">
                      {entry.desc}
                    </p>

                    <div className="flex flex-wrap gap-x-32 gap-y-8 type-m-12 text-ink/55">
                      <span>{entry.desde}</span>
                      <span>{entry.sociedade}</span>
                    </div>

                    <Botao
                      href={company.href}
                      externo
                      tema="border"
                      icone={<SetaExterna />}
                      className="w-fit"
                    >
                      {t.caseStudy.visit}
                    </Botao>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
