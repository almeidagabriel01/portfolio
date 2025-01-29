'use client';
import { motion } from 'framer-motion';
import { 
  FaReact, FaJava, FaPython, FaDatabase 
} from 'react-icons/fa';
import { 
  SiNextdotjs, SiCplusplus, SiMysql, SiJavascript, 
  SiHtml5, SiCss3, SiTailwindcss 
} from 'react-icons/si';

const techStack = [
  { icon: <SiHtml5 />, name: "HTML5", color: "text-orange-500" },
  { icon: <SiCss3 />, name: "CSS3", color: "text-blue-500" },
  { icon: <SiJavascript />, name: "JavaScript", color: "text-yellow-400" },
  { icon: <FaReact />, name: "React", color: "text-cyan-400" },
  { icon: <SiNextdotjs />, name: "Next.js", color: "text-white" },
  { icon: <SiTailwindcss />, name: "Tailwind", color: "text-sky-400" },
  { icon: <FaJava />, name: "Java", color: "text-red-500" },
  { icon: <SiCplusplus />, name: "C++", color: "text-blue-400" },
  { icon: <FaPython />, name: "Python", color: "text-emerald-400" },
  { icon: <FaDatabase />, name: "MySQL", color: "text-blue-300" },
];

export default function TechSection() {
  return (
    <section className="container mx-auto px-6 py-20" id="tech">
      <div className="bg-slate-800/50 rounded-3xl p-8 shadow-2xl backdrop-blur-lg">
        <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Stack Tecnológico
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {techStack.map((tech, index) => (
            <motion.div
              key={index}
              className="group p-6 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer relative overflow-hidden"
              whileHover={{ scale: 1.05 }}
              data-aos="zoom-in"
            >
              <div className={`text-6xl mb-4 ${tech.color} transition-colors`}>
                {tech.icon}
              </div>
              <h3 className="text-lg font-medium">{tech.name}</h3>
              <div className="absolute inset-0 border border-slate-600 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}