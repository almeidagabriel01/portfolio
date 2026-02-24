"use client";

import React from "react";
import { Reveal } from "./Reveal";
import { AnimatedText } from "./AnimatedText";

interface SectionHeaderProps {
  title: string;
  highlight?: string;
  description: string;
  highlightColorClass?: string;
  center?: boolean;
}

export const SectionHeader = ({
  title,
  highlight,
  description,
  highlightColorClass = "text-[#00f3ff]",
  center = true,
}: SectionHeaderProps) => {
  return (
    <Reveal
      direction={center ? "up" : "left"}
      className={`mb-16 ${center ? "text-center" : ""}`}
    >
      <h2 className="text-4xl md:text-6xl font-bold mb-4">
        <AnimatedText text={title} />
        {highlight && (
          <span className={highlightColorClass}>
            {" "}
            <AnimatedText text={highlight} delay={300} />
          </span>
        )}
      </h2>
      <p
        className={`text-gray-400 max-w-2xl text-lg mt-4 ${center ? "mx-auto" : ""}`}
      >
        {description}
      </p>
    </Reveal>
  );
};
