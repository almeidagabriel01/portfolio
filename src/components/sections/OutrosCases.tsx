"use client";

import { LinkDeRota as Link } from "@/components/ui/LinkDeRota";
import type { Project } from "@/data/projects";
import { useTranslations } from "@/hooks/useTranslations";
import { useStore } from "@/store";

/**
 * SEC-14: os outros projetos, que é o mesmo que "os outros cases".
 *
 * O filtro era duplo (`project.case && slug !== atual`) enquanto `case` era
 * opcional, para não linkar para uma rota que devolveria 404. Com `case`
 * obrigatório sobra a metade que ainda diz alguma coisa: o projeto atual não
 * se lista a si mesmo.
 */
export function outrosCases(projects: Project[], slugAtual: string): Project[] {
  return projects.filter((project) => project.slug !== slugAtual);
}

/**
 * Sem reveal por interseção, ao contrário das seções da home: nada mais nesta
 * rota anima na entrada, e uma seção que aparece sozinha no fim de uma página
 * estática chamaria atenção para a navegação em vez do case.
 */
export function OutrosCases({
  projects,
  slugAtual,
}: {
  projects: Project[];
  slugAtual: string;
}) {
  const t = useTranslations();
  const locale = useStore((state) => state.locale);
  const outros = outrosCases(projects, slugAtual);

  // SEC-14: sendo o único com case, não há navegação, e uma seção com título
  // e lista vazia é pior do que seção nenhuma.
  if (outros.length === 0) return null;

  // `w-calc` traz a calha: o wrapper de coluna saiu da rota (AD-014), e o
  // `pt-24` virou o `gap` do `<main>`.
  return (
    <section aria-labelledby="outros-cases" className="w-calc">
      <h2
        id="outros-cases"
        className="flex items-center gap-12 type-eyebrow text-ink"
      >
        {t.caseStudy.others}
      </h2>

      <ul className="mt-32 border-t border-line">
        {outros.map((project) => (
          <li key={project.slug} className="border-b border-line">
            <Link
              href={`/projects/${project.slug}`}
              className="group grid items-baseline gap-8 py-24 transition-colors duration-300 hover:text-ink motion-reduce:transition-none md:grid-cols-[minmax(0,22.4rem)_minmax(0,1fr)_auto] md:gap-32"
            >
              {/* `translate="no"`: nome próprio de produto. Mesmo tratamento
                  que Empresas e Entregas dão a "SoftCode" e "ProOps". */}
              <h3 translate="no" className="type-m-20 md:type-m-28 tracking-tight text-ink">
                {project.nome}
              </h3>
              <p className="type-m-16 text-ink/55">
                {project.descricao[locale]}
              </p>
              <span
                aria-hidden
                className="type-m-16 text-ink/55 transition-transform duration-300 group-hover:translate-x-4 motion-reduce:transition-none"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
