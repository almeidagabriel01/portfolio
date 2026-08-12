"use client";

import { useState } from "react";
import { JanelaViva } from "@/components/ui/JanelaViva";
import { LinkDeRota as Link } from "@/components/ui/LinkDeRota";
import { portfolioProjects, type Project } from "@/data/projects";
import { useTranslations } from "@/hooks/useTranslations";
import { useStore } from "@/store";

/**
 * O corpo da `/projetos`, fechado em 2026-08-11, porque não existe spec
 * desta rota.
 *
 * A estrutura é esta:
 *
 * ```
 * div.flex.flex-col.gap-50.md:gap-100
 * ├─ div.w-calc                       cabeçalho: rótulo + título em md:max-w-7/12
 * └─ div.relative.flex.flex-col.gap-100
 *     ├─ controle (em fluxo)          borda de 1px, três colunas
 *     ├─ destaque   scroll-mt-275     os projetos com case, com mídia
 *     └─ todos      gap-24            a tabela 30% / 45% / 25%
 * ```
 *
 * **O alternador destaque/todos não entrou.** Ele seria âncora (os
 * dois botões são `<a>`, os dois blocos existem sempre, e o que os separa é
 * `scroll-mt-*`), e a barra apareceria duas vezes, uma no fluxo e uma cópia
 * `fixed bottom-30`. Sobre centenas de itens isso resolve; sobre oito projetos que
 * cabem na mesma rolagem, era um controle que não controlava nada. Decisão do
 * Gabriel, e o AD-028 já dizia isso: o que não serve na tela não entra.
 */

/** As três larguras da tabela, medidas em navegador. */
/**
 * As três larguras da tabela, medidas em navegador, e **só a partir de
 * `md`**. Sem o prefixo elas valiam também no estreito, onde a linha empilha:
 * o título ficava numa coluna de 30% da tela com o resto vazio ao lado.
 */
const COLUNAS = {
  projeto: "md:w-[30%]",
  oQueE: "md:w-[45%]",
  grupo: "md:w-[25%]",
};

const COM_CASE = portfolioProjects.filter((p) => p.grupo !== "estudo");

/**
 * A ordem da tabela é a do PORT-13 (trabalho antes de estudo), e ela é
 * asserida em `projetos.spec.ts`. Ordenar por setor não serve aqui; o
 * equivalente é o grupo, que é a taxonomia que este site tem.
 */
const TODOS = [
  ...COM_CASE,
  ...portfolioProjects.filter((p) => p.grupo === "estudo"),
];

/**
 * **Uma janela, oito projetos.**
 *
 * A primeira versão empilhava um card por projeto: com a janela em largura
 * cheia isso dava oito telas de rolagem só para o destaque, e o rótulo dizia
 * "oito projetos" enquanto o bloco mostrava três. Agora a moldura é uma só e a
 * fileira de nomes acima dela troca quem está dentro: todos os oito ficam
 * visíveis de uma vez, e a página encolheu para uma tela.
 *
 * A fileira é a mesma gramática do resto: mono caps, filete embaixo, e o ativo
 * em cor cheia contra `/55` dos outros.
 */
/**
 * **Todos os oito de uma vez, em grade.**
 *
 * A primeira versão empilhava um card de largura cheia por projeto: oito telas
 * de rolagem só para o destaque. A segunda trocou por um menu de abas, que
 * mostrava um de cada vez e escondia sete. A grade resolve as duas coisas:
 * duas colunas no desktop, uma no estreito, e nada escondido.
 *
 * **Só uma janela viva por vez.** Oito `<iframe>` de terceiros abertos juntos
 * seriam oito sites carregando na mesma aba; abrir uma fecha a anterior, e o
 * estado mora aqui por isso.
 */
