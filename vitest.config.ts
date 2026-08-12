import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    // O Node 26 define um `localStorage` global próprio (Web Storage
    // experimental). Ele fica indisponível sem `--localstorage-file` e ocupa o
    // slot antes de o ambiente jsdom publicar o dele, então `localStorage` resolvia
    // para `undefined` e o `beforeEach` de `store/index.test.ts` e
    // `useTranslations.test.tsx` lançava, derrubando 20 testes sem relação com
    // storage. Desligado o global do Node, o do jsdom volta a valer.
    //
    // Em `execArgv` e não em `NODE_OPTIONS` no script do npm: a flag precisa
    // chegar ao worker que instala os globais, e prefixo de env em npm script
    // não funciona no cmd do Windows. No vitest 4 `execArgv` é opção de topo
    // de `test`, não de `poolOptions.forks`: lá ela é aceita e ignorada.
    execArgv: ["--no-experimental-webstorage"],
    // Só testes unitários co-locados no src. As specs do Playwright vivem em e2e/.
    include: ["src/**/*.test.{ts,tsx}"],
    // `passWithNoTests` fica no default (`false`) de propósito: com ele ligado,
    // um `include` quebrado devolve exit 0 sem ter executado teste nenhum, e o
    // gate unitário vira decoração. Mesmo piso que o gate e2e ganhou ao perder
    // o `--pass-with-no-tests`.
    restoreMocks: true,
  },
});
