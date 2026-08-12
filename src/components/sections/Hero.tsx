"use client";

import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Campo } from "@/components/canvas/Campo";
import type { CampoHandle } from "@/components/canvas/CampoDeBlocos";
import { IndicadorDeScroll } from "@/components/motion/IndicadorDeScroll";
import { PalavrasQueEntram } from "@/components/motion/PalavrasQueEntram";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTranslations } from "@/hooks/useTranslations";
import { remapear } from "@/lib/motion";

/** Intervalo da rotação de frases, e também o tempo que o anel leva a fechar. */
const INTERVALO = 5000;

/**
 * Densidade da grelha no topo e no fim da janela de scroll.
 *
 * Contraintuitivo e correto: `blocos = max(resolução) * escala`, então escala
 * **maior** significa blocos **menores**. O campo vai ficando mais fino
 * conforme o hero sai, não mais grosso.
 */
const ESCALA_NO_TOPO = 0.41;
const ESCALA_NO_FIM = 1;

/**
 * Segundos que o campo leva a emergir do preto, ao entrar.
 *
 * O hero abre **preto**, a headline entra por cima dele, e só então o campo
 * aparece — ele não estala no lugar. Antes isto acontecia por acidente: a
 * headline também era invisível até hidratar, então as duas coisas chegavam
 * juntas. Com a headline a pintar já na primeira pintura, o campo passou a
 * surgir sozinho e de repente, e a abertura perdia o gesto.
 *
 * Quem anima é o `brilho` do campo, não a opacidade da camada: os blocos vão
 * cruzando o limiar, então em todo quadro o efeito de 1 bit continua exato e a
 * composição com o texto por cima nunca muda. Ver `revelacao` em
 * `CampoDeBlocos`.
 *
 * **2,4s saiu de medição, não de gosto.** A cobertura âmbar de uma faixa da
 * primeira tela foi amostrada quadro a quadro contra o alvo de desenho, e é o
 * valor que faz as duas rampas coincidirem: 25% da cobertura final aos 121ms
 * (alvo 26%), 62% aos 369ms (63%), 93% aos 755ms (91%), 99% aos 1022ms (98%).
 * Com 1,4s a rampa chegava a 90% em 430ms, cedo demais; com 2,6s arrancava
 * lenta. Quem mexer em `brilho`, `limiar` ou `contraste` muda o mapeamento de
 * uniform para cobertura e precisa reamostrar isto.
 */
const REVELACAO_DO_CAMPO = 2.4;

/**
 * O hero.
 *
 * Três animações ligadas ao scroll, todas na mesma janela
 * (`["start start", "end start"]`: do momento em que o topo da seção encosta no
 * topo da viewport até o momento em que o rodapé dela encosta lá, ou seja, uma
 * viewport inteira de rolagem):
 *
 * | alvo                  | de → para                          |
 * |-----------------------|------------------------------------|
 * | wrapper               | `y: 0 → metade da viewport` (só md)|
 * | conteúdo              | `opacity: 1 → 0`                   |
 * | indicador             | `opacity: 1 → 0` nos primeiros 20% |
 * | uniform `uEscala`     | `0.41 → 1`, travado                |
 *
 * No mobile o `y` fica em `0 → 0`: o parallax do wrapper contra a viewport
 * pequena empurrava o título para fora antes de ele terminar de entrar.
 *
 * **Serve a home e as rotas internas**: o hero de rota é o mesmo bloco do da
 * home (`h-svh`, mesma coluna `max-w-880` com `gap-32`, mesmo indicador, mesmo
 * campo), com um rótulo de rota acrescentado **acima** da headline. Medido:
 * eyebrow em y=331 e headline em y=377 no desktop, contra headline em y=354 na
 * home, que não tem eyebrow nenhum.
 */
interface Props {
  /**
   * O rótulo da rota, acima da headline. Só rota interna passa.
   *
   * Quando ele existe, o `cargoCurto` de baixo **sai**: o hero de rota tem
   * exatamente um rótulo, e dois eyebrows na mesma coluna disputariam o mesmo
   * papel.
   */
  rotulo?: string;
  /** Sobrepõe as frases da home: o conjunto troca por rota. */
  frases?: string[];
}

