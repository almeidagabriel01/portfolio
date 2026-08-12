"use client";

import { Contato } from "@/components/sections/Contato";
import { Empresas } from "@/components/sections/Empresas";
import { Entregas } from "@/components/sections/Entregas";
import { Formacao } from "@/components/sections/Formacao";
import { Hero } from "@/components/sections/Hero";
import { Trajetoria } from "@/components/sections/Trajetoria";

/**
 * A home.
 *
 * **A coluna não mora aqui.** O molde empilha seções de largura total e
 * põe a calha em cada bloco interno, por `.w-calc`. Um `max-w` no wrapper (que
 * era o que havia aqui) impede toda seção de sangrar, e três delas precisam:
 * o trilho do carrossel vaza para as bordas, a abordagem tem `px` próprio e o
 * rodapé abre com uma régua de ponta a ponta.
 *
 * O que sobra no wrapper é o `.page`: o vão entre blocos
 * (100px, 200px em `md`) e nada mais. Sem `pb`: a última seção é o contato, que
 * é o molde de rodapé e vai até a borda inferior.
 *
 * **A ordem é a**, não a narrativa: portfolio → quotes →
 * abordagem → stories → rodapé. Cada molde na posição para a qual foi
 * desenhado, que é o que dá o mesmo ritmo vertical à página.
 *
 * Client component por causa do `locale` do store, o que não impede o SSR: o
 * Next renderiza client components no servidor, então o texto chega no HTML e
 * continua legível sem JS.
 */
export default function HomePage() {
  return (
    <main className="relative z-200 flex flex-col gap-100 md:gap-200">
      <Hero />
      <Entregas />
      <Trajetoria />
      <Empresas />
      <Formacao />
      <Contato />
    </main>
  );
}
