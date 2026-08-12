import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { portfolioProjects, type Project } from "@/data/projects";
import { outrosCases, OutrosCases } from "./OutrosCases";

// O link daqui é o `LinkDeRota`, que abre a view transition por dentro do
// `onNavigate`. Ele lê router e rota, e fora de uma árvore do App Router os
// dois lançam. O que este arquivo mede é a **lista** (quais cases aparecem),
// então o roteador entra como talvez o menor stub possível.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/projetos/barbalog",
}));

function projeto(slug: string, comCase: boolean): Project {
  return {
    slug,
    nome: slug,
    link: "https://exemplo.invalid/",
    grupo: comCase ? "cliente" : "estudo",
    ...(comCase ? { entreguePor: "SoftCode" as const } : {}),
    descricao: { pt: `descrição de ${slug}`, en: `description of ${slug}` },
    ...(comCase
      ? {
          case: {
            contexto: { pt: "", en: "" },
            papel: { pt: "", en: "" },
            stack: [],
            destaques: { pt: [], en: [] },
          },
        }
      : {}),
  };
}

afterEach(cleanup);

describe("outrosCases (SEC-14)", () => {
  it("exclui o projeto atual e mantém os outros com case", () => {
    expect(
      outrosCases(portfolioProjects, "barbalog").map((project) => project.slug),
    ).toEqual(["alura-space", "store-flow", "ola-mundo", "softcode", "lyftconnect", "proops"]);
  });

  // Sem `case` a rota devolve 404: linkar para lá seria pior que não linkar.
  it("exclui projeto sem case, mesmo não sendo o atual", () => {
    const saida = outrosCases(
      [projeto("com-case", true), projeto("sem-case", false)],
      "outro",
    );

    expect(saida.map((project) => project.slug)).toEqual(["com-case"]);
  });

  it("sendo o único com case, não sobra nenhum outro", () => {
    expect(
      outrosCases([projeto("unico", true), projeto("estudo", false)], "unico"),
    ).toEqual([]);
  });
});

/**
 * O SEC-14 tem duas metades e a segunda não é observável no dado real: os três
 * projetos com case existem, então a rota nunca chega ao caso do projeto único.
 * Só a renderização com um dado construído prova que a seção **some** em vez de
 * renderizar título com lista vazia.
 */
describe("<OutrosCases /> (SEC-14)", () => {
  it("lista os outros cases, sem o atual", () => {
    render(<OutrosCases projects={portfolioProjects} slugAtual="barbalog" />);

    expect(
      screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent),
    ).toEqual(["Alura Space", "Store Flow", "Olá Mundo", "SoftCode", "LyftConnect", "ProOps"]);
    expect(screen.queryByText("Barbalog")).toBeNull();
  });

  it("sendo o único com case, a seção inteira é omitida", () => {
    const { container } = render(
      <OutrosCases
        projects={[projeto("unico", true), projeto("estudo", false)]}
        slugAtual="unico"
      />,
    );

    // Nem seção, nem título solto, nem lista vazia: nada.
    expect(container.innerHTML).toBe("");
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
