export interface Palavra {
  texto: string;
  destacada: boolean;
}

/**
 * Separa uma frase em palavras, marcando as que estão entre asteriscos.
 *
 * A marcação vive no dicionário (`"Sócio em *duas empresas*"`) em vez de HTML
 * porque o texto continua legível para quem traduz e não abre porta para markup
 * arbitrário vindo de dado.
 *
 * O trecho marcado pode ter **mais de uma palavra**. Testar `startsWith("*")` e
 * `endsWith("*")` palavra a palavra não dá conta disso: em `"*Gabriel Dias*"`,
 * `"*Gabriel"` e `"Dias*"` falham num dos lados cada, nenhuma é considerada
 * destacada, e os asteriscos aparecem na tela. Daí isolar os trechos marcados
 * **antes** de quebrar em palavras.
 */
export function separarPalavras(frase: string): Palavra[] {
  return frase
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .flatMap((trecho) => {
      const destacada = trecho.startsWith("*") && trecho.endsWith("*");
      const cru = destacada ? trecho.slice(1, -1) : trecho;
      return cru
        .split(" ")
        .filter(Boolean)
        .map((texto) => ({ texto, destacada }));
    });
}

/** A frase como o leitor a lê: sem os marcadores de destaque. */
export function semMarcacao(frase: string): string {
  return frase.replaceAll("*", "");
}
