"use client";

import { motion, useAnimationControls } from "motion/react";
import { Fragment, useEffect, useState } from "react";
import { EASE, TRANSICAO } from "@/lib/motion";
import { separarPalavras } from "@/lib/texto";

/**
 * Título que entra **palavra a palavra**, cada uma saindo de desfocada e maior.
 *
 * Os números são os: `scale 1.3 → 1`, `blur(30px) → blur(0px)`,
 * 2s de duração, curva `OUT_EXPO`, e **0.3s de atraso por palavra**. Esse
 * escalonamento é largo de propósito: a última palavra de uma frase de cinco
 * só assenta perto dos 3,2s. É o que faz o hero ler como uma frase sendo dita,
 * não como um bloco aparecendo.
 *
 * O `<h1>` também faz `opacity 0 → 1` por fora: as palavras animam dentro de um
 * elemento que já está aparecendo, e é essa sobreposição que evita o "pisca"
 * da primeira palavra em telas lentas.
 *
 * Marcação de destaque: envolva a palavra em asteriscos no dicionário, como em
 * `"Engenharia de *Software*"`. Preferi isso a HTML no locale porque o texto
 * continua legível para quem traduz e não abre porta para markup arbitrário.
 *
 * ### Por que a troca de frase não remonta nada (e por que isso importa)
 *
 * Este componente já foi um `<AnimatePresence mode="wait">` com `key={indice}`:
 * a frase velha saía, o elemento morria, e a nova entrava num elemento novo.
 * Visualmente é o que se quer; para o LCP era fatal.
 *
 * O Chrome regista **um candidato a LCP por elemento**, e só na primeira
 * pintura dele. Elemento novo a cada 5s é candidato novo a cada 5s — e como a
 * entrada aplica `blur(30px)`, que infla a área medida ~10x, cada volta
 * registava um candidato **maior** que o anterior. Medido em produção: 228ms
 * (3,5k px²), 360ms (71k), 5912ms (128k), 20912ms (129k). O LCP nunca assentava
 * e a nota do PageSpeed vinha atrás: 9,0s de LCP com estrangulamento real.
 *
 * Comprovado num caso mínimo: **trocar o texto de um elemento existente não
 * gera candidato novo**; criar um elemento gera. Então a rotação passou a
 * reescrever as mesmas palavras em vez de trocar de elemento, e o LCP fica onde
 * a primeira pintura o pôs.
 *
 * A sequência visível é a mesma de antes, e é essa a razão de haver duas fases
 * em vez de um crossfade: o `mode="wait"` esvaziava o título antes de encher de
 * novo, então aqui o título vai a `opacity: 0` (0,5s), só então as palavras
 * voltam ao estado inicial e a frase nova entra com o mesmo escalonamento.
 */

// Espelham `.entrada-da-palavra` em globals.css — ver lá o porquê dos números.
const DURACAO = 0.9;
const ATRASO_POR_PALAVRA = 0.15;
/** O fade do título, tanto na saída como na entrada. */
const DURACAO_DO_TITULO = 0.5;

/**
 * Se a primeira entrada da página já aconteceu, **no cliente**.
 *
 * Escrito só dentro de `useEffect`, que o servidor nunca roda: no servidor a
 * variável fica `false` para todo request, e o primeiro render do cliente lê o
 * mesmo `false` que o HTML foi gerado com. Sem isto, estado de módulo no
 * servidor sobreviveria entre requests e o segundo visitante receberia o HTML
 * errado.
 */
let jaHidratou = false;

interface Props {
  children: string;
  id?: string;
  className?: string;
  /** Somado ao atraso de cada palavra. */
  atrasoBase?: number;
  /**
   * Classe da palavra marcada. O default é o âmbar cheio, certo sobre preto
   * chapado. Quem renderiza **sobre o campo WebGL** precisa passar
   * `text-accent-soft`: os blocos do campo são exatamente `--color-accent`, e âmbar
   * sobre âmbar mede 1,67:1. A decisão fica no call site porque só ele sabe o
   * que está atrás.
   */
  classeDeDestaque?: string;
}

