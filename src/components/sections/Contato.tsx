"use client";

import {
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import { SOCIAL } from "@/components/layout/Footer";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTranslations } from "@/hooks/useTranslations";

/**
 * SEC-04: e-mail, GitHub e LinkedIn. **Nenhum telefone**, decisão do Gabriel,
 * registrada no "Out of Scope" da spec e vigiada por e2e em todas as rotas.
 *
 * As redes vêm do `SOCIAL` do rodapé em vez de uma segunda lista: as URLs são
 * as mesmas e duas cópias divergem na primeira troca de perfil.
 */
const EMAIL = "gabriel.dias01@outlook.com.br";

/**
 * A janela de scroll em que o conteúdo termina de aparecer.
 *
 * `0.8` e não `1`: o bloco fica nítido quando ainda falta um quinto da seção
 * para entrar, então ele já está legível no instante em que assenta. Terminar
 * em `1` deixaria o texto borrado até o último pixel de rolagem.
 */
const FIM_DO_REVEAL = 0.8;
const DESFOQUE_INICIAL = 20;

/**
 * A cena de fundo: raios saindo de um ponto e girando devagar.
 *
 * SVG e não gradiente CSS porque o gesto **é** a linha: um gradiente radial dá
 * brilho, não direção, e é o feixe de raios que puxa o olho para o centro onde
 * mora o e-mail. O `Empresas` usa gradiente justamente por ser o oposto: lá o
 * que se quer é só o brilho.
 *
 * Duas propriedades que são técnica, não desenho, e por isso
 * valem copiar (AD-008):
 *
 * - **as pontas terminam muito além do `viewBox`.** Com `slice` o SVG é cortado
 *   em cover, e raio que para na borda do `viewBox` some do quadro em telas
 *   largas. `ALCANCE` de 2400 unidades num `viewBox` de 1440×900 garante que
 *   toda ponta continue passando do enquadramento em qualquer proporção;
 * - **o eixo de rotação não é o cubo.** O centro do `viewBox` fica ~30 unidades
 *   do ponto de onde os raios saem, então o cubo *orbita* em vez de girar no
 *   lugar e a estrela oscila ao longo dos 180s. Alinhar os dois mata o efeito.
 *
 * Os ângulos são meus e de espaçamento irregular de propósito: leque uniforme
 * lê como ícone de sol.
 */
const CUBO = { x: 742, y: 428 };
const ALCANCE = 2400;
const RAIOS = [8, 37, 72, 119, 154, 201, 266, 318]
  .map((graus) => {
    const radianos = (graus * Math.PI) / 180;
    const x = (CUBO.x + Math.cos(radianos) * ALCANCE).toFixed(1);
    const y = (CUBO.y + Math.sin(radianos) * ALCANCE).toFixed(1);
    return `M${CUBO.x} ${CUBO.y}L${x} ${y}`;
  })
  .join("");

function CenaDeRaios() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="block size-full"
      >
        {/*
          `transform-box: view-box` é obrigatório: sem ele o `transform-origin`
          em px é resolvido contra a caixa do path (que aqui é gigante e
          assimétrica) e o eixo pula para fora da tela.

          A rotação é declarativa, então o `<MotionConfig reducedMotion="user">`
          do `SmoothScroll` a desliga sozinho para quem pede menos movimento.
        */}
        <motion.g
          style={{ transformBox: "view-box", transformOrigin: "720px 450px" }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, ease: "linear", duration: 180 }}
        >
          <path d={RAIOS} stroke="var(--color-accent)" strokeWidth={6} />
        </motion.g>

        {/*
          A vinheta fica **fora** do grupo que gira: ela é o preto que apaga o
          miolo da estrela por trás do texto, e girando junto o buraco escuro
          passearia pelo bloco de contato.
        */}
        <rect
          x="0"
          y="0"
          width="1440"
          height="900"
          fill="url(#vinheta-do-contato)"
        />
        <defs>
          {/*
            **A vinheta é uma elipse deitada, e a forma é o conserto de um
            defeito que o Gabriel viu antes de qualquer medição.**

            O molde pede um disco: `translate(719.5 376.286) scale(388.214)`,
            sólido até 58% e transparente em 100%. Fora de 388 unidades do centro
            não há escurecimento nenhum, e é por isso que os raios cruzam a tela
            **brilhantes**: o deslizamento deles é o efeito visível do bloco.

            A primeira versão daqui cobria o **quadro inteiro** com parada sólida
            em 55%, porque o disco deixava os raios passarem por trás do
            texto: medido, `2,08:1` no corpo e `2,21:1` no e-mail. O preço foi
            apagar o efeito: em fase 0,35 o bloco pede três raios cheios, e
            aqui aparecia um, quase invisível.

            A saída é a **proporção**, não a força: o bloco de conversão daqui é
            720 de largura por ~330 de altura, contra os 322 × 209 do molde. Uma
            elipse de 621 × 284 (sólida até 58% ⇒ 360 × 165 de preto chapado)
            cobre exatamente a caixa do texto e devolve os raios acima, abaixo e
            nas pontas, que é onde eles atravessam o quadro.
          */}
          <radialGradient
            id="vinheta-do-contato"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(719.5 450) scale(440 201)"
          >
            <stop offset="0.82" stopColor="#000000" />
            <stop offset="1" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * O contato, no molde do rodapé: uma tela inteira, a cena ao
 * fundo, o bloco de conversão no centro e as redes numa barra rente à base.
 *
 * O reveal aqui é **ligado ao scroll**, não de entrada (AD-007 trata de
 * entrada; isto é a outra categoria). Uma só janela (do momento em que o topo
 * da seção encosta na base da viewport até a seção estar inteira na tela)
 * alimenta três valores:
 *
 * | alvo      | de → para                                  |
 * |-----------|--------------------------------------------|
 * | wrapper   | `y: -50% → 0` (meia viewport, só em `md`)  |
 * | conteúdo  | `opacity: 0 → 1` até 80% da janela         |
 * | conteúdo  | `blur(20px) → blur(0)` na mesma janela     |
 *
 * O `y` é **percentual**, não pixel: o wrapper é `absolute inset-0` dentro de
 * uma seção `h-svh`, então a altura dele já é a da viewport e `translateY(%)`
 * resolve contra a própria altura. Dá exatamente o `-0.5 * window.innerHeight`
 * sem medir a janela em JS, e sem o `NaN` que a medição produz
 * enquanto ela não aconteceu.
 */
