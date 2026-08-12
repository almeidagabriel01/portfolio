import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portfolioProjects, type Project } from "@/data/projects";
import { aggregateStack, StackTransversal } from "./StackTransversal";

/**
 * SEC-13. O critério da spec é operacional: "adicionar uma tecnologia ao
 * `stack` de um projeto faz ela aparecer na seção **sem tocar no componente**".
 * É isso que estes testes executam, não a forma da função.
 */
function comStack(nome: string, stack: string[]): Project {
  return {
    slug: nome.toLowerCase(),
    nome,
    link: "https://exemplo.invalid/",
    // As quatro mídias são obrigatórias em `Project`. Seguem a convenção de
    // caminho do dado real; nada aqui as renderiza.
    video: `/projetos/${nome.toLowerCase()}.webm`,
    videoMp4: `/projetos/${nome.toLowerCase()}.mp4`,
    poster: `/projetos/${nome.toLowerCase()}-poster.webp`,
    screenshot: `/projetos/${nome.toLowerCase()}.png`,
    grupo: "cliente",
    entreguePor: "SoftCode",
    descricao: { pt: "", en: "" },
    case: {
      contexto: { pt: "", en: "" },
      papel: { pt: "", en: "" },
      stack,
      destaques: { pt: [], en: [] },
    },
  };
}

describe("aggregateStack (SEC-13)", () => {
  it("acrescentar uma tecnologia ao dado a faz aparecer na saída", () => {
    // Nome que não existe em lugar nenhum do repositório: se a lista fosse
    // escrita à mão no componente, ele não teria como aparecer.
    const inedita = "Elixir/Phoenix";
    const antes = aggregateStack(portfolioProjects);
    expect(antes.map((tecnologia) => tecnologia.nome)).not.toContain(inedita);

    const depois = aggregateStack(
      portfolioProjects.map((project) =>
        project.slug === "barbalog" && project.case
          ? { ...project, case: { ...project.case, stack: [...project.case.stack, inedita] } }
          : project,
      ),
    );

    expect(depois.find((tecnologia) => tecnologia.nome === inedita)).toEqual({
      nome: inedita,
      entregas: ["Barbalog"],
    });
  });

  it("tirar uma tecnologia do dado a faz sumir da saída", () => {
    const semNext = aggregateStack(
      portfolioProjects.map((project) =>
        project.case
          ? {
              ...project,
              case: {
                ...project.case,
                stack: project.case.stack.filter((item) => item !== "Next.js"),
              },
            }
          : project,
      ),
    );

    expect(semNext.map((tecnologia) => tecnologia.nome)).not.toContain(
      "Next.js",
    );
  });

  it("agrupa a mesma tecnologia sob as entregas que a declaram", () => {
    const next = aggregateStack(portfolioProjects).find(
      (tecnologia) => tecnologia.nome === "Next.js",
    );

    expect(next?.entregas).toEqual(["SoftCode", "Barbalog", "LyftConnect", "ProOps"]);
  });

  // Exercício de curso não tem `case`, então não tem stack para agregar.
  it("projeto do grupo estudo não contribui com tecnologia nenhuma", () => {
    const estudos = portfolioProjects.filter(
      (project) => project.grupo === "estudo",
    );

    // Os estudos têm case e têm stack; o que os mantém fora da transversal é o
    // grupo, não a ausência de dado.
    expect(estudos.length).toBeGreaterThan(0);
    expect(estudos.every((project) => project.case)).toBe(true);
    expect(aggregateStack(estudos)).toEqual([]);
  });

  it("lista vazia devolve lista vazia, sem quebrar", () => {
    expect(aggregateStack([])).toEqual([]);
  });

  /**
   * `[VERIFICAR]` é pendência anotada no lugar da stack, não tecnologia. O
   * marcador continua no dado e na case page: o que ele não pode é ser
   * apresentado como uma tecnologia que o Gabriel usa.
   */
  it("descarta o marcador [VERIFICAR] em vez de tratá-lo como tecnologia", () => {
    const saida = aggregateStack([
      comStack("Fulano", ["Deno", "[VERIFICAR] banco de dados"]),
    ]);

    expect(saida.map((tecnologia) => tecnologia.nome)).toEqual(["Deno"]);
  });

  it("ordena por número de entregas e, no empate, por nome", () => {
    const saida = aggregateStack([
      comStack("Um", ["Zsh", "Comum"]),
      comStack("Dois", ["Ada", "Comum"]),
    ]);

    expect(saida.map((tecnologia) => tecnologia.nome)).toEqual([
      "Comum",
      "Ada",
      "Zsh",
    ]);
  });
});

/**
 * O outro lado do SEC-13: a agregação é uma função pura, mas o requisito fala
 * da **seção**. Estes testes renderizam o componente com um dado inventado:
 * se houvesse qualquer nome de tecnologia escrito no arquivo, ele apareceria
 * aqui junto com os sintéticos, e a igualdade exata falharia.
 */
describe("<StackTransversal /> (SEC-13)", () => {
  beforeEach(() => {
    // jsdom não implementa IntersectionObserver, e o reveal de seção depende
    // dele. O observer nunca dispara: o conteúdo continua no DOM, que é o que
    // estes testes medem.
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
        unobserve = vi.fn();
        takeRecords = vi.fn();
        root = null;
        rootMargin = "";
        thresholds = [];
      },
    );
  });

  afterEach(() => {
    // A limpeza automática do testing-library só se registra com
    // `globals: true` no vitest, que este projeto não usa: sem o `cleanup`
    // explícito o DOM de um teste vaza para o seguinte: foi assim que o teste
    // de lista vazia encontrou os itens do teste anterior.
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mostra na tela exatamente as tecnologias que vieram do dado", () => {
    render(
      <StackTransversal
        projects={[
          comStack("Alfa", ["Erlang", "Compartilhada"]),
          comStack("Beta", ["Compartilhada"]),
        ]}
      />,
    );

    expect(
      screen
        .getAllByRole("listitem")
        .map((item) => item.getAttribute("data-tecnologia")),
    ).toEqual(["Compartilhada", "Erlang"]);
    expect(screen.getByText("Alfa · Beta")).toBeDefined();
  });

  // Done-when do T10: "lista vazia não quebra a renderização".
  it("sem tecnologia nenhuma, renderiza o título e nenhuma lista", () => {
    render(<StackTransversal projects={[]} />);

    expect(screen.queryAllByRole("listitem")).toEqual([]);
    expect(screen.queryAllByRole("list")).toEqual([]);
    // A seção continua de pé: o título não some junto com a lista.
    expect(screen.getByRole("heading", { level: 2 })).toBeDefined();
  });
});
