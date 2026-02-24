"use client";

import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

interface HeaderProps {
  scrollY: number;
}

export const Header = ({ scrollY }: HeaderProps) => {
  const { t, language, toggleLanguage } = useLanguage();

  const navItems = [
    { id: "sobre", label: t.header.about },
    { id: "projetos", label: t.header.projects },
    { id: "habilidades", label: t.header.skills },
    { id: "jornada", label: t.header.journey },
  ];

  const { scrollToId } = useSmoothScroll();

  return (
    <div className="fixed top-6 left-0 w-full z-50 flex justify-center px-4 pointer-events-none">
      <header
        className={`pointer-events-auto transition-all duration-500 ease-out flex items-center justify-between px-6 py-3 rounded-full border ${scrollY > 50 ? "bg-[#0a0a0c]/90 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-4xl" : "bg-transparent border-transparent w-full max-w-7xl"}`}
      >
        <div className="font-bold text-xl tracking-tighter text-white flex items-center gap-2">
          <span className="text-[#00f3ff] font-mono font-black">&lt;/&gt;</span>
          Gabriel Dias
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => scrollToId(e, item.id)}
              className="relative text-gray-400 hover:text-[#00f3ff] transition-colors group py-1"
            >
              {item.label}
              <span className="absolute left-0 bottom-0 w-0 h-[2px] bg-gradient-to-r from-[#00f3ff] to-[#7b2cbf] transition-all duration-300 group-hover:w-full"></span>
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <a
            href="#contato"
            onClick={(e) => scrollToId(e, "contato")}
            className="relative inline-flex h-10 overflow-hidden rounded-full p-[1px] hover:scale-105 transition-transform"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00f3ff_0%,#7b2cbf_50%,#00f3ff_100%)]" />
            <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-slate-950/90 px-6 text-sm font-medium text-white backdrop-blur-3xl">
              {t.header.contact}
            </span>
          </a>
        </div>
      </header>
    </div>
  );
};