function Destaque() {
  const t = useTranslations();
  const locale = useStore((state) => state.locale);
  const [viva, setViva] = useState<string | null>(null);

  return (
    <ul className="w-calc grid gap-50 md:grid-cols-2 md:gap-x-32 md:gap-y-50">
      {TODOS.map((project) => {
        return (
          <li key={project.slug} className="flex flex-col gap-24">
            <div className="flex flex-col gap-8">
              {/*
                O selo é a primeira coisa da linha por decisão: sem ele a grade
                punha exercício de curso e entrega para cliente lado a lado, do
                mesmo tamanho, e nada na tela dizia qual era qual.
                `estudo` fica em `/55`, o piso calibrado do site, não menos:
                a `/40` que eu tinha posto reprovava o WCAG AA. Entrega real
                fica em cor cheia com o
                quadrado âmbar, que é a marca gráfica do resto do site.
              */}
              <p
                className={`flex items-center gap-8 type-sub uppercase ${
                  project.grupo === "estudo"
                    ? "text-ink/55"
                    : "text-ink"
                }`}
              >
                {project.grupo !== "estudo" ? (
                  <span aria-hidden className="size-8 shrink-0 bg-accent" />
                ) : null}
                {t.projects.tipos[project.grupo]}
              </p>
              <h3 className="type-m-24 text-ink">
                {/* Sempre o case: `case` é obrigatório em `Project`. Antes,
                    parte dos títulos abria o site em aba nova e parte navegava
                    para dentro do site, na mesma grade. */}
                <Link
                  href={`/projetos/${project.slug}`}
                  className="transition-colors duration-300 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none"
                >
                  {project.nome}
                </Link>
              </h3>
              <p className="type-m-16 text-ink/55">
                {project.descricao[locale]}
              </p>
            </div>

            <JanelaViva
              src={project.link}
              /* O caminho declarado no dado, não `/projetos/${slug}.png`
                 montado aqui: o caminho montado supunha um arquivo que o dado
                 não declarava, e a LyftConnect tinha exatamente esse par —
                 `lyftconnect.png` no disco e nenhum `screenshot` no dado. Esta
                 tela pintava, as outras não, com a mesma fonte de verdade
                 dizendo coisas diferentes conforme quem perguntava. */
              poster={project.screenshot}
              titulo={project.nome}
              abrir={t.projects.janela.abrir}
              fechar={t.projects.janela.fechar}
              aviso={t.projects.janela.aviso}
              emNovaAba={t.projects.janela.emNovaAba}
              viva={viva === project.slug}
              aoAlternar={() =>
                setViva((atual) =>
                  atual === project.slug ? null : project.slug,
                )
              }
            />
          </li>
        );
      })}
    </ul>
  );
}

function Linha({ project }: { project: Project }) {
  const t = useTranslations();
  const locale = useStore((state) => state.locale);
  const grupo =
    project.grupo === "estudo"
      ? t.projects.groups.estudo
      : t.projects.groups.trabalho;

  return (
    <Link
      href={`/projetos/${project.slug}`}
      data-projeto={project.slug}
      className="group relative flex flex-col gap-8 border-t border-line py-16 transition-colors duration-300 hover:text-ink motion-reduce:transition-none md:h-64 md:flex-row md:items-center md:gap-32 md:py-0"
    >
      <h3 className={`${COLUNAS.projeto} type-m-20 text-ink`}>
        {project.nome}
      </h3>
      <p className={`${COLUNAS.oQueE} type-m-16 text-ink/55`}>
        {project.descricao[locale]}
      </p>
      <span
        className={`${COLUNAS.grupo} type-sub uppercase text-ink/55`}
      >
        {grupo}
      </span>
    </Link>
  );
}

export function ListaDeProjetos() {
  const t = useTranslations();

  return (
    <section
      aria-labelledby="lista-de-projetos"
      className="flex w-full flex-col gap-50 md:gap-100"
    >
      <header className="w-calc flex flex-col gap-32">
        <p className="flex items-center gap-12 type-eyebrow text-ink">
          <span aria-hidden className="size-8 shrink-0 bg-accent" />
          {t.projects.label}
        </p>
        {/* `md:max-w-7/12` é a medida: o título ocupa sete doze
            avos da coluna e o resto fica vazio de propósito. */}
        <h2
          id="lista-de-projetos"
          className="type-m-40 md:type-m-96 md:max-w-7/12 text-ink"
        >
          {t.projects.title}
          <span className="text-ink/55">{t.projects.highlight}</span>
        </h2>
      </header>

      <div className="relative flex flex-col gap-100">
        <Destaque />

        {/* `data-tabela` é o gancho do teste: o id sumiu com o alternador, e
            os títulos das linhas são `<h3>` como os dos cards de destaque. */}
        <div data-tabela className="w-calc flex flex-col gap-24">
          <div className="hidden items-center gap-32 md:flex">
            <span className={`${COLUNAS.projeto} type-sub uppercase text-ink/55`}>
              {t.projects.table.projeto}
            </span>
            <span className={`${COLUNAS.oQueE} type-sub uppercase text-ink/55`}>
              {t.projects.table.oQueE}
            </span>
            <span className={`${COLUNAS.grupo} type-sub uppercase text-ink/55`}>
              {t.projects.table.grupo}
            </span>
          </div>

          <div className="flex flex-col border-b border-line">
            {TODOS.map((project) => (
              <Linha key={project.slug} project={project} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
