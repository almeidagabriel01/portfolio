"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { EASE } from "@/lib/motion";
import { semMarcacao, separarPalavras } from "@/lib/texto";

/**
 * O título que **se espalha** ao entrar na viewport.
 *
 * As palavras chegam agrupadas no centro e abrem até as bordas da coluna. É o
 * gesto de abertura de seção, e o mais fácil de implementar
 * errado: a tentação é animar `x` de cada palavra, o que exige saber a largura
 * final de cada uma.
 *
 * Não é o caminho aqui. O contêiner troca
 * `justify-center` por `justify-between` (uma mudança de **layout**) e cada
 * palavra é um `motion.span layout`, então o **FLIP** do motion mede o antes e
 * o depois e interpola sozinho. Muda o texto, a fonte ou a largura da coluna, e
 * continua correto sem ninguém recalcular nada.
 *
 * Duas consequências que valem saber:
 *
 * - **os espaços não são reinseridos.** Quem cria os vãos é a distribuição do
 *   flex. Um `&nbsp;` entre as palavras brigaria com o `justify-between` e o
 *   título nunca encostaria nas bordas.
 * - **`once: true`** (AD-007). Todo `useInView` é assim; nada
 *   re-anima ao subir a página.
 */

const TRANSICAO = { duration: 0.6, ease: EASE.IN_OUT_CUBIC } as const;
/** Atrasos: o rótulo abre primeiro, o título logo atrás. */
const ATRASO_DO_ROTULO = 0.1;
const ATRASO_DO_TITULO = 0.2;

interface Props {
  /** Rótulo em mono, acima do título. Distribuído junto. */
  rotulo?: string;
  /** O título. Palavra entre asteriscos sai no âmbar de acento. */
  children: string;
  id?: string;
  nivel?: 2 | 3;
  /**
   * Escala do título. O default é o para título de seção.
   *
   * O corpo grande **é** parte do efeito, não decoração: é ele que faz a frase
   * não caber numa linha e quebrar em duas, cada uma distribuída ponta a ponta.
   * Numa escala menor tudo cabe numa linha só e o título vira uma fileira de
   * palavras com vãos enormes, que foi como isto saiu na primeira tentativa.
   */
  className?: string;
  /**
   * Classe da palavra marcada. O default é o âmbar cheio, certo sobre preto
   * chapado. Seção com cena âmbar por trás (o contato, com os raios) precisa
   * passar `text-accent-soft`: âmbar sobre âmbar mede 1,7:1 e reprova o piso de
   * 3:1 até para texto grande. A decisão fica no call site porque só ele sabe
   * o que está atrás.
   */
  classeDeDestaque?: string;
}

export function TituloDistribuido({
  rotulo,
  children,
  id,
  nivel = 2,
  className = "type-m-40 md:type-m-64 lg:type-m-96",
  classeDeDestaque = "text-accent",
}: Props) {
  /**
   * **`use no memo` é load-bearing.** Sem ela o título distribui sem animar:
   * as palavras saltam do centro para as bordas.
   *
   * O FLIP do motion mede a posição no `useLayoutEffect` de **cada**
   * `motion.span`, e esse efeito só roda se aquele span re-renderizar. O React
   * Compiler memoiza a lista de palavras do título (nada no `.map` depende de
   * `dentro`: quem muda é a `className` do contêiner), então os spans faziam
   * bailout, o motion nunca media, e a troca de `justify-content` era aplicada
   * de uma vez pelo browser.
   *
   * O rótulo escapava por acidente: ele mora dentro de `{rotulo ? … : null}` e a
   * memoização do compilador não atravessa o condicional. Era por isso que o
   * rótulo animava e o título não: mesmo componente, mesmo `layout`, mesma
   * transição.
   *
   * O modo de falha é **invisível para geometria**: o estado final fica
   * perfeito, e as sondas de caixa passavam. Quem pega é a
   * sonda de entrada, que mede se houve `transform` **durante** a transição.
   */
  "use no memo";

  const referencia = useRef<HTMLDivElement>(null);
  const dentro = useInView(referencia, { once: true, amount: 0.4 });
  // União de tags intrínsecas, não `ElementType`: com `ElementType` genérico o
  // TS resolve `children` para `never` e nem `id` nem `className` passam.
  const Titulo = nivel === 2 ? "h2" : "h3";

  const distribuicao = dentro ? "justify-between" : "justify-center";

  return (
    // `gap-16 md:gap-32` medido em navegador: o vão entre o rótulo e o título
    // dobra no desktop, e era 24 fixo aqui.
    <div ref={referencia} className="flex w-full flex-col gap-16 md:gap-32">
      {rotulo ? (
        <p className="w-full">
          <span className="sr-only">{semMarcacao(rotulo)}</span>
          <span
            aria-hidden
            className={`flex w-full items-center ${distribuicao}`}
          >
            {separarPalavras(rotulo).map(({ texto }, indice) => (
              <motion.span
                key={`${indice}-${texto}`}
                layout
                transition={{ ...TRANSICAO, delay: ATRASO_DO_ROTULO }}
                // Cheio, não `/55`: medido em `rgb(216,234,255)` em navegador.
                // O rótulo é curto e em caixa alta: a 55% ele some.
                className="type-eyebrow text-ink"
              >
                {texto}
              </motion.span>
            ))}
          </span>
        </p>
      ) : null}

      <Titulo id={id} className={`w-full text-ink ${className}`}>
        {/*
          A frase inteira, para leitor de tela e para `textContent`.

          As palavras visíveis vão **sem espaço entre elas**: quem cria os vãos
          é o `justify-between`, e um espaço de verdade brigaria com ele. Só que
          `textContent` é o que produz o nome acessível de quem aponta para este
          título por `aria-labelledby`, e sem esta cópia a seção passa a se
          chamar "Sócioemduasempresas.".

          `sr-only` recorta o elemento
          da tela sem tirá-lo da árvore de acessibilidade nem do `textContent`,
          e a camada visual fica `aria-hidden` para ninguém ler duas vezes.
        */}
        <span className="sr-only">{semMarcacao(children)}</span>
        <span
          aria-hidden
          className={`flex w-full flex-wrap items-center ${distribuicao}`}
        >
          {separarPalavras(children).map(({ texto, destacada }, indice) => (
            <motion.span
              key={`${indice}-${texto}`}
              layout
              transition={{ ...TRANSICAO, delay: ATRASO_DO_TITULO }}
              className={destacada ? classeDeDestaque : undefined}
            >
              {texto}
            </motion.span>
          ))}
        </span>
      </Titulo>
    </div>
  );
}
