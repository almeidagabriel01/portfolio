"use client";

import React from "react";
import { Code2, Github, Linkedin } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";
import Image from "next/image";

export const Hero = () => {
  const { t } = useLanguage();
  const { scrollToId } = useSmoothScroll();

  return (
    <section
      id="sobre"
      className="min-h-screen flex items-center justify-center relative pt-32 pb-20"
    >
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
          {/* Text Content */}
          <div className="w-full lg:w-1/2 text-center lg:text-left order-2 lg:order-1">
            <Reveal direction="scale" delay={100}>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#00f3ff]/30 bg-[#00f3ff]/10 backdrop-blur-md mb-8 hover:bg-[#00f3ff]/20 transition-colors cursor-default">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f3ff] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00f3ff]"></span>
                </span>
                <span className="text-sm text-[#00f3ff] font-mono tracking-wide">
                  {t.hero.available}
                </span>
              </div>
            </Reveal>

            <h1 className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight mb-6 leading-[1.1]">
              <AnimatedText text={t.hero.title} delay={200} />
              <br />
              <div className="inline-block mt-2 h-[1.2em] relative w-full lg:w-[120%]">
                <Reveal
                  delay={800}
                  direction="up"
                  className="absolute top-0 left-0 lg:left-0 w-full text-center lg:text-left"
                >
                  <span className="text-shimmer drop-shadow-[0_0_30px_rgba(123,44,191,0.5)] whitespace-nowrap lg:ml-0">
                    {t.hero.subtitle}
                  </span>
                </Reveal>
              </div>
            </h1>

            <Reveal delay={1000} direction="up">
              <p className="text-gray-400 text-lg md:text-2xl max-w-2xl mx-auto lg:mx-0 mb-12 font-light leading-relaxed">
                {t.hero.greeting}{" "}
                <strong className="text-white">{t.hero.name}</strong>.{" "}
                {t.hero.role}
              </p>
            </Reveal>

            <Reveal delay={1200} direction="scale">
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
                <a
                  href="#projetos"
                  onClick={(e) => scrollToId(e, "projetos")}
                  className="group relative px-8 py-4 bg-white text-black font-bold rounded-full overflow-hidden w-full sm:w-auto flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                  {t.hero.explore}{" "}
                  <Code2 className="w-5 h-5 transition-transform group-hover:rotate-12" />
                </a>
                <div className="flex gap-4">
                  <a
                    href="https://github.com/almeidagabriel01"
                    target="_blank"
                    rel="noreferrer"
                    className="w-14 h-14 rounded-full border border-white/20 bg-[#0a0a0c]/80 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#00f3ff]/20 hover:border-[#00f3ff] hover:text-[#00f3ff] transition-all hover:scale-110 hover:rotate-[360deg] duration-700"
                  >
                    <Github className="w-6 h-6" />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/gabrielalmeidadias/"
                    target="_blank"
                    rel="noreferrer"
                    className="w-14 h-14 rounded-full border border-white/20 bg-[#0a0a0c]/80 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#7b2cbf]/20 hover:border-[#7b2cbf] hover:text-[#7b2cbf] transition-all hover:scale-110 hover:rotate-[-360deg] duration-700"
                  >
                    <Linkedin className="w-6 h-6" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Image Content */}
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end order-1 lg:order-2 mt-8 lg:mt-0">
            <Reveal delay={400} direction="right">
              <div className="relative w-72 h-72 md:w-96 md:h-96 group perspective-1000">
                {/* Efeito Glow Expandido e Animado */}
                <div className="absolute -inset-4 bg-gradient-to-r from-[#00f3ff] via-[#7b2cbf] to-[#ff00ff] rounded-3xl blur-2xl opacity-30 group-hover:opacity-60 group-hover:blur-3xl transition-all duration-1000 group-hover:duration-200 animate-gradient-xy"></div>

                {/* Borda Animada (Conic Gradient Giratório) */}
                <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] animate-[spin_4s_linear_infinite] rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Moldura Principal com Formato Moderno */}
                <div className="absolute inset-1 rounded-[1.8rem] bg-[#020203] overflow-hidden border border-white/10 transition-all duration-500 group-hover:scale-[1.02] group-hover:border-[#00f3ff]/50 z-10 shadow-2xl">
                  <div className="relative w-full h-full bg-transparent">
                    <Image
                      src="/Eu.jpeg"
                      alt="Gabriel Dias"
                      fill
                      className="object-cover object-top transition-transform duration-700 group-hover:scale-110"
                      priority
                      quality={100}
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />

                    {/* Overlay Gradiente Subtil na Foto Trazendo Profundidade */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020203] via-black/20 to-transparent opacity-60 group-hover:opacity-20 transition-opacity duration-500"></div>
                  </div>
                </div>

                {/* Elementos flutuantes hiper-modernos */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-[#00f3ff] to-transparent rounded-full blur-xl opacity-40 mix-blend-screen animate-pulse z-20 pointer-events-none"></div>
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-tr from-[#7b2cbf] to-transparent rounded-full blur-2xl opacity-30 mix-blend-screen animate-[pulse_4s_ease-in-out_infinite] z-20 pointer-events-none"></div>

                {/* Ícone ou detalhe flutuante estilizado */}
                <div className="absolute bottom-6 -right-4 bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-30 transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-6 group-hover:border-[#00f3ff]/50">
                  <Code2 className="w-8 h-8 text-[#00f3ff]" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
};
