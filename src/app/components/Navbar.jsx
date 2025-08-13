'use client';
import { motion } from 'framer-motion';
import { FiMenu, FiX } from 'react-icons/fi';
import { FaGithub, FaLinkedin, FaCode } from 'react-icons/fa';

function NavLink({ children, href, onClick }) {
  const handleClick = (e) => {
    e.preventDefault();
    
    // Animar o scroll até a seção
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    
    if (element) {
      // Fechar menu mobile se estiver aberto
      if (onClick) onClick();
      
      // Animação suave personalizada
      const startPosition = window.pageYOffset;
      const targetPosition = element.offsetTop - 80; // Offset para navbar fixa
      const distance = targetPosition - startPosition;
      const duration = 1000; // 1 segundo
      let start = null;
      
      function animation(currentTime) {
        if (start === null) start = currentTime;
        const timeElapsed = currentTime - start;
        const progress = Math.min(timeElapsed / duration, 1);
        
        // Easing função (easeInOutCubic para suavidade)
        const ease = progress < 0.5 
          ? 4 * progress * progress * progress 
          : (progress - 1) * (2 * progress - 2) * (2 * progress - 2) + 1;
        
        window.scrollTo(0, startPosition + distance * ease);
        
        if (timeElapsed < duration) {
          requestAnimationFrame(animation);
        }
      }
      
      requestAnimationFrame(animation);
    }
  };

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      className="px-4 py-2 hover:text-purple-400 transition-colors relative group cursor-pointer"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.span
        initial={{ y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {children}
      </motion.span>
      <motion.span 
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400"
        initial={{ width: 0 }}
        whileHover={{ width: "100%" }}
        transition={{ duration: 0.3 }}
      />
    </motion.a>
  );
}

export default function Navbar({ isMenuOpen, setIsMenuOpen }) {
  const handleMobileMenuClose = () => {
    setIsMenuOpen(false);
  };

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
              whileHover={{ y: -2, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
            >
              <FaGithub className="text-2xl" />
            </motion.a>
            <motion.a
              href="https://www.linkedin.com/in/gabrielalmeidadias/"
              target="_blank"
              whileHover={{ y: -2, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
            >
              <FaLinkedin className="text-2xl" />
            </motion.a>
          </div>
        </div>

        {/* Botão Mobile */}
        <motion.button
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            initial={false}
            animate={{ rotate: isMenuOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {isMenuOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
          </motion.div>
        </motion.button>
      </div>

      {/* Menu Mobile */}
      {isMenuOpen && (
        <motion.div
          className="md:hidden bg-slate-800/95 backdrop-blur-sm border-t border-slate-700"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-6 py-4 flex flex-col space-y-4">
            <NavLink href="#about" onClick={handleMobileMenuClose}>Sobre</NavLink>
            <NavLink href="#tech" onClick={handleMobileMenuClose}>Tecnologias</NavLink>
            <NavLink href="#projects" onClick={handleMobileMenuClose}>Projetos</NavLink>
            <NavLink href="#contact" onClick={handleMobileMenuClose}>Contato</NavLink>
            <div className="flex space-x-4 justify-center pt-4">
              <motion.a
                href="https://github.com/almeidagabriel01"
                target="_blank"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaGithub className="text-2xl hover:text-purple-400 transition-colors" />
              </motion.a>
              <motion.a
                href="https://www.linkedin.com/in/gabrielalmeidadias/"
                target="_blank"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaLinkedin className="text-2xl hover:text-blue-400 transition-colors" />
              </motion.a>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
}