import { describe, expect, it } from "vitest";
import { enUS, ptBR } from "@/locales";
import { portfolioSkills, resolveSkill } from "./skills";

// PORT-16: /sobre renderiza as 3 categorias de skill. Título vem do locale,
// pareado por posição com o dado.
describe("habilidades (PORT-16)", () => {
  it("tem as 4 categorias na ordem esperada", () => {
    expect(portfolioSkills.map((category) => category.id)).toEqual([
      "frontend",
      "backend",
      "infrastructure",
      "formacao",
    ]);
  });

  it.each([
    ["pt", ptBR],
    ["en", enUS],
  ])("a contagem bate com o locale %s", (_locale, dictionary) => {
    expect(dictionary.skills.categories).toHaveLength(portfolioSkills.length);
  });

  // As habilidades que são prosa passaram a ser par de idiomas; as que são
  // substantivo próprio continuam string. A asserção resolve para `pt`, porque a
  // igualdade ordenada e o conteúdo esperado seguem os mesmos.
  it("preserva as listas de tecnologia integralmente", () => {
    expect(
      portfolioSkills.map((category) =>
        category.skills.map((skill) => resolveSkill(skill, "pt")),
      ),
    ).toEqual([
      [
        "JavaScript",
        "TypeScript",
        "React.js",
        "Next.js",
        "React Native",
        "Tailwind CSS",
        "HTML5 & CSS3",
      ],
      [
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
      [
        "MySQL",
        "PostgreSQL",
        "NoSQL",
        "Docker",
        "Linux",
        "Git & GitHub",
        "Arquitetura Hexagonal",
        "Programação Funcional e Orientada a Objetos",
        "Testes E2E & Unitários",
      ],
      [
        "Eng. de Software, INATEL",
        "Inglês avançado",
        "21 certificações e licenças",
      ],
    ]);
  });

  // A paleta da v1 (#00f3ff, #7b2cbf, #3b82f6) morava aqui e era aplicada
  // inline em `/sobre`, por fora dos tokens. Cor não volta para o dado.
  it("nenhuma categoria embute cor", () => {
    expect(JSON.stringify(portfolioSkills)).not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  // "Arquivo de dados vira .ts puro (sem JSX)": elemento React não sobrevive ao
  // round-trip por JSON.
  it("é dado serializável, sem elemento React", () => {
    expect(JSON.parse(JSON.stringify(portfolioSkills))).toEqual(portfolioSkills);
  });
});

/**
 * SEC-15: o que o currículo e o LinkedIn revelaram e a tela não mostrava. Os
 * termos esperados vêm da task (T4), não do array: ler o dado e afirmar o que
 * ele contém provaria só que o array é igual a si mesmo.
 */
describe("habilidades ampliadas (SEC-15)", () => {
  const todas = portfolioSkills.flatMap((category) =>
    category.skills.map((skill) => resolveSkill(skill, "pt")),
  );

  // Piso: um `flatMap` sobre lista vazia faria todo `toContain` abaixo falhar
  // ruidosamente, mas um `some()` mal escrito passaria, e a contagem ancora.
  it("a lista achatada cobre as quatro categorias", () => {
    expect(todas.length).toBeGreaterThan(20);
  });

  it.each([
    "Flask",
    "Salesforce",
    "NoSQL",
    "Programação Funcional e Orientada a Objetos",
  ])("%s está entre as habilidades", (skill) => {
    expect(todas).toContain(skill);
  });

  it("declara inglês avançado", () => {
    expect(todas).toContain("Inglês avançado");
  });

  // A decisão registrada na spec é o **número**, não a lista: 21 linhas de
  // curso enterrariam o resto. Este teste falha dos dois lados: se o número
  // sumir e se alguém expandir em lista.
  it("declara as 21 certificações como número, não como lista", () => {
    const certificacoes = todas.filter((skill) => /certifica/i.test(skill));
    expect(certificacoes).toEqual(["21 certificações e licenças"]);
  });
});

/**
 * O defeito que esta suíte guarda: `skills` guardava só strings soltas, e o
 * `/sobre` em inglês renderizava "Arquitetura Hexagonal" e "Inglês avançado"
 * em português. A guarda de paridade cobre `locales/`, não `data/`, então
 * nada acusava.
 *
 * A regra não é "tudo traduzido": "Docker" e "PostgreSQL" são substantivos
 * próprios e ficam iguais nos dois idiomas. A regra é que **prosa em português
 * não pode ficar como string simples**.
 */
describe("paridade bilíngue das habilidades", () => {
  /** Marcas de prosa em português que jamais aparecem num nome de tecnologia. */
  const MARCAS_PT = /\b(e|de|da|do|com|para|em)\b|ções|ção|ência|Inglês|avançado/i;

  const soltas = portfolioSkills
    .flatMap((category) => category.skills)
    .filter((skill): skill is string => typeof skill === "string");

  // Piso: se o filtro parar de achar strings soltas, o teste abaixo passaria
  // por vacuidade em vez de por correção.
  it("existem habilidades declaradas como string simples", () => {
    expect(soltas.length).toBeGreaterThan(10);
  });

  it("nenhuma string simples contém prosa em português", () => {
    expect(soltas.filter((skill) => MARCAS_PT.test(skill))).toEqual([]);
  });

  it("toda habilidade em par declara os dois idiomas, sem repetir o texto", () => {
    const pares = portfolioSkills
      .flatMap((category) => category.skills)
      .filter((skill) => typeof skill !== "string");

    expect(pares.length).toBeGreaterThan(0);
    for (const par of pares) {
      expect(par.pt.trim()).not.toBe("");
      expect(par.en.trim()).not.toBe("");
      // Par idêntico nos dois idiomas é substantivo próprio disfarçado de
      // tradução: devia ser string simples.
      expect(par.pt).not.toBe(par.en);
    }
  });

  it("resolveSkill devolve o idioma pedido", () => {
    expect(resolveSkill("Docker", "en")).toBe("Docker");
    expect(resolveSkill({ pt: "Inglês avançado", en: "Advanced English" }, "en")).toBe(
      "Advanced English",
    );
  });
});
