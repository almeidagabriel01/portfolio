"use client";

import Image from "next/image";
import { useState } from "react";
import type { Project } from "@/data/projects";
import { useTranslations } from "@/hooks/useTranslations";
import { useStore } from "@/store";

/**
 * UI-08/09/10, o carrossel (frame 03), com o tema trocado por
 * decisão do Gabriel: screenshot do projeto no lugar do retrato, descrição no
 * lugar da citação, nome + `entreguePor` no lugar de pessoa + cargo.
 *
 * A anatomia é a do frame: uma trilha de imagens com a ativa centralizada e as
 * vizinhas sangrando pelas bordas, **um** bloco de texto embaixo (o da ativa,
 * não um por slide) e a fileira de pontos. Os vizinhos no frame mostram só
 * imagem; quem carrega texto é o slide do meio.
 */
const LARGURA_DO_SLIDE = 68;
const ESPACO_REM = 1.5;

/**
 * A trilha tem `width: 100%` da janela de propósito, e os slides são
 * `flex-basis` em porcentagem dela. É o que faz a conta do `translateX` fechar:
 * porcentagem em `translate` resolve contra a largura do **próprio** elemento,
 * então uma trilha larga como a soma dos slides daria um deslocamento diferente
 * a cada contagem de projetos. Com a trilha do tamanho da janela, um passo é
 * sempre "uma largura de slide + um espaço".
 */
function deslocamento(indice: number): string {
  const centragem = (100 - LARGURA_DO_SLIDE) / 2;
  return `translateX(calc(${centragem}% - ${indice} * (${LARGURA_DO_SLIDE}% + ${ESPACO_REM}rem)))`;
}

export function CarrosselDeProjetos({ projects }: { projects: Project[] }) {
  const t = useTranslations();
  const locale = useStore((state) => state.locale);
  const [ativo, setAtivo] = useState(0);

  const atual = projects[ativo];

  return (
    <div data-carrossel className="flex flex-col gap-40">
      <div className="overflow-hidden">
        <ul
          data-trilha
          className="flex w-full gap-24 transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{ transform: deslocamento(ativo) }}
        >
          {projects.map((project, indice) => (
            <li
              key={project.slug}
              data-slide={project.slug}
              data-ativo={indice === ativo ? "" : undefined}
              className="w-[68%] shrink-0"
            >
              {/*
                Marcadores de canto nas células de mídia. `aria-hidden` e sem
                texto, então vão no acento cheio.
              */}
              <div className="relative aspect-[16/10] overflow-hidden rounded-sm bg-surface">
                {/*
                  Caso de borda do spec: projeto sem screenshot renderiza sem
                  imagem. O bloco mantém a proporção (é o `aspect` do
                  contêiner que segura o layout, não a imagem), então a
                  trilha não desalinha e os vizinhos continuam onde estavam.
                */}
                {project.screenshot && (
                  <Image
                    src={project.screenshot}
                    alt={project.nome}
                    width={1280}
                    height={800}
                    className="size-full object-cover object-top"
                  />
                )}
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 size-6 bg-accent"
                />
                <span
                  aria-hidden
                  className="absolute right-0 bottom-0 size-6 bg-accent"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/*
        Um bloco de texto só, o da ativa. É assim no frame 03. `min-h` para a
        troca de slide não sacudir a fileira de pontos quando a descrição muda
        de altura.
      */}
      <div data-legenda className="mx-auto flex min-h-160 max-w-[52ch] flex-col gap-24 text-center">
        <p className="type-m-16 leading-relaxed text-ink/55">
          {atual.descricao[locale]}
        </p>

        <div className="flex flex-col gap-8">
          <h3 className="type-m-20 md:type-m-28 tracking-tight text-ink">{atual.nome}</h3>

          {/*
            SEC-18: o rótulo não existe sem valor. Exercício de curso não sai
            por empresa nenhuma, e o `entreguePor` ausente leva o rótulo junto
            em vez de deixar "Entregue por" solto.
          */}
          {atual.entreguePor && (
            <p
              data-entregue-por={atual.entreguePor}
              className="type-m-12 uppercase tracking-[0.24em] text-ink/55"
            >
              {t.deliveries.by}{" "}
              <span translate="no" className="text-ink">
                {atual.entreguePor}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-12">
        {projects.map((project, indice) => (
          <button
            key={project.slug}
            type="button"
            data-dot={project.slug}
            aria-label={project.nome}
            aria-current={indice === ativo}
            onClick={() => setAtivo(indice)}
            className={`size-8 transition-colors duration-300 motion-reduce:transition-none ${
              indice === ativo ? "bg-accent" : "bg-line hover:bg-ink/55"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
