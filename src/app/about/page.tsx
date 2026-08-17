"use client";

import {
  Award,
  Briefcase,
  Code,
  Database,
  GraduationCap,
  MonitorSmartphone,
  Server,
  type LucideIcon,
} from "lucide-react";
import {
  journeyExperiences,
  type JourneyIconName,
} from "@/data/journey";
import {
  portfolioSkills,
  resolveSkill,
  type SkillCategoryId,
} from "@/data/skills";
import { useTranslations } from "@/hooks/useTranslations";
import { Hero } from "@/components/sections/Hero";
import { useStore } from "@/store";

/**
 * O dado guarda só o nome do ícone (T15). A resolução para elemento é
 * responsabilidade desta camada: é aqui que o lucide-react é conhecido.
 */
const JOURNEY_ICONS: Record<JourneyIconName, LucideIcon> = {
  code: Code,
  work: Briefcase,
  award: Award,
  education: GraduationCap,
};

const SKILL_ICONS: Record<SkillCategoryId, LucideIcon> = {
  frontend: MonitorSmartphone,
  backend: Server,
  infrastructure: Database,
  formacao: GraduationCap,
};

/**
 * O molde da rota, fechado em 2026-08-11: **rail de categoria à
 * esquerda** (quadrado âmbar, rótulo em mono caps e uma régua vertical que
 * atravessa o grupo inteiro) e, à direita, linhas separadas por filete.
 *
 * A linha podia ser um `<button>` que abre no lugar e esconde tudo atrás de um
 * `+`. Aqui a descrição fica **visível** (decisão do Gabriel): jornada e habilidades
 * são curtas, e esconder atrás de um acordeão custa leitura sem ganhar nada.
 * A página abriria com sete títulos e mais nada.
 *
 * A régua é `border-l` do rail e não `border-r` da coluna de linhas: com a
 * segunda, um grupo de uma linha só desenharia o filete inteiro da coluna.
 *
 * **O rail é estreito (22rem) e o conteúdo fica com o resto.** Dar ~45% da
 * coluna ao rail só funciona quando ele carrega um rótulo e o vazio é o
 * desenho; aqui as linhas trazem período, cargo, empresa e descrição, e com a
 * mesma proporção o texto era espremido em meia largura enquanto metade da
 * página ficava vazia.
 */
function Grupo({
  rotulo,
  marca,
  children,
}: {
  rotulo: React.ReactNode;
  /** Gancho de teste: o grupo deixou de ser um `<li>` e precisa de identidade. */
  marca?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-grupo={marca}
      className="grid gap-24 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-50"
    >
      {/*
        `pt-16` casa a linha de base do rótulo com a do **primeiro item**: a
        linha tem `border-t` e `py-16`, então o texto dela começa 16px abaixo do
        topo da célula. Sem isso o rótulo flutuava acima da lista.

        E sem `sticky`: com ele o rótulo descolava da primeira linha assim que a
        página rolava, que é exatamente o desalinhamento que aparecia na tela.
      */}
      <div className="flex md:self-start md:border-l md:border-line md:pt-16 md:pl-16">
        {rotulo}
      </div>
      {/* A lista chega pronta do chamador: jornada é `<ol>` (a ordem carrega
          significado) e habilidade é `<ul>`. Embrulhar em `<div>` aqui tirava
          a semântica das duas. */}
      {children}
    </div>
  );
}

/** O rótulo do rail: quadrado âmbar e mono caps. */
function RotuloDoRail({
  children,
  id,
  nivel = "h3",
}: {
  children: React.ReactNode;
  id?: string;
  nivel?: "h2" | "h3";
}) {
  const Tag = nivel;
  return (
    /**
     * `items-center`, não `items-start` com `mt-4` na bolinha: o rótulo é de
     * uma linha em três dos quatro grupos, e o deslocamento manual deixava
     * quadrado, ícone e texto em três alturas diferentes. Centrar alinha os
     * três pelo eixo.
     */
    <Tag id={id} className="flex items-center gap-12 type-eyebrow text-ink">
      <span aria-hidden className="size-8 shrink-0 bg-accent" />
      {children}
    </Tag>
  );
}

