"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { LinkDeRota as Link } from "@/components/ui/LinkDeRota";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TrocaDeTexto } from "@/components/motion/TrocaDeTexto";
import { Botao, SetaDireita } from "@/components/ui/Botao";
import { useTranslations } from "@/hooks/useTranslations";
import { EASE, TRANSICAO } from "@/lib/motion";
import { LanguageToggle } from "./LanguageToggle";
import { MARCA, Marca } from "./Marca";

declare global {
  interface Window {
    /**
     * Seam de teste (AD-004): quantas vezes o `Header` **montou**, não
     * renderizou. É o sensor do remount de hidratação: o `Header` é o
     * primeiro filho dentro do `SmoothScroll`, então trocar o tipo do
     * elemento ali em cima aparece aqui como uma segunda montagem.
     */
    __headerMounts?: number;
  }
}

/**
 * As rotas do shell. `/projetos/[slug]` não entra aqui de propósito: o case é
 * alcançado a partir da lista, não da navegação global.
 */
const ROUTES = [
  { href: "/", key: "home" },
  { href: "/projetos", key: "projects" },
  { href: "/sobre", key: "about" },
] as const;

/** Onde o scrim termina de aparecer, em pixels de scroll. */
const JANELA_DO_SCRIM = 100;
/** Escalonamento dos itens do menu mobile. */
const PASSO_DO_MENU = 0.07;