export function Contato() {
  const secao = useRef<HTMLElement>(null);
  const t = useTranslations();
  const ehDesktop = useMediaQuery("(min-width: 768px)");
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: secao,
    offset: ["start end", "end end"],
  });

  /**
   * Forma de **função** nos três, e isso não é estilo (AD-009).
   *
   * Com `useTransform(p, [0, .8], [0, 1])` o motion reconhece o padrão e entrega
   * a animação ao browser como scroll-driven nativa sobre `ViewTimeline`, cuja
   * faixa de progresso é *altura do elemento + viewport*, outra escala que a do
   * `useScroll`. O DOM passa a seguir a segunda e os valores saem errados. Já
   * quebrou o indicador do hero uma vez.
   *
   * O `Math.min` faz aqui o que o clamp da forma de faixas fazia: sem ele o
   * desfoque fica negativo depois de 80% e `blur(-4px)` é inválido: o browser
   * descarta o filtro inteiro.
   */
  const progressoDoReveal = (p: number) => Math.min(1, p / FIM_DO_REVEAL);
  const y = useTransform(scrollYProgress, (p) =>
    ehDesktop ? `${-50 * (1 - p)}%` : "0%",
  );
  const opacidade = useTransform(scrollYProgress, progressoDoReveal);
  const desfoque = useTransform(
    scrollYProgress,
    (p) => DESFOQUE_INICIAL * (1 - progressoDoReveal(p)),
  );
  const filtro = useMotionTemplate`blur(${desfoque}px)`;

  /**
   * O gate de movimento reduzido é aplicado **aqui**, e não pelo
   * `<MotionConfig reducedMotion="user">`, apesar do que diz o `useReducedMotion`:
   * o `MotionConfig` age na hora de animar, e valor de scroll escrito direto em
   * `style` nunca passa por lá. Sem este gate quem pede menos movimento
   * receberia o parallax e o desfoque mesmo assim.
   *
   * Ele também resolve o outro lado de graça: o hook responde `true` no
   * servidor, então o HTML sai **sem** `opacity: 0` e o e-mail continua na tela
   * de quem não executa JS. Este bloco é a única ação de conversão do site;
   * escondê-lo atrás de um scroll que talvez nunca seja medido não é opção.
   */
  const animaComScroll = !reducedMotion;

  return (
    /*
      `overflow-clip` não é polimento: no início da janela o wrapper está meia
      viewport acima e a cena sangra em cover. Sem o clip aparece barra de
      rolagem horizontal e a estrela vaza por cima da seção de cima.
    */
    <section
      ref={secao}
      aria-labelledby="contato"
      className="relative h-svh w-full overflow-clip border-t border-line bg-black"
    >
      <motion.div
        className="absolute inset-0 size-full"
        style={animaComScroll ? { y } : undefined}
      >
        {/*
          A cena fica dentro do wrapper do `y` e **fora** do de opacidade: ela
          entra nítida e em cor cheia assim que a seção aparece, e só o texto
          faz o fade. Aninhar por engano apaga a estrela junto e sobra uma tela
          preta durante todo o reveal.
        */}
        <CenaDeRaios />

        {/*
          `mx-30 md:mx-50` e não `w-calc`: o rodapé é o único
          bloco sem coluna centrada: a calha é margem simétrica, e o conteúdo
          que a preenche são as duas colunas laterais, que precisam encostar nas
          bordas dessa margem e não numa coluna de 1340 dentro dela.
        */}
        <motion.div
          className="relative mx-30 h-full flex-center md:mx-50"
          style={
            animaComScroll ? { opacity: opacidade, filter: filtro } : undefined
          }
        >
          {/*
            `max-w-720`, e o número tem duas amarras.

            Piso: `ch` não serve porque ele resolve contra o `font-size`
            **deste** elemento, que não declara nenhum e herda os 10px do root,
            e 62ch dava ~340px em vez dos ~500 que a conta supunha, partindo o
            e-mail de `type-m-40` no meio do endereço.

            Teto: as duas colunas da moldura ficam nas bordas da margem e na
            **mesma faixa vertical** do bloco. Com 880 a linha de descrição ia a
            1157 e encostava em "SoftCode · ProOps", que começa em 1155
            (medido). 720 deixa 75px de respiro de cada lado e ainda cabe o
            e-mail inteiro numa linha.
          */}
          <div className="flex max-w-720 flex-col items-center gap-32 text-center">
            <p className="flex items-center gap-12 type-eyebrow text-ink/55">
              <span aria-hidden className="size-8 shrink-0 bg-accent" />
              {t.contact.label}
            </p>

            {/*
              Título centrado e inteiro, não `TituloDistribuido`: o `textContent`
              deste `<h2>` é o nome acessível da região, e distribuir palavras
              ponta a ponta numa frase de 23 caracteres dentro de uma coluna de
              1300px abriria vãos de meia tela. Como nada é quebrado em palavras
              soltas, também não há cópia `sr-only` a fazer aqui: só o destaque
              em âmbar, que a 40px passa folgado no piso de 3:1 do texto grande.
            */}
            <h2 id="contato" className="type-m-40 md:type-m-64 text-ink">
              {t.contact.title}
              {/*
                `accent-soft` e não o âmbar cheio: a cena de raios passa por trás
                do título, e `--color-accent` é exatamente a cor dos raios. Âmbar
                sobre âmbar mede 1,7:1 e reprova até o piso de 3:1 que o WCAG dá
                a texto grande. Mesmo caso do destaque no hero.
              */}
              <span className="text-accent-soft">{t.contact.highlight}</span>
            </h2>

            <p className="type-m-16 md:type-m-20 text-ink/55">
              {t.contact.description}
            </p>

            <div className="flex flex-col items-center gap-16">
              <p className="type-eyebrow text-ink/55">
                {t.contact.button}
              </p>
              {/*
                O endereço é o próprio texto do link: ler "Escrever um e-mail" e
                ter de clicar para descobrir para onde vai é esconder a
                informação.

                UI-04: o branco de conversão (`--color-cta`) existe só
                aqui. Este link é a única ação de conversão da página, e o
                `data-cta` é o que a auditoria usa para provar o "somente".
                `#ffffff` sobre o preto chapado dá 21:1, então passa o piso do
                WCAG em qualquer tamanho.
              */}
              <a
                data-cta
                href={`mailto:${EMAIL}`}
                className="type-m-20 sm:type-m-28 md:type-m-40 break-words text-cta transition-colors duration-150 hover:text-ink focus-visible:text-ink motion-reduce:transition-none"
              >
                {EMAIL}
              </a>
            </div>
          </div>

          {/*
            A moldura do rodapé: duas colunas nas bordas, na mesma faixa
            vertical do bloco central, com o título grande entre elas. É a
            composição, e é o que impede o bloco de flutuar sozinho
            no meio de uma tela preta.

            No estreito elas descem para a base (`items-end`) e viram duas
            colunas de grade; a partir do `md` sobem para o centro. Medido:
            `absolute inset-0 justify-center items-end md:items-center` por fora,
            `flex-col gap-32 justify-end md:justify-center size-full` por dentro.

            `pointer-events-none` no invólucro e `auto` só nas colunas: em
            viewport baixa a moldura encosta no bloco central e, sem isso,
            engoliria o clique do e-mail, que é o clique que importa.
          */}
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center md:items-center">
            {/* `pb-32` só no estreito: ali a moldura desce para a base e, sem
                ele, encosta na borda da tela. No `md` ela sobe para o centro e
                o recuo perde sentido. */}
            <div className="flex size-full flex-col items-center justify-end gap-32 pb-32 md:justify-center md:pb-0">
              <div className="grid w-full grid-cols-2 justify-between md:flex">
                <div className="pointer-events-auto flex flex-col gap-16 md:items-center">
                  <p className="type-eyebrow text-ink/55">
                    {t.contact.networks}
                  </p>
                  <ul className="flex items-center gap-16">
                    {SOCIAL.map(({ href, label, Icon }) => (
                      <li key={href}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={label}
                          className="block text-ink hover:text-cta"
                        >
                          <Icon aria-hidden className="size-16" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/*
                  O slot que em navegador é o endereço postal. Aqui é de onde o
                  trabalho sai (as duas empresas), e não um endereço: publicar
                  logradouro é dado que ninguém pediu e que a spec não tem fonte
                  para sustentar. `translate="no"` porque são marca.
                */}
                <div className="pointer-events-auto flex flex-col gap-16 text-right md:items-center md:text-center">
                  <p className="type-eyebrow text-ink/55">
                    {t.contact.from}
                  </p>
                  <p translate="no" className="type-m-16 text-ink/55">
                    SoftCode · ProOps
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
