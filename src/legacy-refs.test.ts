import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PORT-20: `DynamicTechBackground.tsx` foi deletado e não pode voltar, nem o
 * arquivo, nem um import órfão apontando para ele.
 *
 * A varredura é do fonte em disco, não `git grep`: um arquivo recriado e ainda
 * não versionado referencia o símbolo do mesmo jeito e precisa falhar igual.
 */
const ROOTS = ["src", "e2e"];
/**
 * A config de raiz entra no escopo porque o AC não qualifica diretório, e
 * porque já aconteceu neste repositório: `e6963f2` existe justamente porque o
 * `next.config.ts` importava de `src/data/`. Varredura rasa (só a raiz, sem
 * recursão) para não entrar em `node_modules/` nem `.next/`.
 */
const ROOT_CONFIG = "raiz";
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"]);
/** Este arquivo cita o símbolo por definição: varrer a si mesmo seria circular. */
const SELF = path.basename(import.meta.url);
const SYMBOL = "DynamicTechBackground";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (entry.name === SELF) return [];
    return EXTENSIONS.has(path.extname(entry.name)) ? [full] : [];
  });
}

/** Só os arquivos soltos na raiz: `next.config.ts`, `eslint.config.mjs`, etc. */
function rootConfigFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    !entry.isDirectory() && EXTENSIONS.has(path.extname(entry.name))
      ? [path.join(dir, entry.name)]
      : [],
  );
}

describe("limpeza do background legado (PORT-20)", () => {
  const root = process.cwd();
  const files = [
    ...ROOTS.flatMap((dir) => sourceFiles(path.join(root, dir))),
    ...rootConfigFiles(root),
  ].map((file) => path.relative(root, file));

  // Sem este piso, um ROOTS quebrado varreria zero arquivo e a asserção
  // seguinte passaria sem ter olhado nada.
  it("a varredura enxerga o código-fonte do projeto", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  // Piso próprio da varredura de raiz: sem ele, uma renomeação futura tiraria a
  // config do escopo em silêncio e a contagem acima continuaria passando só com
  // o `src/`.
  it(`a varredura alcança a config de ${ROOT_CONFIG}`, () => {
    expect(files).toContain("next.config.ts");
  });

  it("nenhum arquivo referencia DynamicTechBackground", () => {
    const hits = files.filter(
      (file) =>
        file.includes(SYMBOL) ||
        readFileSync(path.join(root, file), "utf8").includes(SYMBOL),
    );

    expect(hits).toEqual([]);
  });
});
