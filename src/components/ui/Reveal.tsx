"use client";

import React from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "right" | "scale" | "rotate";
}

export const Reveal = ({
  children,
  delay = 0,
  className = "",
  direction = "up",
}: RevealProps) => {
  const [ref, isVisible] = useIntersectionObserver();

  const getTransform = () => {
    if (isVisible)
      return "translate-x-0 translate-y-0 scale-100 opacity-100 rotate-0";
    switch (direction) {
      case "up":
        return "translate-y-24 opacity-0";
      case "left":
        return "-translate-x-24 opacity-0";
      case "right":
        return "translate-x-24 opacity-0";
      case "scale":
        return "scale-50 opacity-0";
      case "rotate":
        return "rotate-[-10deg] scale-90 opacity-0 translate-y-12";
      default:
        return "translate-y-24 opacity-0";
    }
  };

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: isVisible ? `${delay}ms` : "0ms",
        transitionDuration: isVisible ? "1000ms" : "400ms",
      }}
      className={`transition-all ease-[cubic-bezier(0.25,1,0.5,1)] ${getTransform()} ${className}`}
    >
      {children}
    </div>
  );
};
