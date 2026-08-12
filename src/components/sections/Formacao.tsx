"use client";

import { TituloDistribuido } from "@/components/motion/TituloDistribuido";
import { Botao, SetaDireita } from "@/components/ui/Botao";
import { Carrossel } from "@/components/ui/Carrossel";
import { SeloDaCredencial } from "@/components/ui/SeloDaCredencial";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTranslations } from "@/hooks/useTranslations";

/**
 * SEC-01 e SEC-09 trazem o diploma, o prêmio, o inglês e as certificações, no
 * molde do bloco "stories": título distribuído, três cartões
 * estreitos num grid de três colunas e um botão de "ver mais" centralizado
 * embaixo.
 *
 * O que dá o caráter do bloco é o **deslocamento diagonal**: o cartão é mais
 * estreito que a coluna (`max-w-345` numa célula de ~427px) e cada um encosta
 * num lado diferente da sua célula: `3n+1` à esquerda, `3n+2` no centro, `3n`
 * à direita. É por isso que os cartões não podem esticar: um `max-w` maior que
 * a coluna zera a folga e a fileira volta a ser três blocos alinhados.
 *
 * O diploma e o prêmio são **lidos da jornada** (índices em
 * `journey.experiences`, que é reverse-cronológica) pelo mesmo motivo da
 * trajetória: dois textos para o mesmo fato divergem na primeira correção.
 *
 *   6 → Bacharelado Eng. de Software, INATEL (Santa Rita do Sapucaí)
 *   5 → Werk, Prêmio Municipal de Inovações
 *
 * O inglês e a contagem de certificações não são emprego nem formação superior,
 * não estão na jornada, e por isso são os únicos textos próprios da seção.
 * Dividem o terceiro cartão: são as duas credenciais que nasceram junto do
 * curso, e separá-las em cartões próprios daria quatro numa fileira de três.
 *
 * **Sem animação de cartão, de propósito.** No bloco o cartão não
 * tem um único elemento `motion`: nem entrada, nem hover. Todo o movimento da
 * seção é a abertura do título (FLIP de layout, 0,6s `IN_OUT_CUBIC`, dentro do
 * `TituloDistribuido`).
 */
const DIPLOMA = 6;
const PREMIO = 5;

interface Credencial {
  titulo: string;
  /** Emissor, à esquerda da linha em mono. Ausente quando não há fonte. */
  tag?: string;
  /** Período, à direita da mesma linha. */
  data?: string;
  desc: string;
}

/** Um cartão pode carregar mais de uma credencial: ver o terceiro. */
type Cartao = Credencial[];

export function Formacao() {
  const t = useTranslations();

  /**
   * O carrossel só existe em tela estreita, e é **montado** por consulta de
   * mídia em vez de escondido por `md:hidden`. Escondido, ele continuaria vivo:
   * mediria o primeiro slide com largura 0, calcularia um passo errado e ainda
   * duplicaria cada `<li>` e cada `<h3>` da seção na árvore de acessibilidade.
   *
   * `true` no servidor porque o grid é o layout que sobrevive sem JS, e ele
   * já cai para uma coluna em tela estreita, então ninguém fica sem conteúdo.
   */
  const amplo = useMediaQuery("(min-width: 768px)", true);

  const daJornada = (index: number): Credencial => {
    const experiencia = t.journey.experiences[index];
    return {
      titulo: experiencia.cargo,
      tag: experiencia.empresa,
      data: experiencia.periodo,
      desc: experiencia.desc,
    };
  };

  /**
   * A ordem é a do done-when do spec (diploma, inglês, certificações, prêmio)
   * e não a que caía mais natural em três cartões. O `<h3>` de cada credencial
   * é lido nessa sequência pela auditoria de conteúdo.
   */
  const cartoes: Cartao[] = [
    [daJornada(DIPLOMA)],
    [
      // `meta` ("Five · Jan 2026") é emissor e data numa string só, então entra
      // inteira do lado do emissor em vez de ser fatiada por um separador que
      // o dicionário não promete manter.
      {
        titulo: t.education.english.titulo,
        tag: t.education.english.meta,
        desc: t.education.english.desc,
      },
      // Sem `tag` nem `data`: o número de credenciais tem fonte, o emissor e a
      // data de cada uma não têm. Campo vazio vira rótulo solto na tela, o
      // mesmo defeito que o SEC-18 nomeia nas entregas.
      t.education.certifications,
    ],
    [daJornada(PREMIO)],
  ];

  return (
    /**
     * O molde *stories*, medido em 1440×900 (topo 6069, altura 1265,5).
     *
     * A raiz é um `div` com **filete no topo** e `py-100 md:py-150`: é o
     * único bloco da home com borda, e é ela que separa a lista do que vem
     * antes sem precisar de vão. A coluna vive num `.w-calc` interno (AD-014),
     * não na seção.
     *
     * Sem parágrafo de descrição e sem `<hr>`: o cabeçalho é só o título
     * distribuído. Mesma decisão da `Trajetoria`.
     */
    <section
      aria-labelledby="formacao"
      className="relative flex w-full flex-col gap-50 border-t border-ink/20 py-100 md:py-150"
    >
      <div className="w-calc flex flex-col gap-50 md:gap-100">
        <TituloDistribuido id="formacao" rotulo={t.education.label}>
          {`${t.education.title}*${t.education.highlight}*`}
        </TituloDistribuido>

        {/* `gap-100` entre a lista e a fileira de botões. */}
        {amplo ? (
          <div className="flex w-full flex-col gap-100">
            <ul className="grid grid-cols-1 gap-32 md:grid-cols-3">
              {/*
                O deslocamento diagonal vem de **margem automática por índice**,
                não de `justify-self` + largura fixa. `justify-self` só desloca
                item mais estreito que a célula, o que obrigava a fixar `w-345`.
                Só que a célula vale `(vw − calhas − gaps) / 3`: 208px a 768px e
                293px a 1024px. Os três cartões de 345px transbordavam e se
                sobrepunham de 768px até ~1179px, em silêncio, porque
                `html { overflow-x: hidden }` come a barra e o Playwright só roda
                a 1280px. Com `max-w` + margem automática o cartão encolhe junto
                com a coluna e o deslocamento continua.
              */}
              {cartoes.map((cartao, indice) => (
                <li key={cartao[0].titulo} className="w-full">
                  <CartaoDeCredencial
                    credenciais={cartao}
                    indice={indice}
                    // A margem tem de morar no elemento que **é** mais estreito
                    // que a célula. Com ela no `<li>`, que é `w-full`, não sobra
                    // folga para consumir e as três colunas saem alinhadas à
                    // esquerda: medido, x = 50 / 508 / 963 contra 50 / 547,5 /
                    // 1045. Nada quebra, e o gesto some.
                    className={["md:mr-auto", "md:mx-auto", "md:ml-auto"][indice % 3]}
                  />
                </li>
              ))}
            </ul>

            <div className="flex-center gap-16">
              <Botao href="/sobre" icone={<SetaDireita />}>
                {t.header.about}
              </Botao>
            </div>
          </div>
        ) : null}
      </div>

      {/*
        O trilho estreito é **irmão da coluna**, não filho dela, e é
        o que deixa ele sangrar até as bordas da viewport com o mesmo
        `padding-inline` do carrossel de quotes. Dentro do `.w-calc` o cartão
        ficava com a largura da coluna e o gesto de "tem mais ao lado" sumia.
      */}
      {amplo ? null : (
        <Carrossel
          className="flex w-full flex-col gap-50"
          classeDoTrilho="gap-32 px-[calc((100vw-26.5rem)*0.5)] scroll-px-[calc((100vw-26.5rem)*0.5)]"
          classeDoItem="w-265 shrink-0 snap-center"
          classeDosPontos=""
          itens={cartoes}
          chave={(cartao) => cartao[0].titulo}
          renderizar={(cartao, indice) => (
            <CartaoDeCredencial credenciais={cartao} indice={indice} />
          )}
          rotulo={t.education.label}
          rotuloDosPontos={`${t.education.title}${t.education.highlight}`}
        />
      )}

      {amplo ? null : (
        <div className="flex-center gap-16">
          <Botao href="/sobre" icone={<SetaDireita />}>
            {t.header.about}
          </Botao>
        </div>
      )}
    </section>
  );
}

