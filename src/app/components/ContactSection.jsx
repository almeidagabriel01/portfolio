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

    // Verificar se o endpoint está configurado
    const endpoint = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT;
    if (!endpoint) {
      // Fallback: abrir cliente de email
      const formData = new FormData(formRef.current);
      const name = formData.get('name');
      const email = formData.get('email');
      const message = formData.get('message');
      
      const subject = `Mensagem do Portfolio - ${name}`;
      const body = `Nome: ${name}%0D%0AEmail: ${email}%0D%0A%0D%0AMensagem:%0D%0A${message}`;
      const mailtoLink = `mailto:gabriel.dias01@outlook.com.br?subject=${encodeURIComponent(subject)}&body=${body}`;
      
      window.open(mailtoLink, '_blank');
      setStatus('📧 Abrindo seu cliente de email... Se não abriu, copie: gabriel.dias01@outlook.com.br');
      return;
    }

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
      const res = await fetch(endpoint, {
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
      console.error('Erro ao enviar:', err);
      setStatus('❌ Erro ao enviar mensagem. Tente novamente mais tarde.');
    }
  };

  return (
    <section
      className="container mx-auto px-6 py-20"
      id="contact"
    >
      <motion.div 
        className="bg-slate-800/50 rounded-3xl p-8 shadow-2xl backdrop-blur-lg"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h2
          className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          Vamos Conversar
        </motion.h2>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto space-y-8"
        >
          {/* Nome */}
          <motion.div 
            whileHover={{ scale: 1.01 }} 
            whileFocus={{ scale: 1.02 }}
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <motion.span 
              className="absolute left-4 top-4 text-slate-400"
              whileHover={{ scale: 1.1, color: "#a855f7" }}
              transition={{ duration: 0.2 }}
            >
              <FiUser />
            </motion.span>
            <input
              name="name"
              type="text"
              placeholder="Nome"
              required
              className="w-full bg-slate-700/50 border border-slate-600 
                         rounded-xl p-4 pl-10 focus:outline-none focus:ring-2 
                         focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 
                         transition-all duration-300 hover:border-purple-400"
            />
          </motion.div>

          {/* Email */}
          <motion.div 
            whileHover={{ scale: 1.01 }} 
            whileFocus={{ scale: 1.02 }}
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <motion.span 
              className="absolute left-4 top-4 text-slate-400"
              whileHover={{ scale: 1.1, color: "#3b82f6" }}
              transition={{ duration: 0.2 }}
            >
              <FiMail />
            </motion.span>
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="w-full bg-slate-700/50 border border-slate-600 
                         rounded-xl p-4 pl-10 focus:outline-none focus:ring-2 
                         focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 
                         transition-all duration-300 hover:border-purple-400"
            />
          </motion.div>

          {/* Mensagem */}
          <motion.div 
            whileHover={{ scale: 1.01 }} 
            whileFocus={{ scale: 1.02 }}
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <motion.span 
              className="absolute left-4 top-4 text-slate-400"
              whileHover={{ scale: 1.1, color: "#10b981" }}
              transition={{ duration: 0.2 }}
            >
              <FiMessageSquare />
            </motion.span>
            <textarea
              name="message"
              rows="5"
              placeholder="Mensagem"
              required
              className="w-full bg-slate-700/50 border border-slate-600 
                         rounded-xl p-4 pl-10 focus:outline-none focus:ring-2 
                         focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 
                         transition-all duration-300 hover:border-purple-400 resize-none"
            />
          </motion.div>

          {/* campo para tema do email (opcional) */}
          <input type="hidden" name="_subject" value="Nova mensagem do site" />

          {/* Botão Enviar */}
          <motion.button
            type="submit"
            className={`w-full px-8 py-4 rounded-xl font-medium flex items-center 
                       justify-center gap-2 text-white shadow-lg hover:shadow-xl
                       transition-all duration-300 ${
                         status === 'Enviando...' 
                           ? 'bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed' 
                           : 'bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400'
                       }`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            whileHover={status !== 'Enviando...' ? { scale: 1.02, y: -2 } : {}}
            whileTap={status !== 'Enviando...' ? { scale: 0.98 } : {}}
            disabled={status === 'Enviando...'}
          >
            {status === 'Enviando...' ? (
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Enviando...</span>
              </motion.div>
            ) : (
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <span>Enviar Mensagem</span>
                <motion.div
                  whileHover={{ x: 3, y: -3 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiArrowUpRight className="text-xl" />
                </motion.div>
              </motion.div>
            )}
          </motion.button>
        </form>

        {status && (
          <motion.p 
            className="mt-6 text-center text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {status}
          </motion.p>
        )}
      </motion.div>
    </section>
  );
}