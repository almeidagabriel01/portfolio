import React from "react";

interface MagicTagProps {
  text: string;
  colorHex: string;
}

export const MagicTag = ({ text, colorHex }: MagicTagProps) => (
  <span className="relative inline-flex overflow-hidden rounded-full p-[1px] group transition-transform hover:scale-110">
    <span
      className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite]"
      style={{
        backgroundImage: `conic-gradient(from 90deg at 50% 50%, transparent 0%, transparent 60%, ${colorHex} 100%)`,
      }}
    />
    <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-[#0a0a0c] px-4 py-1.5 text-xs font-medium text-gray-300 backdrop-blur-3xl transition-colors group-hover:text-white group-hover:bg-[#111115]">
      {text}
    </span>
  </span>
);
