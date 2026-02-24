"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FuturisticCard } from "@/components/ui/FuturisticCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPortfolioSkills } from "@/data/skills";

export const Habilidades = () => {
  const { t } = useLanguage();
  return (
    <section id="habilidades" className="py-32 relative">
      <div className="container mx-auto px-6">
        <SectionHeader
          title={t.skills.title}
          highlight={t.skills.highlight}
          description={t.skills.description}
          highlightColorClass="text-[#7b2cbf]"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {getPortfolioSkills().map((stack, idx) => (
            <Reveal key={idx} delay={idx * 200} direction="up" className="flex">
              <FuturisticCard
                title={t.skills.categories[idx].title}
                icon={stack.icon}
                colorHex={stack.colorHex}
                skills={stack.skills}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
