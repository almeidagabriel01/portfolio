"use client";

import { Hero } from "@/components/sections/Hero";
import { ListaDeProjetos } from "@/components/sections/ListaDeProjetos";
import { StackTransversal } from "@/components/sections/StackTransversal";
import { portfolioProjects } from "@/data/projects";
import { useTranslations } from "@/hooks/useTranslations";

/**
 * A rota `/projects`.
 *
 * A coluna não mora aqui (AD-014): o wrapper só carrega o vão entre blocos e a
 * calha vem de `.w-calc` dentro de cada um. Quem abre a rota é o hero de tela
 * cheia, como nas três rotas internas (AD-038).
 */
export default function ProjetosPage() {
  const t = useTranslations();

  return (
    <main className="relative z-200 flex flex-col gap-100 md:gap-200">
      {/*
        Frases próprias da rota. Herdar as da home punha "Eu sou Gabriel Dias"
        no topo de duas páginas seguidas, com o mesmo molde de hero: lia como a
        home carregada de novo.
      */}
      <Hero
        rotulo={t.rotas.projetos.rotulo}
        frases={t.rotas.projetos.frases}
      />
      <ListaDeProjetos />
      <StackTransversal projects={portfolioProjects} />
    </main>
  );
}
