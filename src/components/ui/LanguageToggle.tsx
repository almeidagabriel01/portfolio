"use client";

import React from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const LanguageToggle = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="group flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#00f3ff] hover:to-[#7b2cbf] transition-all duration-300 bg-white/5 hover:bg-[#00f3ff]/10 px-3 py-1.5 rounded-full border border-white/10 hover:border-[#00f3ff]/50 cursor-pointer hover:scale-105 active:scale-95 hover:shadow-[0_0_15px_rgba(0,243,255,0.3)]"
      aria-label="Toggle language"
    >
      <Globe className="w-4 h-4 text-gray-400 group-hover:text-[#00f3ff] transition-colors duration-300" />
      {language === "pt-BR" ? "PT" : "EN"}
    </button>
  );
};
