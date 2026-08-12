"use client";

import type Lenis from "lenis";
import { ReactLenis, useLenis } from "lenis/react";
import { MotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useStore } from "@/store";

declare global {
  interface Window {
    /**
     * Seam de teste: o e2e assere a config da instância real (PORT-05). Ler a
     * constante exportada provaria só que o objeto existe, não que o Lenis foi
     * construído com ele.
     */
    __lenis?: Lenis;
    /** Contador de renders do `ScrollBridge`, sensor de re-render por scroll. */
    __scrollBridgeRenders?: number;
  }
}

/**
 * PORT-05. `allowNestedScroll` não está no spec, mas o default do Lenis é
 * `false`, o que sequestraria qualquer `overflow` aninhado e quebraria o
 * PORT-08.
 */
export const LENIS_OPTIONS = {
  lerp: 0.2,
  smoothWheel: true,
  syncTouch: false,
  allowNestedScroll: true,
};

/**
 * AD-003: o scroll vai para o store e para em pé aí. Nenhum componente React
 * assina esse slice: quem lê é o `useFrame`, via `getState()`.
 */
export function writeScrollToStore(scroll: {
  progress: number;
  velocity: number;
}) {
  useStore.getState().setScroll({
    progress: scroll.progress,
    velocity: scroll.velocity,
  });
}

/**
 * AD-004 revisto. Antes, `prefers-reduced-motion` decidia **se** o
 * `<ReactLenis>` existia; agora decide só como ele se comporta.
 *
 * `lerp: 1` aplica o delta inteiro no mesmo frame e `smoothWheel: false`
 * devolve o wheel ao browser. O resultado observável é o scroll nativo: a
 * mesma garantia de antes, sem trocar o tipo do elemento (ver `SmoothScroll`).
 *
 * Mutar o objeto basta: o construtor do Lenis monta um `this.options` próprio
 * (não guarda o objeto que recebe) e relê `options.lerp` e
 * `options.smoothWheel` a cada evento, então a instância nunca precisa ser
 * recriada, nem quando o usuário troca a preferência no sistema com a página
 * aberta.
 */
export function applyMotionPreference(lenis: Lenis, reducedMotion: boolean) {
  lenis.options.lerp = reducedMotion ? 1 : LENIS_OPTIONS.lerp;
  lenis.options.smoothWheel = !reducedMotion;
}

function ScrollBridge() {
  const pathname = usePathname();
  const lenis = useLenis(writeScrollToStore);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (lenis) applyMotionPreference(lenis, reducedMotion);
  }, [lenis, reducedMotion]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_E2E || !lenis) return;
    window.__lenis = lenis;
    return () => {
      delete window.__lenis;
    };
  }, [lenis]);

  // Sensor do AD-003: `ScrollBridge` é onde o scroll entra no React. Se
  // alguém assinar o slice `scroll` em vez de escrevê-lo, esta contagem sobe
  // a cada frame. Um efeito sem deps roda depois de todo render.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_E2E) return;
    window.__scrollBridgeRenders = (window.__scrollBridgeRenders ?? 0) + 1;
  });

  /**
   * Âncora precisa passar pelo Lenis, ou ela não rola.
   *
   * Medido em `/projetos`: clicar num `<a href="#todos">` põe o hash na URL e o
   * `scrollY` **não sai do lugar**. O salto nativo escreve `scrollTop` direto,
   * o `animatedScroll` interno do Lenis continua no valor antigo, e no frame
   * seguinte ele reescreve o dele por cima: a página parece travar e voltar.
   * Vale para toda âncora do site: a barra da lista, o link de pular conteúdo
   * e o `/#contato` do header.
   *
   * Sem `offset`: o `scrollTo` do Lenis **já** honra o `scroll-margin-top` do
   * alvo. Medido: passando a margem como offset a página parava no dobro dela
   * (300px para uma margem de 150), e o alvo ficava um bloco abaixo do topo.
   *
   * O `href` fica no link de propósito: sem JS, o salto nativo funciona e não
   * há Lenis para desfazê-lo.
   */
  useEffect(() => {
    if (!lenis) return;
    const aoClicar = (evento: MouseEvent) => {
      if (evento.defaultPrevented || evento.metaKey || evento.ctrlKey) return;
      const alvoDoClique = evento.target;
      if (!(alvoDoClique instanceof Element)) return;
      const link = alvoDoClique.closest("a[href]");
      if (!link) return;

      const destino = new URL(
        link.getAttribute("href") ?? "",
        window.location.href,
      );
      // Âncora **desta** rota. Outra rota é navegação, e o `LinkDeRota` cuida.
      if (!destino.hash || destino.pathname !== window.location.pathname) return;

      const elemento = document.getElementById(destino.hash.slice(1));
      if (!elemento) return;

      evento.preventDefault();
      lenis.scrollTo(elemento);
      window.history.pushState(null, "", destino.hash);
    };

    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, [lenis]);

  // PORT-07: o Lenis é o dono do scroll virtual, então a restauração de
  // posição do Next não o alcança: o topo precisa ser pedido.
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [pathname, lenis]);

  return null;
}

/**
 * Raiz de movimento da aplicação: scroll virtual + política de reduced-motion.
 *
 * O `<ReactLenis>` monta **sempre**. Antes ele era trocado por um fragmento
 * quando `prefers-reduced-motion` estava ativo, e como o store nascia em
 * `reducedMotion: true`, o primeiro render do cliente pegava o fragmento e o
 * segundo pegava o `<ReactLenis>`. Tipo de elemento diferente na mesma posição
 * da árvore faz o React desmontar e remontar tudo abaixo (`Header`, `.shell`,
 * o `template` e a página inteira) na hidratação de **todo** visitante sem
 * reduced-motion. Qualquer animação de entrada montada aí embaixo tocava,
 * desmontava e tocava de novo.
 *
 * Agora a preferência é aplicada por dentro: o Lenis perde a suavização
 * (`applyMotionPreference`) e o `MotionConfig` desliga a animação declarativa.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ReactLenis root options={LENIS_OPTIONS}>
        <ScrollBridge />
        {children}
      </ReactLenis>
    </MotionConfig>
  );
}
