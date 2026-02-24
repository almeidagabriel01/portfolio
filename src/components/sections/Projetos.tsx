"use client";

import React from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BrowserPreview } from "@/components/ui/BrowserPreview";
import { useLanguage } from "@/contexts/LanguageContext";
import { portfolioProjects } from "@/data/projects";

export const Projetos = () => {
  const { t } = useLanguage();
  return (
    <section id="projetos" className="py-32 relative">
      <div className="container mx-auto px-6">
        <SectionHeader
          title={t.projects.title}
          highlight={t.projects.highlight}
          description={t.projects.description}
          highlightColorClass="text-[#00f3ff]"
          center={false}
        />

        <div className="flex flex-col gap-16 max-w-5xl mx-auto">
          {portfolioProjects.map((proj, idx) => (
            <div key={idx} className="w-full">
              <BrowserPreview
                link={proj.link}
                nome={proj.nome}
                tags={proj.tags}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
