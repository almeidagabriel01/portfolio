import { describe, expect, it } from "vitest";
import { MARCOS_DA_JORNADA } from "@/components/sections/Trajetoria";
import { TOTAL_DE_GLIFOS } from "./GlifoDoMarco";

/**
 * O pareamento glifo↔marco é **posicional**, e posição é exatamente o tipo de
 * acoplamento que se perde em silêncio: acrescentar um sexto marco à seção sem
 * desenhar o glifo dele devolve `null` do `GlifoDoMarco`, e o card sai com o
 * campo bonito e sem assunto nenhum, que é o defeito que aquele arquivo existe
 * para resolver. Nenhum outro teste vê isso, porque o texto do marco chega
 * inteiro à tela.
 */
describe("glifos da trajetória", () => {
  it("existe um glifo por marco, incluindo o desfecho", () => {
    // Os quatro lidos da jornada mais as empresas próprias, que não são emprego
    // e por isso não estão em `journey.experiences`.
    expect(TOTAL_DE_GLIFOS).toBe(MARCOS_DA_JORNADA.length + 1);
  });
});
