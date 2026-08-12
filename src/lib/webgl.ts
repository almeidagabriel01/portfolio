/**
 * Detecta suporte a WebGL antes de montar o Canvas (PORT-04). Sem isso, um
 * dispositivo sem WebGL lançaria dentro da árvore do R3F.
 *
 * Pura de propósito: sem memo de módulo, para que o resultado reflita o
 * ambiente no momento da chamada.
 */
export function isWebGLAvailable(): boolean {
  // Servidor: não existe document, e o Canvas só monta no cliente.
  if (typeof document === "undefined") return false;

  const canvas = document.createElement("canvas");
  try {
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
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