export function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  // Deps vazias: roda uma vez por montagem. Uma remontagem incrementa.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_E2E) return;
    window.__headerMounts = (window.__headerMounts ?? 0) + 1;
  }, []);

  /**
   * Trocar de rota com o menu aberto tem que fechá-lo, senão o painel cobre a
   * página nova.
   *
   * Ajuste durante o render, não `useEffect`. O efeito funcionaria, mas fecharia
   * o menu **depois** do commit da rota nova: um frame com a página trocada e o
   * painel ainda por cima. Este é o padrão que o React recomenda para estado
   * derivado de prop, e cobre também voltar/avançar no browser, coisa que
   * fechar no `onClick` do link não cobriria.
   */
  const [rotaDoMenu, setRotaDoMenu] = useState(pathname);
  if (rotaDoMenu !== pathname) {
    setRotaDoMenu(pathname);
    setMenuAberto(false);
  }

  const ativa = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* `data-transicao` dá ao header um `view-transition-name` próprio: ele
          sai do snapshot do root e fica parado enquanto a página desliza por
          baixo, como em navegador. Sem isso ele subiria junto. */}
      <header
        data-transicao="header"
        className="fixed top-0 right-0 left-0 z-930 flex h-65 items-center border-b border-b-line bg-black md:top-32 md:right-50 md:left-50 md:h-auto md:border-0 md:bg-transparent"
      >
        {/* Primeiro elemento focável do documento: sem ele, o teclado atravessa
            o header inteiro em toda rota antes de chegar ao conteúdo. */}
        <a
          href="#conteudo"
          className="sr-only rounded-sm bg-surface px-16 py-8 type-m-16 text-ink focus:not-sr-only focus:absolute focus:top-16 focus:left-24 focus:z-10"
        >
          {t.header.skip}
        </a>

        <Scrim />

        <div className="relative flex w-full items-center justify-between px-30 md:px-0">
          <div className="flex items-center gap-32">
            {/* O nome acessível é a **marca**, não "Início": o link do nav já
                se chama assim e aponta para o mesmo lugar. Dois links com o
                mesmo nome no mesmo documento é ambiguidade para leitor de tela,
                e foi o que quebrou a navegação por papel no e2e. */}
            <Link href="/" aria-label={MARCA} className="block">
              <Marca />
            </Link>

            <nav
              aria-label={t.header.nav}
              className="hidden items-center gap-32 lg:flex"
            >
              {ROUTES.map(({ href, key }) => (
                <LinkDoNav
                  key={href}
                  href={href}
                  ativo={ativa(href)}
                  rotulo={t.header[key]}
                />
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-16">
            <LanguageToggle />

            <div className="hidden lg:flex">
              <Botao href="/#contato" tema="cta" icone={<SetaDireita />}>
                {t.header.contact}
              </Botao>
            </div>

            <button
              type="button"
              onClick={() => setMenuAberto((aberto) => !aberto)}
              aria-expanded={menuAberto}
              aria-controls="menu-mobile"
              className={`flex items-center gap-12 lg:hidden ${
                menuAberto ? "flex-row-reverse" : ""
              }`}
            >
              <motion.span
                layout
                aria-hidden
                className={`block size-8 ${menuAberto ? "bg-cta" : "bg-accent"}`}
              />
              <motion.span layout className="type-button">
                {menuAberto ? t.header.close : t.header.menu}
              </motion.span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuAberto ? (
          <MenuMobile
            rotas={ROUTES.map(({ href, key }) => ({
              href,
              rotulo: t.header[key],
              ativo: ativa(href),
            }))}
            rotuloDoContato={t.header.contact}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

/**
 * O véu que aparece atrás do header conforme a página rola.
 *
 * Duas camadas, e as duas importam: um gradiente que escurece o topo e um
 * `backdrop-blur` **mascarado**. A máscara é o que evita a aresta horizontal:
 * um blur de borda dura corta a imagem ao meio de forma visível; desvanecido
 * para transparente, ele só some.
 *
 * AD-009: forma de função, não de faixas. Com `[0, 100] → [0, 1]` o motion
 * entregaria isto a uma scroll-timeline nativa, cuja faixa de progresso não é a
 * do `useScroll`.
 */
function Scrim() {
  const { scrollY } = useScroll();
  const opacidade = useTransform(scrollY, (valor) =>
    Math.min(1, Math.max(0, valor / JANELA_DO_SCRIM)),
  );

  return (
    <motion.div
      aria-hidden
      style={{ opacity: opacidade }}
      className="pointer-events-none fixed top-0 right-0 left-0 -z-1 hidden h-100 md:flex lg:h-150"
    >
      <div className="absolute size-full bg-linear-to-b from-black to-transparent to-60%" />
      <div
        className="absolute size-full backdrop-blur-[1rem]"
        style={{
          maskImage: "linear-gradient(to bottom, black, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 100%)",
        }}
      />
    </motion.div>
  );
}

function LinkDoNav({
  href,
  rotulo,
  ativo,
}: {
  href: string;
  rotulo: string;
  ativo: boolean;
}) {
  const [gatilho, setGatilho] = useState(0);

  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      onPointerEnter={() => setGatilho((atual) => atual + 1)}
      /**
       * Ativo em `accent`, não em `cta`. Desde que o CTA virou branco puro ele
       * ficou a 1,19× do `ink` do link inativo: o indicador de rota atual
       * sumia da tela, e `aria-current` continuava certo enquanto a cor
       * mentia. A divisão que sobrou é semântica e não só estética: o âmbar
       * marca **onde você está**, o branco marca **o que fazer**.
       */
      className={`type-button transition-colors duration-200 ${
        ativo ? "text-accent" : "text-ink hover:text-accent"
      }`}
    >
      <TrocaDeTexto gatilho={gatilho}>{rotulo}</TrocaDeTexto>
    </Link>
  );
}

function MenuMobile({
  rotas,
  rotuloDoContato,
}: {
  rotas: { href: string; rotulo: string; ativo: boolean }[];
  rotuloDoContato: string;
}) {
  // `dvh` e não `vh`: em iOS a barra de endereço come a diferença e o rodapé do
  // painel fica embaixo dela.
  return (
    <motion.div
      id="menu-mobile"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ ...TRANSICAO, duration: 0.4 }}
      data-transicao="menu"
      className="fixed top-65 right-0 bottom-0 left-0 z-1200 flex h-[calc(100dvh-6.5rem)] overflow-clip bg-black lg:hidden"
    >
      <div className="flex size-full flex-col justify-between p-32">
        <ul className="flex flex-col gap-15">
          {rotas.map(({ href, rotulo, ativo }, indice) => (
            <motion.li
              key={href}
              initial={{ opacity: 0, scale: 1.2, filter: "blur(10px)" }}
              animate={{
                opacity: 1,
                scale: 1,
                filter: "blur(0px)",
                transition: {
                  ...TRANSICAO,
                  duration: 0.4,
                  delay: PASSO_DO_MENU * indice,
                },
              }}
              exit={{
                opacity: 0,
                transition: { ...TRANSICAO, duration: 0.4 },
              }}
            >
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={`type-m-40 block leading-none ${
                  ativo ? "text-ink" : "text-ink/40"
                }`}
              >
                {rotulo}
              </Link>
            </motion.li>
          ))}
        </ul>

        <motion.div
          initial={{ y: 75, opacity: 0 }}
          animate={{
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.6,
              ease: EASE.OUT_SNAPPY,
              delay: PASSO_DO_MENU * rotas.length,
            },
          }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <Botao
            href="/#contato"
            tema="cta"
            icone={<SetaDireita />}
            className="w-full justify-between"
          >
            {rotuloDoContato}
          </Botao>
        </motion.div>
      </div>
    </motion.div>
  );
}