export function PalavrasQueEntram({
  children,
  id,
  className,
  atrasoBase = 0,
  classeDeDestaque = "text-accent",
}: Props) {
  /**
   * **A primeira frase entra por CSS; as seguintes, pelo motion.**
   *
   * A entrada é idêntica nos dois caminhos — os keyframes em `globals.css` usam
   * os mesmos 2s, o mesmo `cubic-bezier(0.19,1,0.22,1)` e o mesmo atraso de
   * 0,3s por palavra que estão aqui embaixo. O que muda é **quando** ela pode
   * começar: o CSS não espera por script, o motion espera pela hidratação.
   *
   * E é isso que segurava a headline. Ela é o maior elemento da página e saía
   * do servidor com `opacity:0`; medido a 4x de CPU e 4G lenta, o `<h1>` só
   * ficava visível aos 3528ms contra 1066ms de `DOMContentLoaded`. Declarada em
   * CSS, passa a 1147ms — junto com a primeira pintura.
   *
   * Com `initial={false}` o motion não reanima o que o CSS já animou: ele
   * escreve o estado final inline, a animação CSS ganha da cascata enquanto
   * corre, e ao acabar cai para esse mesmo estado inline. Daí não haver salto.
   */
  const [entradaPorCss] = useState(() => !jaHidratou);
  useEffect(() => {
    jaHidratou = true;
  }, []);

  /**
   * A frase **na tela**, que não é a mesma coisa que a frase pedida: ela só
   * troca depois de o título ter saído, que é o que o `mode="wait"` fazia.
   */
  const [fraseNaTela, setFraseNaTela] = useState(children);
  const palavras = separarPalavras(fraseNaTela);

  const titulo = useAnimationControls();
  const palavrasControle = useAnimationControls();

  /**
   * **A entrada na montagem, quando não foi o CSS a fazê-la.**
   *
   * Só existe caminho por CSS na primeira pintura da página. Quem monta depois
   * — uma navegação de cliente para `/projetos` ou `/sobre` — nasce com o
   * título em `opacity: 0` e as palavras em `oculta`, à espera de ordem. Sem
   * esta, a ordem só chegava na primeira troca de frase, e a headline ficava
   * **invisível durante cinco segundos** sobre um campo que já tinha acendido.
   *
   * Roda uma vez: as três dependências são estáveis.
   */
  useEffect(() => {
    if (entradaPorCss) return;
    titulo.start({
      opacity: 1,
      transition: { ...TRANSICAO, duration: DURACAO_DO_TITULO },
    });
    palavrasControle.start("visivel");
  }, [entradaPorCss, titulo, palavrasControle]);

  useEffect(() => {
    if (children === fraseNaTela) return;
    let cancelado = false;

    (async () => {
      await titulo.start({
        opacity: 0,
        transition: { ...TRANSICAO, duration: DURACAO_DO_TITULO },
      });
      if (cancelado) return;

      // Com o título invisível, repor as palavras e trocar o texto não aparece.
      palavrasControle.set("oculta");
      setFraseNaTela(children);

      // O título volta enquanto as palavras entram, como na montagem.
      titulo.start({
        opacity: 1,
        transition: { ...TRANSICAO, duration: DURACAO_DO_TITULO },
      });
      palavrasControle.start("visivel");
    })();

    return () => {
      cancelado = true;
    };
  }, [children, fraseNaTela, titulo, palavrasControle]);

  /**
   * `custom` leva o índice, e é dele que sai o atraso de cada palavra — o mesmo
   * `0.3 * i` que a versão com `key` punha direto na `transition`.
   */
  const variantesDaPalavra = {
    oculta: { scale: 1.3, opacity: 0, filter: "blur(30px)" },
    visivel: (indice: number) => ({
      scale: 1,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        ...TRANSICAO,
        duration: DURACAO,
        ease: EASE.OUT_EXPO,
        delay: atrasoBase + ATRASO_POR_PALAVRA * indice,
      },
    }),
  };

  return (
    <motion.h1
      id={id}
      className={`${className ?? ""}${entradaPorCss ? " entrada-do-titulo" : ""}`}
      initial={entradaPorCss ? false : { opacity: 0 }}
      animate={titulo}
    >
      {palavras.map(({ texto, destacada }, indice) => {
        return (
          /**
           * **A chave é o índice, e é isso que preserva o elemento.** Com
           * `${indice}-${texto}` o React trocava o nó a cada frase, e nó novo é
           * candidato a LCP novo. Pelo índice, o mesmo `<span>` só muda de
           * texto e de classe.
           */
          <Fragment key={indice}>
            <motion.span
              className={`inline-block${destacada ? ` ${classeDeDestaque}` : ""}${entradaPorCss ? " entrada-da-palavra" : ""}`}
              style={
                entradaPorCss
                  ? {
                      animationDelay: `${atrasoBase + ATRASO_POR_PALAVRA * indice}s`,
                    }
                  : undefined
              }
              custom={indice}
              variants={variantesDaPalavra}
              /**
               * O controlo fica ligado **nos dois caminhos**. Quando a entrada
               * é por CSS ele ainda não recebeu ordem nenhuma, então o motion
               * não escreve nada e o elemento fica no estado natural que os
               * keyframes animam. É na primeira rotação que ele passa a mandar.
               */
              initial={entradaPorCss ? false : "oculta"}
              animate={palavrasControle}
            >
              {texto}
            </motion.span>
            {/* Espaço como irmão literal, não `gap`: com `gap` a quebra de
                linha some e o título vira uma palavra só em viewport estreita. */}
            {indice < palavras.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </motion.h1>
  );
}
