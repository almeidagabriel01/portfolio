'use client';
import { motion } from 'framer-motion';
import { FaGraduationCap } from 'react-icons/fa';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <section className="container mx-auto px-6 pt-32 pb-20 text-center relative" id="about">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10"
      >
        <div className="mb-8">
          <motion.div
            className="relative w-32 h-32 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mb-6 overflow-hidden border-4 border-slate-800 shadow-2xl"
            whileHover={{ scale: 1.05 }}
          >
            <Image
              src="/gabriel.jpg"
              alt="Foto de Gabriel"
              fill
              className="object-cover"
              priority
            />
          </motion.div>
          <h1
            className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
            data-aos="fade-up"
          >
            Gabriel Almeida Dias
          </h1>
          <div
            className="flex items-center justify-center gap-4 mb-8"
            data-aos="fade-up"
          >
            <FaGraduationCap className="text-purple-400" />
            <span className="text-xl text-purple-300">Engenharia de Software - 9º Período</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}