"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ptBR, enUS, Translations } from "@/locales";

type Language = "pt-BR" | "en-US";

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [language, setLanguage] = useState<Language>("pt-BR");

  useEffect(() => {
    const saved = localStorage.getItem("portfolio-lang") as Language;
    if (saved === "pt-BR" || saved === "en-US") {
      setLanguage(saved);
    }
  }, []);

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === "pt-BR" ? "en-US" : "pt-BR";
      localStorage.setItem("portfolio-lang", next);
      return next;
    });
  };

  const t = language === "pt-BR" ? ptBR : enUS;

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
