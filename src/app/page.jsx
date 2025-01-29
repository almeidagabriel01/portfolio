'use client';
import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import AOS from 'aos';
import 'aos/dist/aos.css';

import AnimatedBackground from './components/AnimatedBackground';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import TechSection from './components/TechSection';
import ProjectsSection from './components/ProjectsSection';
import ContactSection from './components/ContactSection';

export default function Portfolio() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Framer Motion: progress bar
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    AOS.init({ duration: 1200, once: false });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white font-poppins overflow-hidden">
      
      {/* Background Animado */}
      <AnimatedBackground />

      {/* Barra de progresso de rolagem */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500 z-50" 
        style={{ scaleX }}
      />

      {/* Navbar */}
      <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

      {/* Seções da página */}
      <HeroSection />
      <TechSection />
      <ProjectsSection />
      <ContactSection />
    </div>
  );
}
