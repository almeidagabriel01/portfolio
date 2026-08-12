"use client";

import { DistributedHeadline } from "@/components/ui/DistributedHeadline";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { Project } from "@/data/projects";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useTranslations } from "@/hooks/useTranslations";

export interface TecnologiaTransversal {
  nome: string;
  /** Nomes das entregas que declaram essa tecnologia, na ordem do dado. */
  entregas: string[];
}

/**
 * SEC-13: a lista sai do dado, não do componente.
 *
 * **Nenhum nome de tecnologia é escrito aqui.** Acrescentar uma tecnologia ao
 * `case.stack` de um projeto a faz aparecer na seção sem tocar neste arquivo,
 * que é exatamente o critério que o teste de derivação executa. Uma lista
 * manual (ou um allowlist de tecnologias conhecidas) reprovaria o requisito.
 *
 * O único descarte é de marcador: `[VERIFICAR]` é um pendência anotada no
 * lugar da stack, não uma tecnologia: renderizá-lo como chip diria que o
 * Gabriel usa uma tecnologia chamada "[VERIFICAR]". O marcador continua
 * visível na case page do projeto, que é onde ele significa alguma coisa.
 */
const MARCADOR = "[VERIFICAR]";

export function aggregateStack(projects: Project[]): TecnologiaTransversal[] {
  const porTecnologia = new Map<string, string[]>();

  for (const project of projects) {
    // Estudo não entra: desde que os exercícios de curso ganharam case page,
    // a stack deles existe no dado, e sem esta linha "transversal" passaria a
    // contar Create React App e CSS Modules ao lado de Next.js e Vercel. A
    // seção fala do que atravessa as **entregas**, e é isso que dá peso à
    // contagem de projetos por tecnologia.
    if (project.grupo === "estudo") continue;
    for (const tecnologia of project.case?.stack ?? []) {
      if (tecnologia.startsWith(MARCADOR)) continue;
      const entregas = porTecnologia.get(tecnologia) ?? [];
      entregas.push(project.nome);
      porTecnologia.set(tecnologia, entregas);
    }
  }

  return [...porTecnologia]
    .map(([nome, entregas]) => ({ nome, entregas }))
    .sort(
      (a, b) =>
        b.entregas.length - a.entregas.length || a.nome.localeCompare(b.nome),
    );
}

export function StackTransversal({ projects }: { projects: Project[] }) {
  const t = useTranslations();
  const { ref, className } = useSectionReveal<HTMLElement>();
  const tecnologias = aggregateStack(projects);

  return (
    <section
      ref={ref}
      aria-labelledby="stack-transversal"
      // `w-calc` traz a calha, e o `mt` próprio saiu: o vão entre blocos é o
      // `gap` do `<main>` da rota (AD-014), e as duas fontes de espaço somavam
      // 200px onde o molde pede 100. O `className` é do reveal de seção.
      className={`w-calc ${className}`}
    >
      <SectionLabel>{t.stack.label}</SectionLabel>
      <div className="mt-48">
        <DistributedHeadline id="stack-transversal">
          {`${t.stack.title}${t.stack.highlight}`}
        </DistributedHeadline>
      </div>
      <p className="mt-32 max-w-[52ch] type-m-16 leading-relaxed text-ink/55">
        {t.stack.description}
      </p>

      {/* Dado vazio não pode virar lista vazia com borda: sem tecnologia
          nenhuma, não há o que listar e a `<ul>` não é renderizada. */}
      {tecnologias.length > 0 && (
        <ul className="mt-56 border-t border-line">
          {tecnologias.map((tecnologia) => (
            <li
              key={tecnologia.nome}
              data-tecnologia={tecnologia.nome}
              className="grid items-baseline gap-8 border-b border-line py-20 md:grid-cols-[minmax(0,28.8rem)_minmax(0,1fr)] md:gap-32"
            >
              <p translate="no" className="type-m-20 md:type-m-28 tracking-tight text-ink">
                {tecnologia.nome}
              </p>
              <p
                translate="no"
                className="type-m-16 uppercase tracking-[0.2em] text-ink/55"
              >
                {tecnologia.entregas.join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
