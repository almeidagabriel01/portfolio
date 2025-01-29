'use client';
import { motion } from 'framer-motion';
import { FiMenu, FiX } from 'react-icons/fi';
import { FaGithub, FaLinkedin, FaCode } from 'react-icons/fa';

function NavLink({ children, href }) {
  return (
    <motion.a
      href={href}
      className="px-4 py-2 hover:text-purple-400 transition-colors relative group"
      whileHover={{ scale: 1.05 }}
    >
      {children}
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-400 transition-all group-hover:w-full" />
    </motion.a>
  );
}

export default function Navbar({ isMenuOpen, setIsMenuOpen }) {
  return (
    <nav className="fixed w-full bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-800">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <motion.a
          href="#"
          className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <FaCode className="text-purple-400" />
          Gabriel Dias
        </motion.a>

        {/* Links Desktop */}
        <div className="hidden md:flex space-x-8 items-center">
          <NavLink href="#about">Sobre</NavLink>
          <NavLink href="#tech">Tecnologias</NavLink>
          <NavLink href="#projects">Projetos</NavLink>
          <NavLink href="#contact">Contato</NavLink>

          <div className="flex space-x-4 ml-4">
            <motion.a
              href="https://github.com/almeidagabriel01"
              target="_blank"
              whileHover={{ y: -2 }}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              <FaGithub className="text-2xl" />
            </motion.a>
            <motion.a
              href="https://www.linkedin.com/in/gabrielalmeidadias/"
              target="_blank"
              whileHover={{ y: -2 }}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              <FaLinkedin className="text-2xl" />
            </motion.a>
          </div>
        </div>

        {/* Botão Mobile */}
        <button
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
        </button>
      </div>

      {/* Menu Mobile */}
      {isMenuOpen && (
        <motion.div
          className="md:hidden bg-slate-800/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="px-6 py-4 flex flex-col space-y-4">
            <NavLink href="#about">Sobre</NavLink>
            <NavLink href="#tech">Tecnologias</NavLink>
            <NavLink href="#projects">Projetos</NavLink>
            <NavLink href="#contact">Contato</NavLink>
            <div className="flex space-x-4 justify-center pt-4">
              <FaGithub className="text-2xl" />
              <FaLinkedin className="text-2xl" />
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
}