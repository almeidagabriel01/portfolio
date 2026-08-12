"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  startTransition,
  use,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useStore } from "@/store";

declare global {
  interface Window {
    /**
     * Seam de teste: PORT-09 e PORT-12 são asserções sobre o store, e o e2e
     * roda contra o build de produção, onde não há outra porta de entrada.
     */
    __routeState?: () => {
      pathname: { current: string | null; previous: string | null };
      transition: { active: boolean; startedAt: number };
    };
  }
}

/** O que o `LinkDeRota` chama no lugar de navegar direto. */
type Navegar = (ir: () => void) => void;

/** Fora do provider (ou sem suporte), navegar é só navegar. */
const Contexto = createContext<Navegar>((ir) => ir());

export function useNavegacaoComTransicao() {
  return useContext(Contexto);
}

/**
 * Teto de espera pela rota nova.
 *
 * Enquanto a promessa da fase de troca não resolve, o browser **suspende o
 * render**: é assim que ele consegue fotografar o "depois" sem ninguém ver o
 * meio do caminho. A contrapartida é que uma navegação que nunca comita deixa
 * a página congelada para sempre, sem erro no console. O commit medido leva
 * ~400ms; 3s é folga larga para a rede ruim e curto para não ser um
 * travamento.
 */
const TETO_DE_COMMIT = 3000;

interface Retorno {
  /** A rota de onde se voltou: é ela que diz quando a nova já entrou. */
  de: string;
  /** Resolve quando o browser já fotografou a rota antiga. */
  capturado: Promise<void>;
}

/**
 * A transição de página, sobre `document.startViewTransition`.
 *
 * **Mora no layout, não num `template.tsx`.** O template remonta a cada
 * navegação. Era o que o véu antigo queria, e é exatamente o que mata este: o
 * `pendente` abaixo é guardado no meio da transição, e remontar o provider o
 * destruiria com a transição em aberto, deixando o browser preso esperando um
 * `resolve` que nunca chega.
 *
 * O gesto (subir de baixo / desbotar crescendo) é todo CSS, em `globals.css`.
 * Aqui mora só a amarração dos dois relógios: o do browser, que quer a foto do
 * "antes" e a do "depois", e o do App Router, que comita a rota nova de forma
 * assíncrona.
 */
