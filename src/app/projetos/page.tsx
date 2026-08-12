"use client";

import { Hero } from "@/components/sections/Hero";
import { ListaDeProjetos } from "@/components/sections/ListaDeProjetos";
import { StackTransversal } from "@/components/sections/StackTransversal";
import { portfolioProjects } from "@/data/projects";
import { useTranslations } from "@/hooks/useTranslations";

/**
 * A rota `/projetos`.
 *
 * A coluna não mora aqui (AD-014): o wrapper só carrega o vão entre blocos e a
 * calha vem de `.w-calc` dentro de cada um. Quem abre a rota é o hero de tela
 * cheia, como nas três rotas internas (AD-038).
 */
export default function ProjetosPage() {
  const t = useTranslations();

  return (
    <main className="relative z-200 flex flex-col gap-100 md:gap-200">
      {/* Reaproveita as frases da home; por isso, sem `frases`. */}
      <Hero rotulo={t.rotas.projetos.rotulo} />
      <ListaDeProjetos />
      <StackTransversal projects={portfolioProjects} />
    </main>
  );
}
