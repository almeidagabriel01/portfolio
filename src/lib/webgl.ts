/**
 * Detecta suporte a WebGL2 antes de montar o canvas (PORT-04).
 *
 * **WebGL2 e não WebGL1**, e a diferença deixou de ser cosmética: o campo
 * desenha em WebGL2 direto (`campo.webgl.ts` — VAO, `RGBA16F` no rastro), e num
 * aparelho que só tem WebGL1 o renderizador devolve `null`. Aceitar WebGL1 aqui
 * montaria um `<canvas>` que nunca pinta, em vez de não montar canvas nenhum.
 *
 * Pura de propósito: sem memo de módulo, para que o resultado reflita o
 * ambiente no momento da chamada.
 */
export function isWebGLAvailable(): boolean {
  // Servidor: não existe document, e o Canvas só monta no cliente.
  if (typeof document === "undefined") return false;

  const canvas = document.createElement("canvas");
  try {
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;

    // O browser limita contextos WebGL simultâneos, então descarta o de teste
    // em vez de deixá-lo vivo até o GC.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    // Alguns browsers lançam em vez de devolver null quando o GL está bloqueado.
    return false;
  }
}