export function TransicaoDeRota({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const semMovimento = useReducedMotion();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_E2E) return;
    window.__routeState = () => {
      const { pathname: rota, transition } = useStore.getState();
      return { pathname: rota, transition };
    };
  }, []);

  // PORT-09. `setPathname` já protege `previous` de navegação para a mesma
  // rota: a regra mora no store, não aqui.
  useEffect(() => {
    useStore.getState().setPathname(pathname);
  }, [pathname]);

  /**
   * O sinal de "há transição em curso" é a **própria transição**, não um
   * cronômetro. O véu antigo estimava 420ms e errava sob carga; `vt.finished`
   * não erra, e ainda cobre a transição atropelada: navegar por cima de uma
   * transição em curso a descarta, e a promessa rejeita em vez de resolver.
   */
  const anunciar = useCallback((vt: ViewTransition) => {
    useStore
      .getState()
      .setTransition({ active: true, startedAt: performance.now() });
    const encerrar = () =>
      useStore.getState().setTransition({ active: false, startedAt: 0 });
    vt.finished.then(encerrar, encerrar);
    return vt;
  }, []);

  /**
   * O `resolve` da fase "troque o DOM", enquanto a rota nova não chega.
   *
   * Soltá-lo é dizer ao browser "pode fotografar o depois", e isso só pode
   * acontecer com a rota nova já montada, daí o efeito pendurado no
   * `pathname`, que por definição só roda depois do commit do App Router. É
   * essa amarração que casa a view transition com o commit assíncrono.
   */
  const pendente = useRef<(() => void) | null>(null);

  const soltar = useCallback(() => {
    pendente.current?.();
    pendente.current = null;
  }, []);

  useEffect(() => {
    soltar();
  }, [pathname, soltar]);

  const aguardarCommit = useCallback(
    (pronto: () => void) => {
      pendente.current = pronto;
      // O teto compara **identidade** antes de soltar. Sem isso, cada navegação
      // deixa um timer solto que dispara 3s depois e resolve o que estiver
      // pendente **naquele** momento: a navegação A, já comitada e limpa,
      // soltaria a promessa da navegação B ainda no ar, e o browser
      // fotografaria a rota nova antes de ela existir. Estado final certo,
      // gesto errado, sem erro nenhum.
      window.setTimeout(() => {
        if (pendente.current === pronto) soltar();
      }, TETO_DE_COMMIT);
    },
    [soltar],
  );

  const navegar = useCallback<Navegar>(
    (ir) => {
      // Sob `reduce` a troca é um corte: nem chegamos a abrir transição, então
      // o store nunca marca `active` e o PORT-12 mede o corte, não uma janela
      // de 0ms. Deixar o `calc()` inválido aqui degradaria para o crossfade
      // de 250ms do UA, que é exatamente o que `reduce` pede para não haver.
      if (semMovimento || !document.startViewTransition) return ir();
      anunciar(
        document.startViewTransition(
          () =>
            new Promise<void>((pronto) => {
              startTransition(() => {
                ir();
                aguardarCommit(pronto);
              });
            }),
        ),
      );
    },
    [semMovimento, anunciar, aguardarCommit],
  );

  /**
   * Voltar/avançar no browser não passa pelo nosso link: o `popstate` já
   * aconteceu e o App Router comita por conta própria. Se o React pintar a
   * rota nova antes de o browser fotografar a antiga, o "old" da transição **é
   * a página nova** e o gesto some sem erro nenhum.
   *
   * Por isso o render suspende em `capturado`, que só resolve dentro do
   * callback da view transition, ou seja, depois da foto. É o único ponto do
   * arquivo em que a ordem não é nossa e precisa ser imposta.
   *
   * O estado **não** é limpo depois: `use()` sobre promessa já resolvida
   * devolve na hora, e o próximo `popstate` substitui o objeto inteiro. Limpar
   * custaria um `setState` dentro de efeito, que é o que se está evitando.
   */
  const [voltando, setVoltando] = useState<Retorno | null>(null);

  /**
   * Rota e preferência entram por ref, e o listener de `popstate` é registrado
   * **uma vez só**. Isso não é economia de re-subscrição: é a diferença entre
   * o handler rodar e não rodar.
   *
   * O handler do App Router é registrado antes do nosso e, quando a rota já
   * está em cache, comita ali mesmo, o que faz os efeitos deste componente
   * rodarem **no meio do dispatch do `popstate`**. Um listener que dependesse
   * de `pathname` seria removido nesse instante, e listener removido durante o
   * dispatch não é chamado. O sintoma foi mudo: o listener aparecia registrado
   * antes do evento e depois dele, `startViewTransition` nunca era chamado, e
   * nada no console.
   */
  const atual = useRef({ pathname, semMovimento });
  useEffect(() => {
    atual.current = { pathname, semMovimento };
  }, [pathname, semMovimento]);

  useEffect(() => {
    if (!document.startViewTransition) return;
    const aoVoltar = () => {
      if (atual.current.semMovimento) return;
      const capturado = new Promise<void>((foto) => {
        const vt = anunciar(
          document.startViewTransition(() => {
            foto();
            return new Promise<void>(aguardarCommit);
          }),
        );
        // Transição descartada **antes** do callback rodar (aba escondida, ou
        // outra navegação por cima desta): `foto` nunca seria chamada, e o
        // render suspenso em `capturado` não voltaria nunca. É o único ponto do
        // arquivo sem piso, e travar é pior que trocar de rota sem gesto.
        vt.ready.catch(() => foto());
      });
      setVoltando({ de: atual.current.pathname, capturado });
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, [anunciar, aguardarCommit]);

  if (voltando && voltando.de !== pathname) use(voltando.capturado);

  return <Contexto value={navegar}>{children}</Contexto>;
}
