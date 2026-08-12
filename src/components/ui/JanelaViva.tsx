"use client";

import Image from "next/image";

/**
 * A janela do card: uma captura em repouso, o site **de verdade** quando aberta.
 *
 * A moldura é de largura cheia, um projeto por linha: o bloco de destaque é
 * uma coluna (`flex w-full flex-col gap-100`), e é o que dá ao
 * site embutido espaço para renderizar o layout de desktop.
 *
 * **A barra de endereço fica sempre.** Sem ela o repouso era uma imagem grande
 * sem affordance nenhuma: o Gabriel olhou e leu como defeito de UI, não como
 * algo em que se clica. Com a barra a caixa se anuncia como janela antes de
 * qualquer texto, e o aviso no meio diz o que o clique faz.
 *
 * **Não carrega sozinha.** Três `<iframe>` de terceiros no primeiro paint
 * custariam três sites inteiros para quem só passou os olhos, e o bloco fica
 * acima da dobra.
 *
 * `sandbox` sem `allow-top-navigation`: um site embutido não pode levar o
 * visitante embora. `allow-same-origin` vale para a origem **dele**, não para
 * a nossa: é o que deixa o site funcionar com o próprio storage e sessão.
 */
export function JanelaViva({
  src,
  poster,
  titulo,
  abrir,
  fechar,
  aviso,
  emNovaAba,
  viva,
  aoAlternar,
}: {
  src: string;
  poster: string;
  titulo: string;
  abrir: string;
  fechar: string;
  aviso: string;
  emNovaAba: string;
  /**
   * Controlada de fora: numa grade de oito, quem decide é o bloco, e ele só
   * deixa **uma** viva por vez. Com estado interno, abrir as oito carregaria
   * oito sites de terceiros ao mesmo tempo.
   */
  viva: boolean;
  aoAlternar: () => void;
}) {
  const host = new URL(src).host.replace(/^www\./, "");

  return (
    <div className="flex flex-col overflow-clip rounded-[1.6rem] border border-line bg-surface">
      {/*
        A barra é a única superfície nossa dentro do quadro quando o site está
        vivo: o ponteiro dentro do retângulo pertence a ele, então sem ela não
        haveria como fechar.
      */}
      <div className="flex items-center justify-between gap-16 border-b border-line px-16 py-12">
        <span className="flex min-w-0 items-center gap-12">
          <span aria-hidden className="size-8 shrink-0 bg-accent" />
          <span className="truncate type-sub uppercase text-ink/55">
            {host}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-16">
          <button
            type="button"
            onClick={aoAlternar}
            className="type-button uppercase text-ink transition-colors duration-300 hover:text-cta motion-reduce:transition-none"
          >
            {viva ? fechar : abrir}
          </button>
          {/*
            A saída para o site de verdade, na própria barra: a janela é uma
            prévia dentro do portfólio, e quem quiser o site inteiro (com a
            navegação dele, sem moldura) não devia ter de sair da rota para
            achar o endereço.
          */}
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-8 type-button uppercase text-ink/55 transition-colors duration-300 hover:text-ink motion-reduce:transition-none"
          >
            {emNovaAba}
            <span aria-hidden>↗</span>
          </a>
        </span>
      </div>

      {/*
        A altura vem da **tela**, não de uma proporção fixa.
        `aspect-[16/10]` numa coluna de 1340 dá 838px de janela; somados a
        barra, ao header fixo e ao vão da seção, ela passava da viewport num
        laptop e o visitante via um pedaço. `svh` também resolve a barra de
        endereço do navegador móvel, que `vh` ignora.
      */}
      {/* Proporção fixa: na grade de duas colunas a moldura tem ~650px, e uma
          altura dirigida por `svh` deixaria os cards de alturas diferentes. */}
      <div className="relative aspect-[4/3] md:aspect-[16/10]">
        {viva ? (
          <iframe
            src={src}
            title={titulo}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="absolute inset-0 size-full border-0 bg-white"
          />
        ) : (
          <>
            {/*
              A captura é 1280×800. Antes vinha do poster de vídeo, 380×237,
              ampliado 3,5× e por isso borrado, que foi o que leu como defeito
              de UI. `object-cover` recorta o excedente conforme a moldura muda
              de proporção com a altura da tela.
            */}
            <Image
              src={poster}
              alt=""
              fill
              sizes="(min-width: 768px) 90vw, 100vw"
              className="object-cover object-top"
            />
            <button
              type="button"
              onClick={aoAlternar}
              className="group/janela absolute inset-0 flex flex-col items-center justify-center gap-16 px-24 text-center bg-black/45 transition-colors duration-300 hover:bg-black/25 focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none"
            >
              <span className="type-eyebrow text-ink">{aviso}</span>
              <span className="flex items-center gap-8 rounded-[0.4rem] bg-ink/8 px-16 py-8 type-button uppercase text-ink backdrop-blur-sm transition-transform duration-300 group-hover/janela:scale-105 motion-reduce:transition-none">
                {abrir}
              </span>
              <span className="sr-only">{titulo}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
