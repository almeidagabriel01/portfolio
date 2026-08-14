"use client";

import { LinkDeRota as Link } from "@/components/ui/LinkDeRota";
import { OutrosCases } from "@/components/sections/OutrosCases";
import { portfolioProjects, type Project, type ProjectCase } from "@/data/projects";
import { useTranslations } from "@/hooks/useTranslations";
import { useStore } from "@/store";

/**
 * Renderiza o case como o dado está, sem esconder e sem suavizar. O `papel` já
 * traz o papel real (SEC-11); onde ainda não há fonte (métricas de uso), o
 * marcador `[VERIFICAR]` continua nos destaques, visível por decisão.
 */
export function CaseStudyView({
  project,
  caseStudy,
}: {
  project: Project;
  caseStudy: ProjectCase;
}) {
  const t = useTranslations();
  const locale = useStore((state) => state.locale);

  const blocks = [
    { label: t.caseStudy.context, body: caseStudy.contexto[locale] },
    { label: t.caseStudy.role, body: caseStudy.papel[locale] },
  ];

  return (
    /**
     * A coluna saiu do wrapper (AD-014), como na home e nas outras rotas: ele
     * só carrega o vão entre blocos e a calha vem de `.w-calc` em cada um. O
     * `pt-160` também saiu: quem abre a rota agora é o cabeçalho do case, e o
     * respiro do header fixo é `pt-150`, a mesma medida que as âncoras usam.
     *
     * A case page **não ganhou hero de tela cheia**: em navegador ela nem é
     * página (é uma overlay com filme de marca), e o Gabriel decidiu manter o
     * case escrito. Um hero de 900px empurraria o texto todo para baixo da
     * dobra sem nada a mostrar nele.
     */
    <main className="relative z-200 flex flex-col gap-100 pt-150 md:gap-150">
      <Link
        href="/projects"
        className="w-calc"
      >
        <span className="group inline-flex items-center gap-12 type-button uppercase text-ink/55 transition-colors duration-300 hover:text-ink motion-reduce:transition-none">
        <span
          aria-hidden
          className="transition-transform duration-300 group-hover:-translate-x-4 motion-reduce:transition-none"
        >
          ←
        </span>
        {t.caseStudy.back}
        </span>
      </Link>

      {/* SEC-16: a rota tem **duas** seções de página: o case e a navegação
          para os outros. Contexto, papel, stack e destaques são blocos deste
          case, não seções irmãs dele: como regiões nomeadas, cada uma virava um
          landmark próprio e a página anunciava seis. */}
      <section aria-labelledby="case-titulo" className="w-calc">
      <header className="flex flex-col gap-32 border-b border-line pb-64">
        <h1
          id="case-titulo"
          className="type-m-40 md:type-m-96 md:max-w-7/12 text-ink"
        >
          {project.nome}
        </h1>
        <p className="max-w-[52ch] type-m-16 leading-relaxed text-ink/55">
          {project.descricao[locale]}
        </p>
        <a
          href={project.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-12 border-b border-line pb-4 type-m-16 uppercase tracking-[0.2em] text-ink transition-colors duration-300 hover:border-accent hover:text-accent motion-reduce:transition-none"
        >
          {t.caseStudy.visit}
          <span aria-hidden>↗</span>
        </a>
      </header>

      {blocks.map(({ label, body }) => (
        <div
          key={label}
          className="grid gap-24 border-b border-line py-56 md:grid-cols-[minmax(0,22.4rem)_minmax(0,1fr)] md:gap-64"
        >
          <h2 className="flex items-center gap-12 type-eyebrow text-ink">
          <span aria-hidden className="size-8 shrink-0 bg-accent" />
            {label}
          </h2>
          <p className="max-w-[62ch] type-m-16 leading-relaxed text-ink">
            {body}
          </p>
        </div>
      ))}

      <div className="grid gap-24 border-b border-line py-56 md:grid-cols-[minmax(0,22.4rem)_minmax(0,1fr)] md:gap-64">
        <h2 className="flex items-center gap-12 type-eyebrow text-ink">
          <span aria-hidden className="size-8 shrink-0 bg-accent" />
          {t.caseStudy.stack}
        </h2>
        <ul className="flex flex-wrap gap-12">
          {caseStudy.stack.map((item) => (
            <li
              key={item}
              className="rounded-full border border-line px-16 py-6 type-m-16 text-ink"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-24 py-56 md:grid-cols-[minmax(0,22.4rem)_minmax(0,1fr)] md:gap-64">
        <h2 className="flex items-center gap-12 type-eyebrow text-ink">
          <span aria-hidden className="size-8 shrink-0 bg-accent" />
          {t.caseStudy.highlights}
        </h2>
        <ul className="flex max-w-[62ch] flex-col gap-20">
          {caseStudy.destaques[locale].map((item) => (
            <li
              key={item}
              className="border-l border-line pl-20 type-m-16 leading-relaxed text-ink/55"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
      </section>

      <OutrosCases projects={portfolioProjects} slugAtual={project.slug} />
    </main>
  );
}
