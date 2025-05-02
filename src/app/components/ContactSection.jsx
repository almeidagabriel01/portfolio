'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiArrowUpRight, FiUser, FiMail, FiMessageSquare } from 'react-icons/fi';

export default function ContactSection() {
  const formRef = useRef(null);
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');

    // validação e-mail
    const formData = new FormData(formRef.current);
    const email = (formData.get('email') || '').toString().trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setStatus('❌ Por favor, insira um e-mail válido.');
      return;
    }

    setStatus('Enviando...');
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });

      if (res.ok) {
        setStatus('✅ Mensagem enviada com sucesso!');
        formRef.current.reset();
      } else {
        setStatus('❌ Falha ao enviar. Tente novamente.');
      }
    } catch (err) {
      console.error(err);
      setStatus('❌ Erro ao enviar mensagem.');
    }
  };

  return (
    <section
      className="container mx-auto px-6 py-20"
      id="contact"
      data-aos="fade-up"
    >
      <div className="bg-slate-800/50 rounded-3xl p-8 shadow-2xl backdrop-blur-lg">
        <h2
          className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
          data-aos="fade-up"
        >
          Vamos Conversar
        </h2>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto space-y-8"
        >
          {/* Nome */}
          <motion.div whileHover={{ scale: 1.01 }} className="relative">
            <span className="absolute left-4 top-4 text-slate-400">
              <FiUser />
            </span>
            <input
              name="name"
              type="text"
              placeholder="Nome"
              required
              className="w-full bg-slate-700/50 border border-slate-600 
                         rounded-xl p-4 pl-10 focus:outline-none focus:ring-2 
                         focus:ring-purple-500 placeholder-slate-400 transition-all"
            />
          </motion.div>

          {/* Email */}
          <motion.div whileHover={{ scale: 1.01 }} className="relative">
            <span className="absolute left-4 top-4 text-slate-400">
              <FiMail />
            </span>
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="w-full bg-slate-700/50 border border-slate-600 
                         rounded-xl p-4 pl-10 focus:outline-none focus:ring-2 
                         focus:ring-purple-500 placeholder-slate-400 transition-all"
            />
          </motion.div>

          {/* Mensagem */}
          <motion.div whileHover={{ scale: 1.01 }} className="relative">
            <span className="absolute left-4 top-4 text-slate-400">
              <FiMessageSquare />
            </span>
            <textarea
              name="message"
              rows="5"
              placeholder="Mensagem"
              required
              className="w-full bg-slate-700/50 border border-slate-600 
                         rounded-xl p-4 pl-10 focus:outline-none focus:ring-2 
                         focus:ring-purple-500 placeholder-slate-400 transition-all"
            />
          </motion.div>

          {/* campo para tema do email (opcional) */}
          <input type="hidden" name="_subject" value="Nova mensagem do site" />

          {/* Botão Enviar */}
          <motion.button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 
                       px-8 py-4 rounded-xl font-medium hover:from-purple-500 
                       hover:to-blue-400 transition-all flex items-center 
                       justify-center gap-2 text-white"
            whileHover={{ scale: 1.02 }}
          >
            Enviar Mensagem
            <FiArrowUpRight className="text-xl" />
          </motion.button>
        </form>

        {status && (
          <p className="mt-6 text-center text-lg">
            {status}
          </p>
        )}
      </div>
    </section>
  );
}