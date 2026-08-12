/**
 * Dado puro: nenhum JSX, nenhum import da biblioteca de ícones. O `id` é a
 * chave semântica que a camada de UI (`/sobre`) usa para escolher o ícone. O
 * título de cada categoria vive em `locales.skills.categories`, pareado por
 * posição.
 */
export type SkillCategoryId =
  | "frontend"
  | "backend"
  | "infrastructure"
  /**
   * Inglês e certificações não são front, back nem infra, e enfiá-los numa
   * dessas três seria classificar errado para não criar categoria. O currículo
   * os lista em seções próprias (Idiomas, Educação) e aqui também.
   */
  | "formacao";

type Locale = "pt" | "en";

/**
 * Uma habilidade é uma string simples **ou** um par de idiomas.
 *
 * A maioria é substantivo próprio ("Docker", "PostgreSQL", "Next.js") e se
 * escreve igual nos dois idiomas; obrigá-las a `{ pt: "Docker", en: "Docker" }`
 * seria ruído puro. Mas as entradas que são prosa ("Arquitetura Hexagonal",
 * "Inglês avançado") precisam de tradução: sem isso o `/sobre` em inglês
 * renderiza português, que foi exatamente o defeito encontrado aqui.
 */
export type SkillName = string | Record<Locale, string>;

export const resolveSkill = (skill: SkillName, locale: Locale): string =>
  typeof skill === "string" ? skill : skill[locale];

/**
 * Sem campo de cor. A v1 guardava um hex por categoria (`#00f3ff`, `#7b2cbf`)
 * e `/sobre` o aplicava inline, por fora dos tokens, numa paleta que a v4 não tem.
 * Cor de marca gráfica é decisão da folha de estilo, não do dado.
 */
export interface SkillCategory {
  id: SkillCategoryId;
  skills: SkillName[];
}

export const portfolioSkills: SkillCategory[] = [
  {
    id: "frontend",
    skills: [
      "JavaScript",
      "TypeScript",
      "React.js",
      "Next.js",
      "React Native",
      "Tailwind CSS",
      "HTML5 & CSS3",
    ],
  },
  {
    id: "backend",
    skills: [
      "Node.js",
      "Nest.js",
      "PHP/Laravel",
      "Python",
      "Flask",
      "Java",
      "C++",
      "REST APIs & Swagger",
      "Salesforce",
    ],
  },
  {
    id: "infrastructure",
    skills: [
      "MySQL",
      "PostgreSQL",
      "NoSQL",
      "Docker",
      "Linux",
      "Git & GitHub",
      { pt: "Arquitetura Hexagonal", en: "Hexagonal Architecture" },
      {
        pt: "Programação Funcional e Orientada a Objetos",
        en: "Functional and Object-Oriented Programming",
      },
      { pt: "Testes E2E & Unitários", en: "E2E & Unit Testing" },
    ],
  },
  {
    id: "formacao",
    // "21 certificações" é o número, não a lista: 21 linhas de curso enterram
    // o resto da página (decisão registrada na spec).
    skills: [
      { pt: "Eng. de Software, INATEL", en: "Software Engineering, INATEL" },
      { pt: "Inglês avançado", en: "Advanced English" },
      {
        pt: "21 certificações e licenças",
        en: "21 certifications and licenses",
      },
    ],
  },
];
