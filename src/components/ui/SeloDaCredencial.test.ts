import { describe, expect, it } from "vitest";
import { TOTAL_DE_SELOS } from "./SeloDaCredencial";

/**
 * O pareamento selo↔cartão é **posicional**, e a `Formacao` monta três cartões
 * a partir de fontes diferentes (dois lidos da jornada, um escrito à mão).
 * Acrescentar um quarto sem desenhar o símbolo devolve `null` e o cartão sai com
 * um vão de 450px onde deveria estar o painel, que é o defeito que aquele
 * arquivo existe para resolver, e nenhum teste de conteúdo o vê.
 */
describe("selos da formação", () => {
  it("existe um selo por cartão de credencial", () => {
    expect(TOTAL_DE_SELOS).toBe(3);
  });
});
