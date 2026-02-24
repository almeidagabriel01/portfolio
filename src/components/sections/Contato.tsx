"use client";

import React from "react";
import { Mail, Smartphone } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { useLanguage } from "@/contexts/LanguageContext";

export const Contato = () => {
  const { t } = useLanguage();
  return (
    <section
      id="contato"
      className="py-40 relative text-center overflow-hidden"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#00f3ff]/10 blur-[150px] rounded-full pointer-events-none"></div>

      <Reveal
        direction="scale"
        className="container mx-auto px-6 max-w-4xl relative z-10"
      >
        <h2 className="text-6xl md:text-8xl font-bold mb-8 tracking-tighter">
          {t.contact.title}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] to-[#7b2cbf] animate-pulse">
            {t.contact.highlight}
          </span>
        </h2>
        <p className="text-gray-400 mb-16 text-xl md:text-2xl font-light">
          {t.contact.description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <a
            href="mailto:gabriel.dias01@outlook.com.br"
            className="relative inline-flex h-16 overflow-hidden rounded-full p-[2px] w-full sm:w-auto hover:scale-110 transition-transform group shadow-[0_0_40px_rgba(0,243,255,0.3)]"
          >
            <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00f3ff_0%,#7b2cbf_50%,#00f3ff_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-[#020203] px-10 py-2 text-lg font-bold text-white backdrop-blur-3xl group-hover:bg-[#020203]/50 transition-colors">
              <Mail className="w-6 h-6" /> {t.contact.button}
            </span>
          </a>
        </div>
      </Reveal>
    </section>
  );
};
