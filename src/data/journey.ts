/**
 * Dado puro: nenhum JSX, nenhum import da biblioteca de ícones. O nome do ícone
 * é resolvido em elemento pela camada de UI (`/sobre`), que é quem conhece o
 * lucide-react. O texto de cada experiência vive em `locales.journey.experiences`
 * e é pareado por posição.
 */
export type JourneyIconName = "code" | "work" | "award" | "education";

/**
 * Sem campo de cor. A v1 guardava um hex por entrada (`#00f3ff`, `#7b2cbf`,
 * `#3b82f6`) e `/sobre` o aplicava inline, passando por fora dos tokens, numa
 * paleta que a v4 não tem. O sistema usa **um** azul para marca
 * gráfica, e quem decide isso é a folha de estilo, não o dado.
 */
export interface JourneyEntry {
  iconName: JourneyIconName;
}

/**
 * Sete entradas desde a correção C5: o estágio no INATEL era um só na tela e
 * são **dois**, PDI (ago 2022–jan 2023) e ND (fev–mar 2023), além do DWDM.
 */
export const journeyExperiences: JourneyEntry[] = [
  { iconName: "code" },
  { iconName: "work" },
  { iconName: "work" },
  { iconName: "work" },
  { iconName: "work" },
  { iconName: "award" },
  { iconName: "education" },
];
