"use client";

import React, { useState } from "react";
import { ExternalLink, MousePointer2, TerminalSquare } from "lucide-react";

interface BrowserPreviewProps {
  link: string;
  nome: string;
  tags: string[];
}

export const BrowserPreview = ({ link, nome, tags }: BrowserPreviewProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative rounded-[24px] border border-white/10 bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden group transition-all duration-500 hover:-translate-y-2 hover:border-[#00f3ff]/60 hover:shadow-[0_20px_60px_rgba(0,243,255,0.15)] flex flex-col h-[650px] w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="h-12 bg-[#0a0a0c] border-b border-white/5 flex items-center px-6 relative shrink-0">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 cursor-pointer transition-colors"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-400 cursor-pointer transition-colors"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-400 cursor-pointer transition-colors"></div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#111115] px-4 py-1.5 rounded-full text-xs font-mono text-gray-400 border border-white/5">
          <TerminalSquare className="w-3.5 h-3.5" />{" "}
          {link.replace("https://", "")}
        </div>
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-gray-400 hover:text-[#00f3ff] transition-colors z-20"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="relative w-full flex-grow bg-[#050505]">
        <div
          className={`absolute inset-0 bg-[#050505]/80 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center transition-all duration-500 ${isHovered ? "opacity-0 pointer-events-none scale-105" : "opacity-100 scale-100"}`}
        >
          <div className="p-5 rounded-full bg-[#00f3ff]/10 border border-[#00f3ff]/30 text-[#00f3ff] mb-6 animate-[float_3s_ease-in-out_infinite] shadow-[0_0_30px_rgba(0,243,255,0.3)]">
            <MousePointer2 className="w-8 h-8" />
          </div>
          <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">
            {nome}
          </h3>
          <div className="flex gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1.5 bg-white/10 rounded-full font-mono text-[#00f3ff] border border-[#00f3ff]/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <iframe
          src={link}
          title={nome}
          className="w-full h-full border-none bg-white"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
};
