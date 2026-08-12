"use client";

import { AnimatePresence, motion } from "motion/react";
import { LinkDeRota as Link } from "@/components/ui/LinkDeRota";
import { useState, type ReactNode } from "react";
import { TrocaDeTexto } from "@/components/motion/TrocaDeTexto";
import { EASE } from "@/lib/motion";

/**
 * O botão.
 *
 * Três detalhes carregam o peso:
 *
 * 1. **O fundo é uma camada própria**, absoluta, e é ela que recebe o
 *    `scale-95` no `:active`. Encolher o `<a>` inteiro levaria junto o texto e
 *    o ícone, e o toque leria como um zoom-out; encolhendo só a pastilha, o
 *    conteúdo fica firme e o botão "afunda".
 * 2. **Rótulo e ícone reagem juntos** ao `pointerenter`, por um contador só. Não
 *    é hover em CSS: a animação **refaz** do início a cada entrada do ponteiro,
 *    coisa que `:hover` não sabe fazer.
 * 3. **`overflow-clip`** no botão é o que transforma o deslize do ícone em
 *    entrada por dentro da borda em vez de um elemento passeando por fora.
 */

type Tema = "cta" | "light" | "border";

const FUNDO: Record<Tema, string> = {
  cta: "bg-cta",
  light: "bg-ink/8 backdrop-blur-sm",
  border: "border border-ink/20",
};

const TRANSICAO_DO_ICONE = { duration: 0.3, ease: EASE.IN_OUT_CUBIC } as const;

interface Props {
  children: string;
  href?: string;
  /** Abre em nova aba e vira `<a>` cru: o `next/link` não serve a destino externo. */
  externo?: boolean;
  tema?: Tema;
  /** Renderizado à direita do rótulo e deslizado a cada hover. */
  icone?: ReactNode;
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
}

export function Botao({
  children,
  href,
  externo = false,
  tema = "light",
  icone,
  className,
  onClick,
  "aria-label": rotuloAcessivel,
}: Props) {
  const [gatilho, setGatilho] = useState(0);

  const classes = [
    "group relative flex h-43 items-center gap-8 overflow-clip rounded-[0.4rem]",
    "px-16 transition-colors md:h-35",
    tema === "cta" ? "text-black" : "text-ink",
    className ?? "",
  ].join(" ");

  const conteudo = (
    <>
      <span
        aria-hidden
        className={`absolute inset-0 rounded-[0.4rem] transition-transform duration-200 group-active:scale-95 ${FUNDO[tema]}`}
      />
      <TrocaDeTexto
        gatilho={gatilho}
        className="relative w-full text-center whitespace-nowrap type-button"
      >
        {children}
      </TrocaDeTexto>
      {icone ? <IconeQueDesliza gatilho={gatilho}>{icone}</IconeQueDesliza> : null}
    </>
  );

  const comuns = {
    className: classes,
    onPointerEnter: () => setGatilho((atual) => atual + 1),
    "aria-label": rotuloAcessivel,
  };

  if (href && externo) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...comuns}>
        {conteudo}
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} {...comuns}>
        {conteudo}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} {...comuns}>
      {conteudo}
    </button>
  );
}

/**
 * O ícone sai por um lado e o novo entra pelo outro, dentro de uma janela que
 * corta os dois. `108%` e não `100%`: os 8 pontos extras garantem que o glifo
 * saia inteiro antes de reaparecer, mesmo com a folga do antisserrilhado.
 */
function IconeQueDesliza({
  children,
  gatilho,
}: {
  children: ReactNode;
  gatilho: number;
}) {
  return (
    <span
      aria-hidden
      className="relative grid shrink-0 place-items-center overflow-hidden"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={gatilho}
          className="area block"
          initial={{ x: "-108%" }}
          animate={{
            x: "0%",
            transition: { ...TRANSICAO_DO_ICONE, delay: 0.1 },
          }}
          exit={{ x: "108%", transition: TRANSICAO_DO_ICONE }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Seta diagonal para destino externo, 10×10. */
export function SetaExterna() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden className="block">
      <path d="M1 9L9 1M9 1H3M9 1v6" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/** Seta para a direita, 10×9, no traço. */
export function SetaDireita() {
  return (
    <svg
      width="10"
      height="9"
      viewBox="0 0 10 9"
      fill="none"
      aria-hidden
      className="block"
    >
      <path
        d="M0 4.5h8.5M5.5 1l3.5 3.5L5.5 8"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
