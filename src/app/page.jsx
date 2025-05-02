'use client';
import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import TechSection from './components/TechSection';
import ProjectsSection from './components/ProjectsSection';
import ContactSection from './components/ContactSection';
import ParticlesBackground from './components/ParticlesBackground';

const initAOS = async () => {
  const AOS = (await import('aos')).default;
  await import('aos/dist/aos.css');
  AOS.init({ duration: 1000, once: false, offset: 100, delay: 0, throttleDelay: 99 });
};

export default function Portfolio() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    if (!isLoaded) {
      initAOS();
      setIsLoaded(true);
    }
    return () => window.AOS?.refresh();
  }, [isLoaded]);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-poppins overflow-hidden relative">
      {/* Fundo de partículas aplicado à toda a página */}
      <ParticlesBackground />

      {/* Barra de progresso de rolagem */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500 z-50"
        style={{ scaleX }}
      />

      {/* Navbar */}
      <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

      {/* Seções */}
      <HeroSection />
      <TechSection />
      <ProjectsSection />
      <ContactSection />
    </div>
  );
}