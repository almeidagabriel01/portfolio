import { notFound } from "next/navigation";
import { portfolioProjects } from "@/data/projects";
import { CaseStudyView } from "./CaseStudyView";

/**
 * Server component de propósito: `generateStaticParams` e `notFound()` não
 * existem no cliente. O texto localizado desce para `CaseStudyView`, que é o
 * único pedaço que precisa do `locale` do store.
 */
export function generateStaticParams() {
  // Sem filtro: `case` é obrigatório, então todo projeto tem rota.
  return portfolioProjects.map((project) => ({ slug: project.slug }));
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = portfolioProjects.find((entry) => entry.slug === slug);

  // Só o slug que não existe cai aqui: todo projeto tem case (PORT-15).
  if (!project) notFound();

  return <CaseStudyView project={project} caseStudy={project.case} />;
}
