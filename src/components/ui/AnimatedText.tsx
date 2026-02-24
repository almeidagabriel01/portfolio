"use client";

import React from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

interface AnimatedTextProps {
  text: string;
  delay?: number;
  className?: string;
}

export const AnimatedText = ({
  text,
  delay = 0,
  className = "",
}: AnimatedTextProps) => {
  const [ref, isVisible] = useIntersectionObserver();

  const words = text.split(" ");
  let charCount = 0;

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {words.map((word, wordIndex) => {
        const wordContent = (
          <span key={wordIndex} className="inline-block whitespace-nowrap">
            {word.split("").map((char, charIndex) => {
              const currentDelay = delay + (charCount + charIndex) * 30;
              return (
                <span
                  key={charIndex}
                  style={{
                    transitionDelay: isVisible ? `${currentDelay}ms` : "0ms",
                    transitionDuration: "600ms",
                  }}
                  className={`inline-block transition-all ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-50 rotate-12"}`}
                >
                  {char}
                </span>
              );
            })}
          </span>
        );
        charCount += word.length + 1; // +1 to account for the space in delay calculation

        return (
          <React.Fragment key={wordIndex}>
            {wordContent}
            {wordIndex < words.length - 1 && " "}
          </React.Fragment>
        );
      })}
    </span>
  );
};
