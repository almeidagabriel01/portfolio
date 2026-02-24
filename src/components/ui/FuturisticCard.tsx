import React from "react";
import { MagicTag } from "./MagicTag";

interface FuturisticCardProps {
  title: string;
  icon: React.ReactNode;
  colorHex: string;
  skills: string[];
}

export const FuturisticCard = ({
  title,
  icon,
  colorHex,
  skills,
}: FuturisticCardProps) => {
  return (
    <div className="relative w-full rounded-3xl p-[1px] group overflow-hidden bg-black/50">
      {/* Borda Animada Giratória (Border Beam) */}
      <div
        className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] opacity-60 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          backgroundImage: `conic-gradient(from 90deg at 50% 50%, transparent 0%, transparent 70%, ${colorHex} 100%)`,
        }}
      />

      {/* Container Principal do Card */}
      <div className="relative h-full w-full rounded-[23px] bg-[#0a0a0c]/95 backdrop-blur-xl p-8 flex flex-col items-center z-10 transition-transform duration-500 group-hover:scale-[0.98]">
        {/* Fundo de malha sutil para textura (Aceternity feel) */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-20"></div>

        {/* Efeito Glow central no topo do card */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-opacity-20 blur-[50px] rounded-full pointer-events-none"
          style={{ backgroundColor: colorHex }}
        ></div>

        <div className="relative z-10 flex flex-col items-center text-center w-full">
          <div
            className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-2"
            style={{
              backgroundColor: `${colorHex}10`,
              color: colorHex,
              boxShadow: `0 10px 40px ${colorHex}40`,
              border: `1px solid ${colorHex}30`,
            }}
          >
            {icon}
          </div>
          <h3 className="mb-8 text-3xl font-bold text-white tracking-tight">
            {title}
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {skills.map((skill) => (
              <MagicTag key={skill} text={skill} colorHex={colorHex} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
