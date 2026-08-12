import { describe, expect, it } from "vitest";
import { alvoDoArremesso } from "./Carrossel";

/** O passo do carrossel da trajetória no largo: card de 425 + gap de 148. */
const PASSO = 573;
const CARDS = 5;

describe("pouso do arremesso", () => {
  /**
   * A propriedade que a função existe para ter, e a que o teste de ponteiro não
   * consegue provar sem virar refém do relógio: **um gesto curto e rápido passa
   * um card**. 130 é menos de um quarto de 573: pelo encaixe mais próximo o
   * trilho volta para a origem, e o arremesso deixa de existir.
   */
  it("um gesto curto e rápido passa um card", () => {
    expect(alvoDoArremesso(130, 1.8, PASSO, CARDS)).toBe(1);
    // O mesmo deslocamento, devagar, fica onde está.
    expect(alvoDoArremesso(130, 0.1, PASSO, CARDS)).toBe(0);
  });

  /**
   * O que quebrou a versão anterior: com projeção por tempo, uma velocidade
   * absurda pulava dois ou três cards. Aqui o pouso depende do **sinal**, então
   * 1,8 e 40 px/ms dão o mesmo card: a carga da máquina deixa de mudar o
   * resultado.
   */
  it("velocidade absurda não pula mais de um card", () => {
    expect(alvoDoArremesso(130, 40, PASSO, CARDS)).toBe(1);
    expect(alvoDoArremesso(130, 1.8, PASSO, CARDS)).toBe(
      alvoDoArremesso(130, 40, PASSO, CARDS),
    );
  });

  it("arrasto lento pousa no encaixe mais próximo", () => {
    expect(alvoDoArremesso(320, 0, PASSO, CARDS)).toBe(1);
    expect(alvoDoArremesso(250, 0, PASSO, CARDS)).toBe(0);
  });

  /**
   * Arremessar para trás **a partir de um encaixe exato** é o caso comum de
   * folhear do repouso. Com `Math.floor` puro o alvo seria o próprio card e o
   * gesto não faria nada.
   */
  it("o arremesso para trás anda para trás, mesmo parado no encaixe", () => {
    expect(alvoDoArremesso(PASSO * 2, -1.8, PASSO, CARDS)).toBe(1);
    expect(alvoDoArremesso(PASSO * 1.4, -1.8, PASSO, CARDS)).toBe(1);
  });

  /**
   * Sem a trava, um arremesso na última borda devolve um índice fora da lista:
   * o ponto ativo some e o card que está na tela deixa de ser o ativo.
   */
  it("trava nas duas pontas", () => {
    expect(alvoDoArremesso(PASSO * 4, 9, PASSO, CARDS)).toBe(CARDS - 1);
    expect(alvoDoArremesso(0, -9, PASSO, CARDS)).toBe(0);
  });

  // O trilho pode ser medido antes de ter filho com caixa; dividir por zero ali
  // devolveria `NaN` e o `scrollTo` iria para o começo sem avisar.
  it("passo zero não vira NaN", () => {
    expect(alvoDoArremesso(500, 2, 0, CARDS)).toBe(0);
  });
});
