import { Layout, Server, Database } from "lucide-react";

export const getPortfolioSkills = () => [
  {
    id: "frontend",
    icon: <Layout className="w-8 h-8" />,
    colorHex: "#00f3ff",
    skills: [
      "React.js",
      "Next.js",
      "React Native",
      "TypeScript",
      "Tailwind CSS",
    ],
  },
  {
    id: "backend",
    icon: <Server className="w-8 h-8" />,
    colorHex: "#7b2cbf",
    skills: ["Node.js", "Nest.js", "PHP/Laravel", "Java", "Python", "Rest API"],
  },
  {
    id: "infrastructure",
    icon: <Database className="w-8 h-8" />,
    colorHex: "#3b82f6",
    skills: ["MySQL", "PostgreSQL", "Docker", "Linux", "Clean Arch", "CI/CD"],
  },
];
