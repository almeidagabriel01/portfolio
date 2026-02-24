"use client";

import React from "react";
import { Github, Linkedin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-white/5 bg-[#020203]/80 backdrop-blur-2xl relative z-10">
      <div className="container mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <p className="text-gray-500 text-sm flex items-center gap-2">
          <span className="text-[#00f3ff] font-mono font-black">&lt;/&gt;</span>{" "}
          © {new Date().getFullYear()} Gabriel Almeida Dias.
        </p>
        <div className="flex gap-6">
          <a
            href="https://github.com/almeidagabriel01"
            target="_blank"
            rel="noreferrer"
            className="text-gray-500 hover:text-white hover:scale-125 transition-all"
          >
            <Github className="w-6 h-6" />
          </a>
          <a
            href="https://www.linkedin.com/in/gabrielalmeidadias/"
            target="_blank"
            rel="noreferrer"
            className="text-gray-500 hover:text-[#00f3ff] hover:scale-125 transition-all"
          >
            <Linkedin className="w-6 h-6" />
          </a>
        </div>
      </div>
    </footer>
  );
};
