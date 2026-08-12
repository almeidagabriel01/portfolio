"use client";

import {
  CampoDeBlocos,
  type CampoHandle,
  type OpcoesDoCampo,
} from "./CampoDeBlocos";
import { CanvasDoCampo } from "./CanvasDoCampo";

/**
 * O campo dentro do seu canvas — o par que as três seções da home montavam à
 * mão.
 *
 * Existe como módulo próprio para dar ao `next/dynamic` um alvo: é **daqui**
 * que o three.js pende (`CampoDeBlocos` faz `import * as THREE`), e um módulo
 * separado é o que permite ao bundler pôr esse megabyte num chunk à parte. Ver
 * `Campo.tsx` para o porquê.
 *
 * **O handle vem por prop normal, não por `ref`.** O `next/dynamic` não
 * encaminha `ref` para o componente carregado, e o `Hero` precisa do handle
 * para escrever a escala direto no uniform a cada evento de scroll, sem passar
 * por estado de React (AD-003). Uma prop atravessa a fronteira intacta.
 */
export interface PropsDoCampo {
  opcoes?: OpcoesDoCampo;
  /** Liga o rastro do mouse. Custa dois render targets e um render por frame. */
  usarMouse?: boolean;
  /** Elemento que define o retângulo do efeito, para mapear o ponteiro. */
  alvoDoPonteiro?: React.RefObject<HTMLElement | null>;
  /** O `CampoHandle`, como prop porque `ref` não atravessa o `next/dynamic`. */
  refDoCampo?: React.RefObject<CampoHandle | null>;
}

export function CampoNoCanvas({
  opcoes,
  usarMouse,
  alvoDoPonteiro,
  refDoCampo,
}: PropsDoCampo) {
  return (
    <CanvasDoCampo>
      <CampoDeBlocos
        ref={refDoCampo}
        opcoes={opcoes}
        usarMouse={usarMouse}
        alvoDoPonteiro={alvoDoPonteiro}
      />
    </CanvasDoCampo>
  );
}
