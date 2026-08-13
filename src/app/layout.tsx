import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { TransicaoDeRota } from "@/components/providers/TransicaoDeRota";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

// A Geist Sans saiu na v5. O site roda **duas** famílias, não três: uma
// grotesca de display que também é o corpo, e uma mono para rótulo/botão.
// Manter uma terceira família só para o corpo diluía o contraste display↔mono
// que é metade da identidade, e custava um webfont a mais.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Switzer (Fontshare, ITF Free Font License: licença em src/fonts/). Arquivo
// variável único cobrindo wght 100–900, self-hosted: zero request externo.
//
// Substitui a Clash Display, escolhida na v2 por uma suposição errada: ela vai
// a ultra-wide nos pesos pesados, e a captura mostra largura
// normal. A Switzer é a neo-grotesca de largura normal que o registro pede.
const switzer = localFont({
  src: "../fonts/Switzer-Variable.woff2",
  variable: "--font-switzer",
  weight: "100 900",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Gabriel Dias | Portfolio",
  description:
    "Desenvolvedor Full-Stack focado em arquiteturas robustas e interações web inesquecíveis.",
};

// Casa com o fundo do <body>: sem isso a barra de UI do mobile aparece clara
// contra a página preta.
export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // As variáveis do `next/font` moram no <html>, não no <body>: o
    // `@theme` do Tailwind declara `--font-display: var(--font-switzer)`
    // em `:root`, e `var()` é resolvido no elemento onde a propriedade é
    // declarada. Com as variáveis um nível abaixo, `--font-display` computava
    // inválido em `:root` e herdava inválido para a árvore inteira: o site
    // renderizava em `ui-sans-serif` e nenhuma das três fontes carregava.
    // `lang="pt"`: é o idioma do conteúdo que o servidor renderiza (o store
    // nasce em `pt`). O cliente reescreve o atributo quando o locale muda, em
    // `useTranslations`. Fixar `en` aqui fazia o leitor de tela pronunciar
    // português com fonética inglesa para todo visitante no idioma default.
    // `--duration` é o botão global de velocidade, declarado inline no
    // <html>. As view transitions derivam a própria duração dele
    // (`calc(var(--duration) * 2)` → 0.8s).
    <html
      lang="pt"
      className={`${geistMono.variable} ${switzer.variable}`}
      style={{ "--duration": 0.4 } as React.CSSProperties}
    >
      <head>
        {/*
          Sem JS, nada do que o `motion` esconde volta a aparecer.

          Uma animação de entrada declara o estado inicial em `initial`, e o
          React serializa isso como `style="opacity:0;..."` no HTML do servidor.
          Com script, o `useInView` dispara e o elemento aparece. **Sem script,
          o observer nunca roda e o conteúdo fica invisível para sempre**: o
          texto está no DOM (crawler lê), mas o visitante vê um bloco vazio.
          Medido: 25 elementos assim só na seção de trajetória.

          É o modo de falha padrão de animação de entrada por observer: o SSR
          serve `opacity:0;filter:blur(10px);transform:translateY(20px)` e, sem
          JS, nada o desfaz. Este repo decide o contrário: o conteúdo destas
          seções é o produto, e ele fica na tela mesmo sem script.

          O seletor casa o **estilo inline** em vez de exigir uma marcação em
          cada elemento animado: é o próprio `initial` do motion que se anuncia
          ali, então a regra não tem como ficar dessincronizada de quem anima.
          As duas formas cobrem `opacity` no meio e no fim da string; nenhuma
          delas casa `opacity:0.5`, porque as duas ancoram o caractere seguinte.
        */}
        {/*
          `[data-recuado]` cobre o caso que o estilo inline não alcança: o card
          não-corrente do carrossel de trajetória apaga o bloco de texto por
          **classe** (`opacity-0`), como em navegador, e sem JS o carrossel
          nunca sai do primeiro card. Quatro dos cinco marcos ficariam
          invisíveis para sempre. Marcação explícita porque aqui não há
          `initial` do motion para se anunciar sozinho no `style`.
        */}
        {/*
          A terceira parte da regra cobre a entrada da headline, que passou a
          ser declarada em CSS (`entrada-da-palavra`/`entrada-do-titulo`, ver
          `globals.css`) para não ficar à espera da hidratação.

          Uma animação CSS **roda sem script**, ao contrário do `initial` do
          motion, então sem JS a headline entraria normalmente em vez de ficar
          invisível. Só que sem script também não há rotação de frases, e o que
          este `<noscript>` promete é conteúdo **legível de imediato** — é a
          garantia que o `home.spec` cobra com o JS desligado. Desligar a
          animação repõe exatamente o comportamento de hoje: texto no lugar,
          sem entrada.
        */}
        <noscript>
          <style>{`main [style*="opacity:0;"],main [style$="opacity:0"],main [data-recuado]{opacity:1!important;filter:none!important;transform:none!important}main .entrada-da-palavra,main .entrada-do-titulo{animation:none!important}`}</style>
        </noscript>
      </head>
      <body className="antialiased">
        {/*
          A transição de rota mora **aqui**, e não num `template.tsx`.

          O template remonta a cada navegação. Era exatamente o que o véu
          antigo queria, e é o que mata este: o provider guarda, no meio da
          transição, o `resolve` que diz ao browser "pode fotografar a rota
          nova". Remontar no meio destrói esse `resolve` e a view transition
          fica pendurada para sempre.
        */}
        <TransicaoDeRota>
          <SmoothScroll>
            <Header />
          {/*
            `shell` é o gancho do fundo chapado do UI-11 (globals.css). O
            fundo mora aqui, e não no `<main>`, porque `main` tem coluna de
            `max-w-[140.8rem]`: numa tela mais larga que ela sobravam calhas
            laterais por onde o campo de partículas aparecia. Este elemento
            ocupa a largura toda e ainda cobre o rodapé, que fica fora do
            `#conteudo`.
          */}
            <div className="shell relative z-200 flex min-h-screen flex-col">
              <div id="conteudo" className="flex-1">
                {children}
              </div>
              <Footer />
            </div>
          </SmoothScroll>
        </TransicaoDeRota>
      </body>
    </html>
  );
}