function CartaoDeCredencial({
  credenciais,
  indice,
  className = "",
}: {
  credenciais: Cartao;
  indice: number;
  className?: string;
}) {
  return (
    <article className={`flex max-w-345 flex-col gap-32 ${className}`}>
      {/*
        O painel que em navegador é a foto da matéria (450px de altura contra
        137 de texto, 77% do cartão). Credencial não tem foto: aqui ele é um selo
        próprio (ver `SeloDaCredencial`), na mesma linguagem de traço dos glifos
        da trajetória e com textura diferente, para as duas seções não lerem
        como a mesma coisa.
      */}
      <div className="h-350 w-full md:h-450">
        <SeloDaCredencial indice={indice} />
      </div>

      <div className="flex flex-col gap-24 md:gap-32">
      {credenciais.map((credencial) => (
        <div key={credencial.titulo} className="flex flex-col gap-16">
          {credencial.tag ? (
            <p className="flex items-center justify-between gap-16 type-eyebrow text-ink/55">
              <span className="flex items-center gap-12">
                {/* O quadrado âmbar é o marcador de categoria:
                    decoração, sem texto, então vai no acento cheio. */}
                <span aria-hidden className="size-8 shrink-0 bg-accent" />
                {credencial.tag}
              </span>
              {credencial.data ? (
                <span className="text-right">{credencial.data}</span>
              ) : null}
            </p>
          ) : null}

          {/*
            `type-m-24` fixo, e não o `type-m-20 md:type-m-24`.

            O motivo original era contraste: a primeira palavra sai no acento, e
            o azul da v4 dava 3,74:1, que só cabia no piso de 3:1 do texto
            grande (≥24px). A 20px o cartão reprovava o AA em tela estreita.

            **Com a paleta âmbar esse motivo caiu**: #ff5a1f sobre preto dá
            6,73:1 e passa o piso de 4,5:1 em qualquer tamanho. O tamanho fixo
            fica porque mudá-lo agora é decisão de composição, não de acesso, e
            ninguém mediu se lê melhor a 20px aqui.
          */}
          <h3 className="type-m-24 text-ink">
            <PrimeiraPalavraEmAzul>{credencial.titulo}</PrimeiraPalavraEmAzul>
          </h3>

          <p className="type-m-16 text-ink/55">{credencial.desc}</p>
        </div>
      ))}
      </div>
    </article>
  );
}

/**
 * O `<span>` âmbar do título de cartão.
 *
 * O acento poderia ser um campo próprio; aqui é a primeira palavra, que é o
 * sujeito da credencial em todas elas: "Werk", "Bacharelado", "21".
 *
 * O espaço fica **fora** do span e no mesmo nó de texto do resto: o
 * `textContent` do `<h3>` precisa continuar igual ao título cru, palavra por
 * palavra, porque é dele que sai o nome do cabeçalho para o leitor de tela.
 */
function PrimeiraPalavraEmAzul({ children }: { children: string }) {
  const [primeira, ...resto] = children.split(" ");
  return (
    <>
      <span className="text-accent">{primeira}</span>
      {resto.length > 0 ? ` ${resto.join(" ")}` : null}
    </>
  );
}
