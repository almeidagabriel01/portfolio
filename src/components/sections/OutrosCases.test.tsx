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
  usePathname: () => "/projects/barbalog",
}));

/**
 * O parâmetro `comCase` saiu junto com a opcionalidade: `case` é obrigatório em
 * `Project`, então "projeto sem case" deixou de ser um estado construível.
 */
function projeto(slug: string): Project {
  return {
    slug,
    nome: slug,
    link: "https://exemplo.invalid/",
    // As quatro mídias são obrigatórias em `Project`. Seguem a convenção de
    // caminho do dado real; nada aqui as renderiza.
    video: `/projects/${slug}.webm`,
    videoMp4: `/projects/${slug}.mp4`,
    poster: `/projects/${slug}-poster.webp`,
    screenshot: `/projects/${slug}.png`,
    grupo: "cliente",
    entreguePor: "SoftCode",
    descricao: { pt: `descrição de ${slug}`, en: `description of ${slug}` },
    case: {
      contexto: { pt: "", en: "" },
      papel: { pt: "", en: "" },
      stack: [],
      destaques: { pt: [], en: [] },
    },
  };
}

afterEach(cleanup);

describe("outrosCases (SEC-14)", () => {
  it("exclui o projeto atual e mantém todos os outros", () => {
    expect(
      outrosCases(portfolioProjects, "barbalog").map((project) => project.slug),
    ).toEqual(["alura-space", "store-flow", "ola-mundo", "softcode", "lyftconnect", "proops"]);
  });

  it("sendo o único projeto, não sobra nenhum outro", () => {
    expect(outrosCases([projeto("unico")], "unico")).toEqual([]);
  });
});

/**
 * O SEC-14 tem duas metades e a segunda não é observável no dado real: os sete
 * projetos existem, então a rota nunca chega ao caso do projeto único. Só a
 * renderização com um dado construído prova que a seção **some** em vez de
 * renderizar título com lista vazia.
 */
describe("<OutrosCases /> (SEC-14)", () => {
  it("lista os outros projetos, sem o atual", () => {
    render(<OutrosCases projects={portfolioProjects} slugAtual="barbalog" />);

    expect(
      screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent),
    ).toEqual(["Alura Space", "Store Flow", "Olá Mundo", "SoftCode", "LyftConnect", "ProOps"]);
    expect(screen.queryByText("Barbalog")).toBeNull();
  });

  it("sendo o único projeto, a seção inteira é omitida", () => {
    const { container } = render(
      <OutrosCases projects={[projeto("unico")]} slugAtual="unico" />,
    );

    // Nem seção, nem título solto, nem lista vazia: nada.
    expect(container.innerHTML).toBe("");
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