export function Hero({ rotulo, frases: frasesDaRota }: Props = {}) {
  const t = useTranslations();
  const secao = useRef<HTMLElement>(null);
  const areaDoCampo = useRef<HTMLDivElement>(null);
  const campo = useRef<CampoHandle>(null);

  const ehDesktop = useMediaQuery("(min-width: 768px)");
  const temPonteiro = useMediaQuery("(hover: hover)");
  const reducedMotion = useReducedMotion();

  const [alturaDaJanela, setAlturaDaJanela] = useState(0);
  useEffect(() => {
    const medir = () => setAlturaDaJanela(window.innerHeight);
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  const { scrollYProgress } = useScroll({
    target: secao,
    offset: ["start start", "end start"],
  });

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [0, ehDesktop ? alturaDaJanela * 0.5 : 0],
  );
  const opacidade = useTransform(scrollYProgress, [0, 1], [1, 0]);
  /**
   * Forma de **função**, não de faixas, e isso não é estilo.
   *
   * Com `useTransform(p, [0, 0.2], [1, 0])` o motion reconhece o padrão e
   * entrega a animação ao browser como scroll-driven nativa (WAAPI sobre um
   * `ViewTimeline`). Os keyframes saem corretos, mas o `ViewTimeline` mede
   * progresso numa escala diferente da do `useScroll`: a faixa nativa cobre
   * *altura do elemento + altura da viewport*. Num hero de 900px em viewport de
   * 900px isso é 1800px, então em `scrollY 675` o MotionValue lê `0.75` e a
   * timeline nativa lê `0.375`, e o DOM anima pela segunda.
   *
   * Medido: o indicador **subia** de 0 a 1 ao longo do hero em vez de sumir nos
   * primeiros 20%. O `style` inline dizia `opacity:1` enquanto o computado dizia
   * `0.687`, que é a assinatura de uma animação WAAPI por cima do valor base.
   *
   * Um transformador arbitrário não é compilável para keyframes, então o motion
   * é obrigado a rodá-lo na main thread, e aí DOM e MotionValue voltam a
   * concordar. Confirmado em navegador.
   */
  const opacidadeDoIndicador = useTransform(scrollYProgress, (progresso) =>
    Math.max(0, 1 - progresso / 0.2),
  );

  // AD-003: o scroll escreve direto no uniform, sem passar por estado de React.
  useMotionValueEvent(scrollYProgress, "change", (valor) => {
    campo.current?.definirEscala(
      remapear(valor, 0, 1, ESCALA_NO_TOPO, ESCALA_NO_FIM, true),
    );
  });

  const frases = frasesDaRota ?? t.hero.frases;
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    // Sob movimento reduzido a frase não gira. O `MotionConfig` tornaria a
    // troca instantânea, e texto trocando de supetão a cada 5s é pior para
    // quem pediu menos movimento do que texto parado.
    if (reducedMotion || frases.length < 2) return;
    const id = setInterval(
      () => setIndice((atual) => (atual + 1) % frases.length),
      INTERVALO,
    );
    return () => clearInterval(id);
  }, [reducedMotion, frases.length]);

  return (
    <section
      ref={secao}
      data-name="hero"
      aria-labelledby="hero"
      className="relative z-200 flex h-svh w-full overflow-clip"
    >
      {/*
        O campo, no seu próprio canvas dentro do hero (ver `CanvasDoCampo` para
        o porquê de não ser um recorte de canvas fixo).

        O rastro só existe onde há ponteiro: sem `hover: hover` não há mouse
        para deixar rastro, e ele custa um render extra por frame e um listener
        de `pointermove` (os dois render targets o `CampoDeBlocos` aloca de
        qualquer jeito). É o mesmo critério que a `Entregas` usa para o hover
        dos cards.
      */}
      <div ref={areaDoCampo} className="absolute inset-0">
        <Campo
          refDoCampo={campo}
          usarMouse={temPonteiro}
          alvoDoPonteiro={areaDoCampo}
          opcoes={{ escala: ESCALA_NO_TOPO, revelacao: REVELACAO_DO_CAMPO }}
        />
      </div>

      <motion.div className="absolute inset-0 size-full" style={{ y }}>
        <motion.div
          className="relative flex-center size-full"
          style={{ opacity: opacidade }}
        >
          <div className="relative mx-auto flex max-w-880 flex-col items-center gap-32 px-24">
            {rotulo ? (
              <div className="w-full flex-center">
                <p className="type-eyebrow flex items-center gap-12 text-ink">
                  <span aria-hidden className="size-8 shrink-0 bg-accent" />
                  {rotulo}
                </p>
              </div>
            ) : null}

            {/*
              **Sem `key` e sem `AnimatePresence`, e não é simplificação.**

              O `<AnimatePresence mode="wait">` com `key={indice}` matava o
              `<h1>` a cada frase e montava outro. O Chrome regista um candidato
              a LCP por elemento, na primeira pintura dele: elemento novo a cada
              5s era candidato novo a cada 5s, e como a entrada aplica
              `blur(30px)` — que infla a área medida ~10x — cada volta registava
              um candidato maior que o anterior. Medido com estrangulamento
              real, o LCP acabava em 9,0s.

              O `PalavrasQueEntram` faz a mesma sequência por dentro, sobre os
              mesmos elementos: título a `opacity: 0`, troca do texto, título de
              volta e palavras a entrar escalonadas. Ver o comentário lá.
            */}
            <div className="w-full flex-center">
              <PalavrasQueEntram
                id="hero"
                classeDeDestaque="text-accent-soft"
                className="type-m-54 md:type-m-96 text-center text-ink"
              >
                {frases[indice]}
              </PalavrasQueEntram>
            </div>

            {/*
              Cor cheia, não `ink/55`.

              O `/55` do corpo foi calibrado contra **preto chapado**, onde dá
              5,40:1. Sobre o pixel mais claro do campo ele desaba para 1,55:1.
              Em cor cheia são 5,06:1 e o piso de 4,5:1 do texto normal passa.

              É a regra para todo texto do hero: nada esmaecido por cima do
              campo.
            */}
            {rotulo ? null : (
              <p className="type-eyebrow text-ink">{t.hero.cargoCurto}</p>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Passagem para o preto do resto da página: sem ela a borda do
          retângulo do `<View>` aparece como aresta dura. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-250 w-full bg-linear-to-b from-transparent to-black"
      />

      <motion.div
        className="absolute right-0 bottom-100 left-0 flex-center md:bottom-28"
        style={{ opacity: opacidadeDoIndicador }}
      >
        <IndicadorDeScroll
          key={indice}
          duracao={INTERVALO / 1000}
          rotulo={t.hero.rolar}
        />
      </motion.div>
    </section>
  );
}
