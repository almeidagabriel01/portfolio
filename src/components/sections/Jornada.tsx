"use client";

import React from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TimelineItem } from "@/components/ui/TimelineItem";
import { useLanguage } from "@/contexts/LanguageContext";
import { rawJourneyExperiences } from "@/data/journey";

export const Jornada = ({ scrollY }: { scrollY: number }) => {
  const { t } = useLanguage();
  const experiences = rawJourneyExperiences.map((raw, idx) => ({
    ...raw,
    ...t.journey.experiences[idx],
  }));

  return (
    <section id="jornada" className="py-32 relative">
      <div className="container mx-auto px-6 max-w-5xl">
        <SectionHeader
          title={t.journey.title}
          highlight={t.journey.highlight}
          description=""
          highlightColorClass="text-[#00f3ff] drop-shadow-[0_0_15px_rgba(0,243,255,0.4)]"
        />

        <div className="relative">
          <div className="absolute left-[39px] md:left-1/2 top-0 bottom-0 w-[2px] md:-translate-x-1/2 bg-white/5 overflow-hidden">
            <div
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-transparent via-[#00f3ff] to-transparent h-[300px]"
              style={{ transform: `translateY(${scrollY % 3000}px)` }}
            ></div>
          </div>

          {experiences.map((item, idx) => (
            <TimelineItem key={idx} item={item as any} isLeft={idx % 2 === 0} />
          ))}
        </div>
      </div>
    </section>
  );
};