export default function SobrePage() {
  const t = useTranslations();
  // Habilidade que é prosa vem em par de idiomas; substantivo próprio vem como
  // string. `resolveSkill` decide qual, e precisa do idioma ativo.
  const locale = useStore((state) => state.locale);

  return (
    /**
     * Mesma estrutura da home e da `/projects` (AD-014): o wrapper só carrega o
     * vão entre blocos, e a calha vem de `.w-calc` em cada um.
     *
     * O `<h1>Sobre</h1>` que abria a rota saiu: quem é o `<h1>` agora é a
     * headline do hero, e o "Sobre" virou o rótulo dele.
     */
    <main className="relative z-200 flex flex-col gap-100 md:gap-200">
      <Hero rotulo={t.rotas.sobre.rotulo} frases={t.rotas.sobre.frases} />

      <section aria-labelledby="jornada" className="w-calc">
        <Grupo
          rotulo={
            <RotuloDoRail id="jornada" nivel="h2">
              {t.journey.title}
              {t.journey.highlight}
            </RotuloDoRail>
          }
        >
          <ol className="flex flex-col border-b border-line">
          {/* Ordem do array, sem sort: `journeyExperiences` pareia ícone por
              posição com `locales.journey.experiences`, que já vem do mais
              recente para o mais antigo. Reordenar aqui dessincroniza os dois. */}
          {t.journey.experiences.map((experience, index) => {
            const meta = journeyExperiences[index];
            const Icon = JOURNEY_ICONS[meta.iconName];
            return (
              <li
                key={`${experience.cargo}-${experience.periodo}`}
                className="flex flex-col gap-8 border-t border-line py-24"
              >
                <p
                  data-periodo
                  className="flex items-center gap-12 type-sub uppercase text-ink/55"
                >
                  {/*
                    `text-accent`, não um hex por entrada vindo do dado: o
                    acento é um só para marca gráfica. O ícone é
                    `aria-hidden` e sem texto, então vale o acento cheio.
                  */}
                  <Icon aria-hidden className="size-12 shrink-0 text-accent" />
                  {experience.periodo}
                </p>
                <h3 className="type-m-20 md:type-m-24 text-ink">
                  {experience.cargo}
                </h3>
                <p className="type-m-16 text-ink/55">
                  {experience.empresa}
                </p>
                <p className="max-w-[58ch] type-m-16 leading-relaxed text-ink/55">
                  {experience.desc}
                </p>
              </li>
            );
          })}
          </ol>
        </Grupo>
      </section>

      <section
        aria-labelledby="habilidades"
        className="w-calc flex flex-col gap-50 md:gap-100"
      >
        <header className="flex flex-col gap-32">
          <RotuloDoRail id="habilidades" nivel="h2">
            {t.skills.title}
            {t.skills.highlight}
          </RotuloDoRail>
          <p className="max-w-655 type-m-16 leading-relaxed text-ink/55">
            {t.skills.description}
          </p>
        </header>

        {/* Uma categoria por grupo: cada rail nomeia um grupo e as linhas
            são os itens dele. */}
        {portfolioSkills.map((category, index) => {
          const Icon = SKILL_ICONS[category.id];
          return (
            <Grupo
              key={category.id}
              marca={category.id}
              rotulo={
                <RotuloDoRail>
                  <Icon aria-hidden className="size-12 shrink-0 text-accent" />
                  {t.skills.categories[index].title}
                </RotuloDoRail>
              }
            >
              {/*
                Grade, não uma linha por item: a linha de largura cheia só se
                justifica quando ela **expande** numa bio inteira.
                Habilidade é uma palavra. Empilhada, gerava 28 faixas vazias e
                uma página sem fim. Em duas ou três colunas o filete continua
                sendo o molde e a densidade volta ao que o conteúdo pede.
              */}
              <ul className="grid border-b border-line sm:grid-cols-2 xl:grid-cols-3">
                {category.skills.map((skill) => {
                  const nome = resolveSkill(skill, locale);
                  return (
                    <li
                      key={nome}
                      className="group relative border-t border-line py-16 type-m-16 text-ink"
                    >
                      {/*
                        O filete de cima acende em âmbar e **varre** da esquerda
                        para a direita. É o mesmo filete do molde, não uma barra
                        nova: fica em `-top-px` porque a caixa de posicionamento
                        começa depois da borda, e sem o −1px a varredura corria
                        um pixel abaixo da linha que ela deveria acender.
                      */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 -top-px h-px origin-left scale-x-0 bg-accent transition-transform duration-300 ease-snappy group-hover:scale-x-100 motion-reduce:transition-none"
                      />
                      {/* O filete de baixo é o de cima da célula seguinte (e,
                          na última fileira, o `border-b` da `<ul>`): acender os
                          dois em sentidos opostos fecha a célula em vez de
                          sublinhar o item de cima, que era o que uma linha só
                          parecia fazer.

                          `z-10` é o que faz esta acender em **toda** célula.
                          Toda `<li>` é `relative`, logo posicionada, e elemento
                          posicionado pinta na ordem do DOM: a borda da célula
                          seguinte cobria esta faixa. Só a última fileira
                          escapava — abaixo dela não há irmã, só o `border-b` da
                          `<ul>` — e o resultado era a incoerência relatada, com
                          umas células acendendo dos dois lados e outras só em
                          cima. */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-px origin-right scale-x-0 bg-accent transition-transform duration-300 ease-snappy group-hover:scale-x-100 motion-reduce:transition-none"
                      />
                      {/* O quadrado âmbar é o mesmo do rótulo do rail (`size-8
                          bg-accent`), aqui em ponto menor: ele abre no lugar
                          onde o nome estava e o nome desliza para dar espaço,
                          então o item ganha marcador sem reflow nenhum. */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute left-0 top-1/2 size-6 -translate-y-1/2 scale-0 bg-accent opacity-0 transition-[transform,opacity] duration-300 ease-snappy group-hover:scale-100 group-hover:opacity-100 motion-reduce:transition-none"
                      />
                      <span className="block transition-transform duration-300 ease-snappy group-hover:translate-x-16 motion-reduce:transition-none">
                        {nome}
                      </span>
                    </li>
                  );
                })}
                {/*
                  A última fileira quase nunca fecha — sete habilidades em três
                  colunas deixam duas células vazias — e sem célula não há
                  `border-t`: o filete que separa a penúltima da última fileira
                  morria no meio da grade (era o defeito relatado). Estas células
                  vazias existem só para carregar esse filete, e o número delas
                  muda com a contagem de colunas de cada breakpoint.
                */}
                {Array.from(
                  {
                    length: Math.max(
                      category.skills.length % 2,
                      (3 - (category.skills.length % 3)) % 3,
                    ),
                  },
                  (_, i) => (
                    <li
                      key={`vazio-${i}`}
                      aria-hidden
                      className={`hidden border-t border-line ${
                        i < category.skills.length % 2 ? "sm:block" : "sm:hidden"
                      } ${
                        i < (3 - (category.skills.length % 3)) % 3
                          ? "xl:block"
                          : "xl:hidden"
                      }`}
                    />
                  ),
                )}
              </ul>
            </Grupo>
          );
        })}
      </section>
    </main>
  );
}
