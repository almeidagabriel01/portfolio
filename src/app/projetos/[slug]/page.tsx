import { notFound } from "next/navigation";
import { portfolioProjects } from "@/data/projects";
import { CaseStudyView } from "./CaseStudyView";

/**
 * Server component de propósito: `generateStaticParams` e `notFound()` não
 * existem no cliente. O texto localizado desce para `CaseStudyView`, que é o
 * único pedaço que precisa do `locale` do store.
 */
export function generateStaticParams() {
  return portfolioProjects
    .filter((project) => project.case)
    .map((project) => ({ slug: project.slug }));
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = portfolioProjects.find((entry) => entry.slug === slug);

  // Projeto do grupo `estudo` não tem `case`: para a rota, é indistinguível de
  // um slug que não existe (PORT-15).
  if (!project?.case) notFound();

  return <CaseStudyView project={project} caseStudy={project.case} />;
}
