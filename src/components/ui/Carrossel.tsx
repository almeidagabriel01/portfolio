"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Carrossel horizontal com scroll-snap nativo.
 *
 * Não entra biblioteca para isto. As que existem reimplementam
 * arrasto, inércia e snap em JS, e nada disso é necessário: `overflow-x: auto` +
 * `scroll-snap-type` já dá arrasto por toque, inércia do sistema e encaixe:
 * de graça, com a física certa de cada plataforma, e acessível por teclado.
 *
 * O que **não** vem de graça é saber qual slide está ativo. Resolvido por
 * aritmética de `scrollLeft`, e não por `IntersectionObserver`:
 *
 *     ativo = round(scrollLeft / distância)      distância = largura do 1º slide + gap
 *
 * É mais barato e mais estável que um observer: não tem histerese na borda
 * entre dois slides, que é onde um observer com `threshold` fica piscando.
 *
 * A distância é **medida**, não configurada: ler o primeiro filho cobre
 * mudança de breakpoint, de fonte e de conteúdo sem ninguém sincronizar
 * constante nenhuma.
 */

/**
 * Acima disto o gesto é **arremesso**; abaixo, arrasto. Em px/ms: um puxão
 * deliberado passa longe deste número e um reposicionamento lento não chega
 * perto dele.
 */
const LIMIAR_DE_ARREMESSO = 0.35;

/**
 * Onde o trilho pousa quando o dedo solta.
 *
 * **Um gesto, um card.** Arremessou para frente, vai para o próximo encaixe,
 * ainda que tenha andado só um quinto do caminho; arremessou para trás, volta
 * um. Sem velocidade, pousa no encaixe mais próximo, que é o arrasto de
 * reposicionar.
 *
 * A primeira versão projetava a posição somando 180ms da velocidade corrente
 * antes de arredondar. Ela funciona, e **é intermitente**: velocidade de gesto
 * sintético depende da carga da máquina, e o mesmo arremesso pousava num card
 * ou dois conforme o relógio. Medido, o teste de ponteiro deu 0 sob os quatro
 * workers da suíte e 2 isolado. Com direção em vez de distância projetada, o
 * pouso só depende do **sinal** da velocidade, que não muda com a carga.
 *
 * Função à parte porque é a única parte disto que dá para provar sem relógio.
 */
export function alvoDoArremesso(
  esquerda: number,
  velocidade: number,
  passo: number,
  total: number,
): number {
  if (passo <= 0) return 0;
  const bruto = esquerda / passo;
  // `floor + 1` e `ceil − 1`, não `ceil`/`floor` puros: soltos exatamente sobre
  // um encaixe, os puros devolveriam o próprio card e o arremesso não faria
  // nada, que é o caso comum de folhear a partir do repouso.
  const alvo =
    velocidade > LIMIAR_DE_ARREMESSO
      ? Math.floor(bruto) + 1
      : velocidade < -LIMIAR_DE_ARREMESSO
        ? Math.ceil(bruto) - 1
        : Math.round(bruto);
  return Math.min(Math.max(alvo, 0), total - 1);
}

interface Props<T> {
  itens: readonly T[];
  /** `ativo` permite ao slide se destacar: escala e opacidade. */
  renderizar: (item: T, indice: number, ativo: boolean) => ReactNode;
  chave: (item: T, indice: number) => string;
  /** Rótulo acessível da região do carrossel. */
  rotulo: string;
  /** Rótulo do grupo de navegação por pontos. */
  rotuloDosPontos: string;
  className?: string;
  classeDoTrilho?: string;
  /**
   * Classe do `<li>`. O default é o slide de largura de viewport; o bloco de
   * projetos usa cartão de largura fixa com `snap-center`.
   */
  classeDoItem?: string;
  /**
   * Classe do grupo de pontos. O default afasta com margem; o bloco de quotes
   * tira o vão daqui e põe no `gap` do wrapper, para o trilho e
   * os pontos ficarem no mesmo ritmo do resto da seção.
   */
  classeDosPontos?: string;
}

