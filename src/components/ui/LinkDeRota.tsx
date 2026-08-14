"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useNavegacaoComTransicao } from "@/components/providers/TransicaoDeRota";

/**
 * Pares em que a transição de página **fica desligada**. A regra é
 * "o `pathname` começa com o primeiro e o `href` contém o segundo", e o par
 * que cobre o card da home indo para o detalhe do projeto entra aqui: esse
 * não transiciona.
 *
 * O caminho por CSS seria pôr `root-view-transition-disabled` no `<html>`,
 * anulando o `view-transition-name` de root, header e menu. Aqui é mais
 * curto simplesmente não abrir a transição: mesma tela, e sem classe para
 * lembrar de tirar depois.
 */
const SEM_TRANSICAO: ReadonlyArray<readonly [string, string]> = [
  ["/", "/projects/"],
  ["/projects", "/projects"],
];

function desligada(de: string, href: string) {
  return SEM_TRANSICAO.some(
    ([inicio, trecho]) => de.startsWith(inicio) && href.includes(trecho),
  );
}

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * O `next/link` com a view transition em volta.
 *
 * O gancho é o `onNavigate` do Next 16, o único ponto suportado para abortar
 * a navegação do `Link` e refazê-la por dentro de
 * `document.startViewTransition`. Sem ele, a transição começaria depois do
 * commit e fotografaria a página nova como se fosse a antiga.
 */
export function LinkDeRota({ href, onNavigate, scroll, ...resto }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const navegar = useNavegacaoComTransicao();

  return (
    <Link
      href={href}
      scroll={scroll}
      onNavigate={(evento) => {
        onNavigate?.(evento);

        // Âncora dentro da rota corrente (`/#contato`) não é troca de página:
        // interceptar trocaria o scroll do Lenis por um push de rota, e o
        // gesto de subir a página inteira apareceria onde ninguém navegou.
        if ((href.split("#")[0] || pathname) === pathname) return;
        if (desligada(pathname, href)) return;

        evento.preventDefault();
        navegar(() => router.push(href, { scroll }));
      }}
      {...resto}
    />
  );
}
