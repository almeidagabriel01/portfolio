import { describe, expect, it } from "vitest";
import { enUS, ptBR } from "@/locales";
import { journeyExperiences } from "./journey";

// PORT-16: /sobre renderiza as 6 experiências da jornada. O dado é pareado por
// posição com o texto do locale: contagem diferente renderiza experiência sem
// texto (ou texto sem ícone) silenciosamente.
describe("jornada (PORT-16)", () => {
  // C5 acrescentou a separação PDI/ND: eram 6 entradas, são 7.
  it("tem as 7 experiências", () => {
    expect(journeyExperiences).toHaveLength(7);
  });

  it.each([
    ["pt", ptBR],
    ["en", enUS],
  ])("a contagem bate com o locale %s", (_locale, dictionary) => {
    expect(dictionary.journey.experiences).toHaveLength(
      journeyExperiences.length,
    );
  });

  it("toda entrada tem ícone e cor, pareada com o texto dos dois idiomas", () => {
    for (const dictionary of [ptBR, enUS]) {
      for (const experience of dictionary.journey.experiences) {
        for (const campo of [
          experience.cargo,
          experience.empresa,
          experience.periodo,
          experience.desc,
        ]) {
          expect(campo.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("toda entrada tem nome de ícone conhecido e nenhuma cor embutida", () => {
    for (const entry of journeyExperiences) {
      expect(["code", "work", "award", "education"]).toContain(entry.iconName);
    }

    // A paleta da v1 (#00f3ff, #7b2cbf, #3b82f6) morava aqui e era aplicada
    // inline em `/sobre`, por fora dos tokens. Cor não volta para o dado.
    expect(JSON.stringify(journeyExperiences)).not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  // "Arquivo de dados vira .ts puro (sem JSX)": um elemento React não sobrevive
  // ao round-trip por JSON, porque carrega símbolos e funções. Se alguém devolver JSX
  // para o arquivo de dados, esta asserção cai.
  it("é dado serializável, sem elemento React", () => {
    expect(JSON.parse(JSON.stringify(journeyExperiences))).toEqual(
      journeyExperiences,
    );
  });
});

/**
 * As correções que o LinkedIn e o currículo provaram necessárias. Os valores
 * esperados vêm da tabela de correções da spec, não do dicionário: comparar o
 * dado consigo mesmo passaria por construção.
 */
describe("correções da jornada (SEC-08, SEC-09)", () => {
  const pt = ptBR.journey.experiences;
  const en = enUS.journey.experiences;

  // C4: a data estava em "Mar 2025" e o cargo não dizia o nível.
  it("VS Telecom começa em abril de 2025, no cargo júnior", () => {
    expect(pt[0].empresa).toBe("VS Telecom");
    expect(pt[0].periodo).toBe("Abr 2025 - Presente");
    expect(pt[0].cargo).toContain("Júnior");
    expect(en[0].periodo).toBe("Apr 2025 - Present");
    expect(en[0].cargo).toContain("Junior");
  });

  it("o estágio na VS Telecom cobre mar 2023 a mar 2025", () => {
    expect(pt[1].periodo).toBe("Mar 2023 - Mar 2025");
    expect(en[1].periodo).toBe("Mar 2023 - Mar 2025");
  });

  // C5: o INATEL aparecia como um estágio só. São dois (PDI e ND) além do
  // DWDM, que é o terceiro.
  it("o INATEL aparece como ND e PDI, com os períodos distintos", () => {
    expect(pt[2].empresa).toBe("INATEL");
    expect(pt[2].cargo).toContain("ND");
    expect(pt[2].periodo).toBe("Fev 2023 - Mar 2023");

    expect(pt[3].empresa).toBe("INATEL");
    expect(pt[3].cargo).toContain("PDI");
    expect(pt[3].periodo).toBe("Ago 2022 - Jan 2023");

    expect(en[2].periodo).toBe("Feb 2023 - Mar 2023");
    expect(en[3].periodo).toBe("Aug 2022 - Jan 2023");
  });

  it("o ND cita Salesforce e o webscraping em Python, nos dois idiomas", () => {
    expect(pt[2].desc).toContain("Salesforce");
    expect(pt[2].desc).toContain("Python");
    expect(pt[2].desc).toContain("Excel");
    expect(en[2].desc).toContain("Salesforce");
    expect(en[2].desc).toContain("Python");
    expect(en[2].desc).toContain("Excel");
  });

  // Fato novo do LinkedIn que não estava na tela.
  it("o DWDM cita o dimensionamento dos canais da fibra", () => {
    expect(pt[4].periodo).toBe("Out 2021 - Jul 2022");
    expect(pt[4].desc).toContain("Dimensionamento dos canais da fibra");
    expect(en[4].desc).toContain("Fibre channel dimensioning");
  });

  // C3: o prêmio não nomeava o projeto nem o papel.
  it("o prêmio nomeia o Werk e o papel de front-end (SEC-09)", () => {
    expect(pt[5].cargo).toContain("Werk");
    expect(pt[5].desc).toContain("Werk");
    expect(pt[5].desc).toContain("front-end");
    expect(en[5].cargo).toContain("Werk");
    expect(en[5].desc).toContain("front-end");
  });

  // AC da v2 que a inserção de uma entrada nova poderia quebrar sem ninguém
  // ver: a lista é cronológica reversa. Medida no ano, não no rótulo.
  it("mantém a ordem cronológica reversa nos dois idiomas", () => {
    for (const experiences of [pt, en]) {
      const anos = experiences.map((experience) =>
        Number(experience.periodo.match(/\d{4}/)?.[0]),
      );
      expect(anos).toHaveLength(7);
      expect(anos.every(Number.isFinite)).toBe(true);
      expect([...anos].sort((a, b) => b - a)).toEqual(anos);
    }
  });
});
