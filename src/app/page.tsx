"use client";

import React, { useState, useEffect } from "react";
import { DynamicTechBackground } from "@/components/ui/DynamicTechBackground";
import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { Projetos } from "@/components/sections/Projetos";
import { Habilidades } from "@/components/sections/Habilidades";
import { Jornada } from "@/components/sections/Jornada";
import { Contato } from "@/components/sections/Contato";
import { Footer } from "@/components/sections/Footer";

export default function Portfolio() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () =>
      requestAnimationFrame(() => setScrollY(window.scrollY));
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-[#020203] text-white min-h-screen font-sans overflow-x-hidden selection:bg-[#00f3ff] selection:text-black">
      {/* Background Geométrico "Tech Stack" */}
      <DynamicTechBackground />
      <div className="fixed inset-0 pointer-events-none z-[1] bg-gradient-to-b from-transparent via-[#020203]/40 to-[#020203] opacity-80"></div>
      <div className="fixed top-0 left-0 w-full h-[800px] pointer-events-none z-[1] opacity-20 bg-[radial-gradient(ellipse_at_top,#7b2cbf_0%,transparent_50%)]"></div>

      <div className="relative z-10">
        <Header scrollY={scrollY} />

        <main>
          <Hero />
          <Projetos />
          <Habilidades />
          <Jornada scrollY={scrollY} />
          <Contato />
        </main>

        <Footer />
      </div>
    </div>
  );
}