export function Carrossel<T>({
  itens,
  renderizar,
  chave,
  rotulo,
  rotuloDosPontos,
  className,
  classeDoTrilho,
  classeDoItem = "w-full shrink-0 snap-start",
  classeDosPontos = "mt-50",
}: Props<T>) {
  const trilho = useRef<HTMLUListElement>(null);
  const [ativo, setAtivo] = useState(0);
  const semMovimento = useReducedMotion();

  const distancia = useCallback(() => {
    const primeiro = trilho.current?.firstElementChild;
    if (!primeiro || !trilho.current) return 0;
    const gap = Number.parseFloat(getComputedStyle(trilho.current).columnGap);
    return primeiro.getBoundingClientRect().width + (gap || 0);
  }, []);

  /**
   * A velocidade do trilho, publicada como **variável CSS no próprio trilho**.
   *
   * Não vira estado do React: o valor muda a cada quadro enquanto o trilho anda,
   * e assinar isso re-renderizaria a lista inteira 60 vezes por segundo (AD-003).
   * Como custom property, ela desce por herança até o conteúdo de cada card, que
   * reage só em CSS: nenhum componente re-renderiza.
   *
   * `--arrasto` é **assinada** (−1 a 1, para saber o lado) e `--forca` é o módulo.
   *
   * A volta ao repouso é por `setTimeout`, não por laço de animação: sem evento
   * de `scroll` a última leitura ficaria congelada na tela. 90ms depois do último
   * evento as duas zeram e a transição CSS de quem as consome faz o assentamento.
   */
  const velocidade = useRef({ x: 0, t: 0, v: 0 });
  const zerar = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publicarVelocidade = useCallback(
    (elemento: HTMLElement, esquerda: number) => {
      const agora = performance.now();
      const anterior = velocidade.current;
      const dt = agora - anterior.t;
      // px por ms. `dt > 0` descarta o primeiro evento, que não tem intervalo.
      const v = dt > 0 && dt < 200 ? (esquerda - anterior.x) / dt : 0;
      velocidade.current = { x: esquerda, t: agora, v };

      if (semMovimento) return;
      // 2 px/ms é o teto: um arremesso confortável no trackpad chega perto disso,
      // e acima daí o efeito satura em vez de exagerar.
      const arrasto = Math.max(-1, Math.min(1, v / 2));
      elemento.style.setProperty("--arrasto", arrasto.toFixed(3));
      elemento.style.setProperty("--forca", Math.abs(arrasto).toFixed(3));

      if (zerar.current) clearTimeout(zerar.current);
      zerar.current = setTimeout(() => {
        elemento.style.setProperty("--arrasto", "0");
        elemento.style.setProperty("--forca", "0");
      }, 90);
    },
    [semMovimento],
  );

  useEffect(() => {
    const elemento = trilho.current;
    if (!elemento) return;

    // `scrollend` seria o evento certo, mas o suporte ainda é irregular; ler a
    // cada `scroll` é barato porque a conta é uma divisão.
    const aoRolar = () => {
      publicarVelocidade(elemento, elemento.scrollLeft);
      const passo = distancia();
      if (passo <= 0) return;
      // Travar na faixa: o repique de overscroll leva o `scrollLeft` além do
      // último encaixe, e um índice fora da lista some com o ponto ativo e
      // apaga o card que está na tela.
      const bruto = Math.round(elemento.scrollLeft / passo);
      setAtivo(Math.min(Math.max(bruto, 0), itens.length - 1));
    };
    elemento.addEventListener("scroll", aoRolar, { passive: true });
    return () => {
      elemento.removeEventListener("scroll", aoRolar);
      if (zerar.current) clearTimeout(zerar.current);
    };
  }, [distancia, itens.length, publicarVelocidade]);

  const ir = useCallback(
    (indice: number) => {
      const passo = distancia();
      trilho.current?.scrollTo({
        left: indice * passo,
        // O `MotionConfig` não alcança scroll imperativo (AD-004): aqui a
        // preferência é lida na mão, senão o ponto move a tela de quem pediu para
        // nada se mover.
        behavior: semMovimento ? "auto" : "smooth",
      });
    },
    [distancia, semMovimento],
  );

  /**
   * **Arrasto por ponteiro.** É o que faltava, e é a queixa inteira: com
   * `overflow-x: auto` puro, quem está num mouse de roda só consegue mover o
   * trilho pelos pontos: a roda vertical rola a página e não existe roda
   * horizontal. No toque o navegador já dá arrasto e inércia de graça, então o
   * `pointerType === "touch"` sai fora: sequestrar ali seria trocar a física do
   * sistema por uma pior.
   *
   * Durante o arrasto o `scroll-snap-type` desliga. Com `mandatory` ligado, cada
   * escrita em `scrollLeft` é puxada de volta para o encaixe mais próximo e o
   * trilho fica preso no card em que começou: o dedo anda e a imagem não.
   */
  const arrasto = useRef<{ x0: number; esquerda0: number; moveu: boolean } | null>(
    null,
  );
  const religarEncaixe = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aoApontar = (evento: React.PointerEvent<HTMLUListElement>) => {
    const elemento = trilho.current;
    if (!elemento || evento.pointerType === "touch" || evento.button !== 0) return;
    if (religarEncaixe.current) clearTimeout(religarEncaixe.current);
    arrasto.current = {
      x0: evento.clientX,
      esquerda0: elemento.scrollLeft,
      moveu: false,
    };
    elemento.style.scrollSnapType = "none";
  };

  const aoMover = (evento: React.PointerEvent<HTMLUListElement>) => {
    const elemento = trilho.current;
    if (!elemento || !arrasto.current) return;
    const dx = evento.clientX - arrasto.current.x0;
    // 10px de folga separa arrasto de clique: abaixo disso o gesto continua
    // sendo um clique, e é por essa mesma marca que o clique é anulado depois.
    if (Math.abs(dx) > 10) {
      arrasto.current.moveu = true;
      // Só a partir daqui, senão um clique comum já capturaria o ponteiro e o
      // `<a>` de dentro do card nunca receberia o evento.
      elemento.setPointerCapture(evento.pointerId);
    }
    if (arrasto.current.moveu) {
      elemento.scrollLeft = arrasto.current.esquerda0 - dx;
    }
  };

  const aoSoltar = () => {
    const elemento = trilho.current;
    const gesto = arrasto.current;
    arrasto.current = null;
    if (!elemento || !gesto) return;
    if (!gesto.moveu) {
      elemento.style.scrollSnapType = "";
      return;
    }

    const passo = distancia();
    if (passo <= 0) return;
    ir(
      alvoDoArremesso(
        elemento.scrollLeft,
        velocidade.current.v,
        passo,
        itens.length,
      ),
    );

    /**
     * **O encaixe só volta depois do pouso, e a ordem é a correção de um bug.**
     *
     * Religar `snap-mandatory` antes do `scrollTo` faz o navegador reavaliar o
     * encaixe no quadro seguinte, a partir de onde o dedo largou, e esse
     * reencaixe atropela o rolamento suave que acabou de ser pedido. Medido: um
     * arremesso de 130px terminava em `scrollLeft 0`, de volta no card de
     * origem, com o arrasto tendo funcionado o tempo todo. Passava em 1440 por
     * sorte de quadro e reprovava em 1280.
     *
     * 700ms cobre o rolamento suave; um arrasto novo antes disso cancela o
     * agendamento no `aoApontar`, senão o encaixe voltaria no meio do gesto.
     */
    if (religarEncaixe.current) clearTimeout(religarEncaixe.current);
    religarEncaixe.current = setTimeout(() => {
      elemento.style.scrollSnapType = "";
    }, 700);

    /**
     * Um bloqueador de clique de uso único, em captura. Arrastar por cima de um
     * card que é link (o caso da `Entregas`) termina num `click` sobre o `<a>`,
     * e sem isto o gesto de folhear navega para o projeto.
     */
    const engolir = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    elemento.addEventListener("click", engolir, { capture: true, once: true });
    // Se o clique não vier (soltar fora do trilho), o listener some sozinho.
    setTimeout(
      () => elemento.removeEventListener("click", engolir, { capture: true }),
      0,
    );
  };

  /**
   * **Clicar num vizinho o traz para o centro.** É o caminho descobrível: o card
   * do lado está na tela, meio apagado, e apontar para ele é o gesto que
   * qualquer um tenta primeiro.
   *
   * `closest("a, button")` é a guarda que faz isto conviver com card que é link:
   * na `Entregas` o cartão inteiro é um `<a>`, e centralizar em vez de navegar
   * seria sequestrar o link.
   */
  const aoClicarNoItem = (indice: number) => (evento: React.MouseEvent) => {
    if (indice === ativo) return;
    if ((evento.target as HTMLElement).closest("a, button")) return;
    ir(indice);
  };

  return (
    <div className={className}>
      <ul
        ref={trilho}
        // `snap-x mandatory` e não `proximity`: com proximity o slide para
        // entre dois encaixes e o índice ativo fica ambíguo.
        className={`flex cursor-grab snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden ${classeDoTrilho ?? ""}`}
        aria-label={rotulo}
        tabIndex={0}
        onPointerDown={aoApontar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
      >
        {itens.map((item, indice) => (
          <li
            key={chave(item, indice)}
            className={classeDoItem}
            aria-current={indice === ativo ? "true" : undefined}
            onClick={aoClicarNoItem(indice)}
          >
            {renderizar(item, indice, indice === ativo)}
          </li>
        ))}
      </ul>

      {itens.length > 1 ? (
        <div
          className={`flex-center ${classeDosPontos}`}
          role="group"
          aria-label={rotuloDosPontos}
        >
          {itens.map((item, indice) => (
            <button
              key={chave(item, indice)}
              type="button"
              onClick={() => ir(indice)}
              aria-current={indice === ativo ? "true" : undefined}
              aria-label={`${indice + 1}`}
              className="flex-center px-4 py-8"
            >
              {/*
                O ponto ativo é 8px e o inativo 4px, medidos em navegador. Quem
                encolhe é o quadrado, não o botão: a caixa de 8px fica de pé e o
                `px-4`/`py-8` mantém o alvo de toque, que a 4px seria
                inalcançável no dedo.
              */}
              <span aria-hidden className="flex-center size-8">
                <span
                  className={`transition-all duration-300 ${
                    indice === ativo ? "size-8 bg-accent" : "size-4 bg-line"
                  }`}
                />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
