'use client';
import { motion } from 'framer-motion';
import { FaGraduationCap } from 'react-icons/fa';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <section
      id="about"
      className="container mx-auto px-6 pt-32 pb-20 text-center relative overflow-hidden bg-transparent"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-4xl mx-auto"
      >
        <div className="mb-8">
          {/* Foto com destaque */}
          <motion.div
            className="relative mx-auto mb-12 max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <div className="relative w-96 h-96 rounded-full overflow-hidden border-4 border-white/10 shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-tl from-purple-600/20 via-transparent to-blue-500/20 mix-blend-overlay z-10" />
              <div className="w-full h-full transform transition-all duration-700 hover:scale-110">
                <Image
                  src="/gabriel.jpg"
                  alt="Foto de Gabriel"
                  width={400}
                  height={400}
                  priority
                  className="object-cover object-center w-full h-full"
                />
              </div>
            </div>
          </motion.div>

          {/* Nome e título */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}>
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-300 to-blue-400 bg-clip-text text-transparent">
              Gabriel Almeida Dias
            </h1>
            <motion.div
              className="h-1 w-0 mx-auto bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mb-6"
              animate={{ width: '180px' }}
              transition={{ delay: 1, duration: 1 }}
            />
            <motion.div
              className="inline-flex items-center gap-4 mb-8 px-6 py-3 rounded-full bg-slate-800/50 border border-slate-700/50 shadow-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              whileHover={{ scale: 1.03 }}
            >
              <FaGraduationCap className="text-2xl text-purple-400" />
              <span className="text-xl text-purple-200">Engenharia de Software - 9º Período</span>
            </motion.div>
          </motion.div>

          <motion.p
            className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            Desenvolvedor apaixonado por criar experiências web modernas e intuitivas,
            combinando design elegante com código de alta performance.
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}