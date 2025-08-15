'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiExternalLink, FiMaximize2 } from 'react-icons/fi';
import { FaRegWindowMaximize } from 'react-icons/fa';

const projects = [
  {
    title: "StoreFlow",
    description: "E-commerce completo com React + TypeScript consumindo FakeStore API, carrinho dinâmico e checkout multi-etapas com validação",
    link: "https://store-flow-pink.vercel.app/",
    tech: ["React", "TypeScript", "Tailwind CSS", "React Hook Form", "Zod", "Context API"],
    iframe: "https://store-flow-pink.vercel.app/"
  },
  {
    title: "AluraBooks",
    description: "Plataforma de e-commerce para livros técnicos com sistema de filtros avançado",
    link: "https://projects-alpha-silk.vercel.app/",
    tech: ["React", "Styled Components", "State Management"],
    iframe: "https://projects-alpha-silk.vercel.app/"
  },
  {
    title: "AluraSpace",
    description: "Galeria de imagens espaciais com sistema de tags e busca dinâmica",
    link: "https://alura-space-ecru.vercel.app/",
    tech: ["React", "CSS Modules"],
    iframe: "https://alura-space-ecru.vercel.app/"
  },
  {
    title: "AluraOlaMundo",
    description: "Plataforma estilo blogs com posts informativos",
    link: "https://alura-ola-mundo.vercel.app/",
    tech: ["React", "React Router"],
    iframe: "https://alura-ola-mundo.vercel.app/"
  },
  {
    title: "AluraFeira",
    description: "E-commerce completo com carrinho de compras e checkout integrado",
    link: "https://alura-feira-two.vercel.app/",
    tech: ["React", "Context API", "Styled Components"],
    iframe: "https://alura-feira-two.vercel.app/"
  }
];

export default function ProjectsSection() {
  const [activeProject, setActiveProject] = useState(null);

  return (
    <section className="container mx-auto px-6 py-20" id="projects">
      <motion.h2 
        className="text-5xl font-bold mb-16 text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 0.8 }}
      >
        Experiência Interativa
      </motion.h2>

      <div className="space-y-24">
        {projects.map((project, index) => (
          <motion.div 
            key={index}
            className="group relative bg-slate-800 rounded-3xl overflow-hidden shadow-2xl hover:shadow-purple-900/30 transition-shadow"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ delay: index * 0.2, duration: 0.8 }}
            onViewportEnter={() => setActiveProject(index)}
          >
            <div className="flex flex-col lg:flex-row h-[700px] lg:h-[600px]">
              
              {/* Área do iFrame */}
              <div className="lg:w-2/3 h-full relative border-r border-slate-700">
                {/* Controles do navegador falso */}
                <div className="absolute top-0 left-0 right-0 h-12 bg-slate-900 flex items-center px-4 space-x-2 z-30">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 ml-4 bg-slate-800 rounded-lg px-4 py-1 text-sm text-slate-400 flex items-center">
                    <FiExternalLink className="mr-2" />
                    {project.link}
                  </div>
                </div>
                
                {/* Container scroll do iFrame */}
                <div className="mt-12 h-[calc(100%-3rem)] overflow-auto">
                  <iframe
                    src={project.iframe}
                    className="w-full h-full border-0"
                    scrolling="yes"
                    loading="lazy"
                    allow="fullscreen"
                    allowFullScreen
                    sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"
                  />
                </div>
              </div>

              {/* Painel lateral de informações */}
              <div className="lg:w-1/3 p-8 flex flex-col justify-between bg-gradient-to-b from-slate-800 to-slate-900">
                <div>
                  <motion.h3 
                    className="text-3xl font-bold mb-4"
                    whileHover={{ x: 5 }}
                  >
                    {project.title}
                  </motion.h3>
                  <p className="text-gray-400 mb-6 leading-relaxed">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.tech.map((tech, i) => (
                      <motion.span
                        key={i}
                        className="px-3 py-1 bg-slate-700 rounded-full text-sm flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                      >
                        <FaRegWindowMaximize className="text-purple-400 animate-pulse" />
                        {tech}
                      </motion.span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <motion.a
                    href={project.link}
                    target="_blank"
                    className="inline-flex items-center justify-center gap-3 px-6 py-4 
                               bg-gradient-to-r from-purple-600 to-blue-600 
                               hover:from-purple-500 hover:to-blue-500 
                               rounded-xl font-semibold text-white transition-all group"
                    whileHover={{ scale: 1.03 }}
                  >
                    <span>Abrir em Nova Janela</span>
                    <FiMaximize2 className="text-xl transform group-hover:scale-125 transition-transform" />
                  </motion.a>

                  <div className="flex items-center justify-between text-slate-400 text-sm">
                    <span>Scroll Habilitado</span>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                      <span>Online</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}