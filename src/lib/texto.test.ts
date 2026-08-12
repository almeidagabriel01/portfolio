import { describe, expect, it } from "vitest";
import { separarPalavras } from "@/lib/texto";

describe("separarPalavras", () => {
  it("quebra em palavras quando não há marcação", () => {
    expect(separarPalavras("Eu sou Gabriel")).toEqual([
      { texto: "Eu", destacada: false },
      { texto: "sou", destacada: false },
      { texto: "Gabriel", destacada: false },
    ]);
  });

  it("destaca uma palavra marcada", () => {
    expect(separarPalavras("software que *dura*")).toEqual([
      { texto: "software", destacada: false },
      { texto: "que", destacada: false },
      { texto: "dura", destacada: true },
    ]);
  });

  /**
   * A regressão que motivou a função. Testar `startsWith("*")` e
   * `endsWith("*")` palavra a palavra reprova aqui: `"*Gabriel"` e `"Dias*"`
   * falham num dos lados cada, nenhuma é considerada destacada, e os
   * asteriscos aparecem na tela.
   */
  it("destaca um trecho de várias palavras", () => {
    expect(separarPalavras("Eu sou *Gabriel Dias*")).toEqual([
      { texto: "Eu", destacada: false },
      { texto: "sou", destacada: false },
      { texto: "Gabriel", destacada: true },
      { texto: "Dias", destacada: true },
    ]);
  });

  it("nunca deixa asterisco no texto renderizado", () => {
    const frases = [
      "Eu sou *Gabriel Dias*",
      "*Tudo* destacado",
      "nada destacado",
      "*a* meio *b* meio *c*",
    ];
    for (const frase of frases) {
      for (const { texto } of separarPalavras(frase)) {
        expect(texto).not.toContain("*");
      }
    }
  });

  it("descarta espaço duplicado em vez de emitir palavra vazia", () => {
    expect(separarPalavras("  dois   espaços  ")).toEqual([
      { texto: "dois", destacada: false },
      { texto: "espaços", destacada: false },
    ]);
  });

  it("preserva a ordem original entre trechos marcados e não marcados", () => {
    expect(separarPalavras("a *b c* d").map((p) => p.texto)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });
});
