import { describe, expect, it } from "vitest";
import { portfolioProjects } from "./projects";

const bySlug = (slug: string) =>
  portfolioProjects.find((project) => project.slug === slug);

describe("invariante de slug (design: 'slug único em toda a lista')", () => {
  // Slug duplicado faria uma rota sequestrar a outra silenciosamente.
  it("não tem slug duplicado", () => {
    const slugs = portfolioProjects.map((project) => project.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("todo slug é URL-safe (minúsculas, dígitos e hífen simples)", () => {
    for (const project of portfolioProjects) {
      expect(project.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });
});

// SEC-17 + "Mudança no modelo de dados": o binário trabalho/estudo da v2 virou
// três grupos. `produto` é produto próprio, `cliente` é entrega para terceiro,
// `estudo` é exercício de curso.
describe("modelo de três grupos (SEC-17)", () => {
  it("a ProOps é o produto próprio", () => {
    const produto = portfolioProjects
      .filter((project) => project.grupo === "produto")
      .map((project) => project.nome);
    // A SoftCode entrou como produto próprio junto com a ProOps: o site da
    // software house é dela, não de cliente.
    expect(produto).toEqual(["SoftCode", "ProOps"]);
  });

  it("Barbalog e LyftConnect são entregas para cliente", () => {
    const cliente = portfolioProjects
      .filter((project) => project.grupo === "cliente")
      .map((project) => project.nome);
    expect(cliente).toEqual(["Barbalog", "LyftConnect"]);
  });

  it("todo projeto pertence a um dos três grupos", () => {
    for (const project of portfolioProjects) {
      expect(["produto", "cliente", "estudo"]).toContain(project.grupo);
    }
  });
});

// SEC-17, os dois lados da invariante. Sem o lado negativo, um `entreguePor`
// vazando para um exercício de curso renderizaria "Alura Space · SoftCode".
// Sem o positivo, uma entrega sem atribuição renderiza rótulo vazio (SEC-18).
describe("invariante entreguePor (SEC-17)", () => {
  it("toda entrega de produto ou cliente declara quem entregou", () => {
    const entregas = portfolioProjects.filter(
      (project) => project.grupo === "produto" || project.grupo === "cliente",
    );

    // Piso: um filtro quebrado devolveria lista vazia e o laço abaixo passaria
    // por vacuidade.
    expect(entregas).toHaveLength(4);
    for (const project of entregas) {
      expect(
        project.entreguePor,
        `${project.nome} é ${project.grupo} e não declara entreguePor`,
      ).toBeDefined();
      expect(["SoftCode", "ProOps"]).toContain(project.entreguePor);
    }
  });

  it("nenhum projeto de estudo declara empresa que entregou", () => {
    const estudos = portfolioProjects.filter(
      (project) => project.grupo === "estudo",
    );

    expect(estudos).toHaveLength(3);
    for (const project of estudos) {
      expect(
        project.entreguePor,
        `${project.nome} é estudo e não deveria ter entreguePor`,
      ).toBeUndefined();
    }
  });

  it("Barbalog e LyftConnect são entregas da SoftCode (SEC-10)", () => {
    expect(bySlug("barbalog")?.entreguePor).toBe("SoftCode");
    expect(bySlug("lyftconnect")?.entreguePor).toBe("SoftCode");
  });

  it("a ProOps é entregue pela própria ProOps", () => {
    expect(bySlug("proops")?.entreguePor).toBe("ProOps");
  });
});

// C1 (SEC-06): "Projects Alpha" era o nome da URL da Vercel, não do projeto.

// C2 (SEC-07): faltava o Olá Mundo. São 5 estudos, não 4.
describe("correção C2: Olá Mundo e os estudos (SEC-07)", () => {
  // AluraBooks e Alura Feira saíram do portfólio a pedido do Gabriel: eram
  // dois de cinco exercícios do mesmo curso, e repetir a mesma prova quatro
  // vezes não acrescenta nada a quem lê.
  it("os estudos são três, com o Olá Mundo entre eles", () => {
    const estudos = portfolioProjects
      .filter((project) => project.grupo === "estudo")
      .map((project) => project.nome);
    expect(estudos).toEqual(["Alura Space", "Store Flow", "Olá Mundo"]);
  });

  it("o Olá Mundo aponta para a URL ao vivo e cita React Router", () => {
    const olaMundo = bySlug("ola-mundo");
    expect(olaMundo?.link).toBe("https://alura-ola-mundo.vercel.app/");
    expect(olaMundo?.descricao.pt).toContain("React Router");
    expect(olaMundo?.descricao.en).toContain("React Router");
  });
});

// C6 (SEC-06/SEC-07): cada estudo tem foco técnico próprio. O LinkedIn nomeia o
// foco de quatro dos cinco; o Store Flow não tem fonte para um foco novo e
// mantém a descrição herdada: inventar um seria afirmação sem fonte (AD-001).
describe("correção C6: foco técnico por estudo", () => {
  it.each([
    ["alura-space", "filtro por tags", "tag filtering"],
    ["ola-mundo", "rotas dinâmicas", "dynamic"],
  ])("%s cita seu foco técnico nos dois idiomas", (slug, pt, en) => {
    expect(bySlug(slug)?.descricao.pt).toContain(pt);
    expect(bySlug(slug)?.descricao.en).toContain(en);
  });

  it("nenhum estudo repete a descrição de outro", () => {
    const descricoes = portfolioProjects
      .filter((project) => project.grupo === "estudo")
      .map((project) => project.descricao.pt);
    expect(new Set(descricoes).size).toBe(descricoes.length);
  });
});

describe("descrições sem correção na v3 permanecem intactas", () => {
  // Congela o texto que nenhuma cláusula da v3 manda mudar: a migração de
  // modelo adiciona campos, não reescreve copy que já tinha fonte.
  it.each([
    [
      "store-flow",
      "Vitrine de e-commerce com experiência de compra fluida.",
      "E-commerce storefront with a fluid shopping experience.",
    ],
    [
      "barbalog",
      "Consultoria em logística e supply chain: diagnóstico, projetos de CD, WMS e PCP.",
      "Logistics and supply chain consulting: diagnostics, DC design, WMS and PCP.",
    ],
    [
      "proops",
      "ERP para empresas de serviços: propostas, CRM, financeiro e IA integrada.",
      "ERP for service companies: proposals, CRM, finance and built-in AI.",
    ],
  ])("%s mantém a descrição PT e EN", (slug, pt, en) => {
    expect(bySlug(slug)?.descricao).toEqual({ pt, en });
  });

  it("a lista passa a ter 6 entradas", () => {
    expect(portfolioProjects).toHaveLength(7);
  });

  it("toda descrição está preenchida nos dois idiomas", () => {
    for (const project of portfolioProjects) {
      expect(project.descricao.pt.trim().length).toBeGreaterThan(0);
      expect(project.descricao.en.trim().length).toBeGreaterThan(0);
    }
  });
});

// PORT-14: /projetos/[slug] renderiza o case para quem tem case. Ausência de
// `case` é o que faz a rota devolver 404 (PORT-15).
//
// **Todo projeto tem case agora.** Até aqui o grupo estudo ficava de fora, e a
// regra era "exercício de curso não vira case". A decisão mudou: um projeto
// listado sem lugar para onde ir é um beco. O que separa estudo de entrega
// profissional continua sendo o dado (`grupo`, `entreguePor`) e o selo na
// grade, não a existência da página.
describe("conteúdo de case (PORT-14)", () => {
  it("todo projeto tem case, na ordem da lista", () => {
    expect(
      portfolioProjects
        .filter((project) => project.case)
        .map((project) => project.slug),
    ).toEqual([
      "alura-space",
      "store-flow",
      "ola-mundo",
      "softcode",
      "barbalog",
      "lyftconnect",
      "proops",
    ]);
  });

  // O que os estudos NÃO podem ter continua valendo: sem `entreguePor`, porque
  // não foram entregues por empresa nenhuma (SEC-17).
  it("os estudos têm case mas nenhum declara empresa que entregou", () => {
    for (const project of portfolioProjects) {
      if (project.grupo !== "estudo") continue;
      expect(project.case, `${project.nome} devia ter case`).toBeDefined();
      expect(project.entreguePor).toBeUndefined();
    }
  });

  it.each(["softcode", "barbalog", "lyftconnect", "proops"])(
    "%s tem contexto e papel preenchidos nos dois idiomas",
    (slug) => {
      const projectCase = bySlug(slug)?.case;
      for (const field of [projectCase?.contexto, projectCase?.papel]) {
        expect(field?.pt.trim().length).toBeGreaterThan(0);
        expect(field?.en.trim().length).toBeGreaterThan(0);
      }
    },
  );

  it.each(["softcode", "barbalog", "lyftconnect", "proops"])(
    "%s tem destaques com o mesmo número de itens em PT e EN",
    (slug) => {
      const destaques = bySlug(slug)?.case?.destaques;
      expect(destaques?.pt.length).toBe(destaques?.en.length);
      expect(destaques?.pt.length).toBeGreaterThan(0);
      for (const item of [...(destaques?.pt ?? []), ...(destaques?.en ?? [])]) {
        expect(item.trim().length).toBeGreaterThan(0);
      }
    },
  );

  it.each(["softcode", "barbalog", "lyftconnect", "proops"])("%s declara a stack usada", (slug) => {
    expect(bySlug(slug)?.case?.stack.length).toBeGreaterThan(0);
  });

  // SEC-11: o papel agora tem fonte (o Gabriel declarou a estrutura societária),
  // então o marcador sai. Escopo de campo, não do case inteiro: um
  // `not.toContain` sobre o case todo derrubaria junto o marcador de métrica,
  // que é correto que fique.
  it.each(["softcode", "barbalog", "lyftconnect", "proops"])(
    "%s declara o papel real, sem [VERIFICAR], nos dois idiomas (SEC-11)",
    (slug) => {
      const papel = bySlug(slug)?.case?.papel;
      expect(papel?.pt).not.toContain("[VERIFICAR]");
      expect(papel?.en).not.toContain("[VERIFICAR]");
      // Não basta o marcador sair: o campo tem que dizer algo. Um papel vazio
      // passaria no `not.toContain` sem declarar papel nenhum.
      expect(papel?.pt.length).toBeGreaterThan(40);
      expect(papel?.en.length).toBeGreaterThan(40);
    },
  );

  it.each(["barbalog", "lyftconnect"])(
    "%s credita a SoftCode como a empresa que entregou (SEC-10)",
    (slug) => {
      expect(bySlug(slug)?.case?.papel.pt).toContain("SoftCode");
      expect(bySlug(slug)?.case?.papel.en).toContain("SoftCode");
    },
  );

  it("o papel na ProOps declara sociedade e engenharia do produto", () => {
    const papel = bySlug("proops")?.case?.papel;
    expect(papel?.pt).toContain("Sócio");
    expect(papel?.pt).toContain("engenharia");
    expect(papel?.en).toContain("Partner");
    expect(papel?.en).toContain("engineering");
  });

  /**
   * O outro lado do SEC-11, agora invertido: **nenhum** `[VERIFICAR]` sobra em
   * lugar nenhum do dado.
   *
   * O marcador existia para impedir que "tirar o [VERIFICAR]" virasse
   * "inventar resultado", e ele foi resolvido pela única via que não inventa
   * nada: o Gabriel respondeu. Barbalog e LyftConnect ganharam o prazo real
   * (um mês do escopo ao ar); a stack da ProOps saiu do repositório dela
   * (Firebase, Firestore, Cloud Functions, Gemini); e onde não há número
   * publicável o texto **diz isso**, em vez de prometer um número futuro.
   */
  it.each(["softcode", "barbalog", "lyftconnect", "proops"])(
    "%s não deixa nenhum [VERIFICAR] no case, em nenhum idioma",
    (slug) => {
      expect(JSON.stringify(bySlug(slug)?.case)).not.toContain("[VERIFICAR]");
    },
  );

  // "Zero métrica inventada" (AD-001 + regra de conteúdo do design). Os números
  // exibidos no dashboard da landing page do ProOps são dados de demonstração da
  // própria peça de marketing, não métricas de uso. Este teste falha se
  // alguém "melhorar" o case reintroduzindo-os como resultado.
  it("não cita os números de demonstração da landing page do ProOps", () => {
    const caseText = JSON.stringify(bySlug("proops")?.case);
    for (const demoFigure of ["128.400", "128400", "67%", "86 ", " 27 "]) {
      expect(caseText).not.toContain(demoFigure);
    }
  });
});

/**
 * SEC-03 na camada de dado. A restrição é declaração direta do Gabriel: pode-se
 * NÃO dizer nada sobre carteira de clientes. A decisão mudou: o produto tem
 * poucos, e a afirmação não ajuda o portfólio. O que fica é "está em
 * produção". As guardas abaixo continuam porque a proibição só ficou **mais
 * forte**: antes o LinkedIn
 * escreve "clientes pagantes" no plural e ele afirmou que é um, então a declaração
 * dele prevalece.
 *
 * O e2e cobre a tela; aqui a fonte é o dado, que é de onde o texto sai nos dois
 * idiomas. Sem este teste, uma tradução ou um "melhorar a copy" reintroduz o
 * número sem ninguém ver.
 */
describe("restrição de conteúdo sobre o cliente da ProOps (SEC-03)", () => {
  const proops = bySlug("proops");
  const textoProOps = [
    proops?.descricao.pt,
    proops?.descricao.en,
    JSON.stringify(proops?.case),
  ].join("\n");

  // Piso: um `bySlug` quebrado deixaria a string quase vazia e todas as
  // asserções abaixo passariam por vacuidade.
  it("o texto da ProOps sob análise não está vazio", () => {
    expect(textoProOps.length).toBeGreaterThan(500);
    expect(textoProOps).toContain("em produção");
  });

  // Regex ancorada em "cliente": um `/\d/` cru acusaria "out 2025" e a stack.
  it("nenhum número de quantidade de cliente, em nenhum dos dois idiomas", () => {
    const quantidade =
      /(\d+\s*\+?\s*(clientes?|clients?))|((clientes?|clients?)\s*:?\s*\d+)/i;
    expect(textoProOps).not.toMatch(quantidade);
  });

  it("não escreve cliente pagante no plural", () => {
    expect(textoProOps).not.toMatch(/clientes\s+pagantes/i);
    expect(textoProOps).not.toMatch(/paying\s+clients/i);
  });

  // A LyftConnect é entrega da SoftCode e nunca cliente da ProOps: as duas
  // relações existem na realidade, só a da SoftCode é pública aqui.
  it("não nomeia cliente algum da ProOps", () => {
    for (const nome of ["LyftConnect", "Lyft", "Barbalog"]) {
      expect(textoProOps).not.toContain(nome);
    }
  });
});

describe("link ao vivo", () => {
  it("todo link é uma URL absoluta com origem derivável", () => {
    for (const project of portfolioProjects) {
      expect(() => new URL(project.link).origin).not.toThrow();
      expect(new URL(project.link).protocol).toBe("https:");
    }
  });
});

/**
 * UI-09: o slide do carrossel mostra o screenshot do site ao vivo.
 *
 * O caminho é dado, mas o arquivo é do disco: declarar `screenshot` sem o PNG
 * correspondente renderiza uma imagem quebrada em produção, e nenhum teste de
 * DOM pega isso. Por isso a asserção vai ao sistema de arquivos.
 */
describe("screenshots do carrossel (UI-09)", () => {
  it("todo caminho declarado existe em public/", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");

    const declarados = portfolioProjects.filter((p) => p.screenshot);
    // Sem piso, um dado sem screenshot nenhum passaria por vacuidade.
    expect(declarados.length).toBeGreaterThan(3);

    for (const project of declarados) {
      expect(project.screenshot).toMatch(/^\/projetos\/[a-z0-9-]+\.png$/);
      expect(
        existsSync(join(process.cwd(), "public", project.screenshot!)),
        `screenshot declarado e ausente do disco: ${project.screenshot}`,
      ).toBe(true);
    }
  });

  /**
   * O caso de borda do spec, e ele é real: a LyftConnect devolveu HTTP 522 na
   * captura. Sem este piso, alguém "consertaria" o dado dando screenshot a
   * todo mundo e o caminho sem imagem deixaria de ser exercitado, e o teste de
   * layout do slide sem imagem passaria a medir nada.
   */
  it("ao menos um projeto não tem screenshot", () => {
    expect(portfolioProjects.filter((p) => !p.screenshot).length).toBeGreaterThan(0);
  });

  /**
   * O defeito que este teste pega já aconteceu: a célula da LyftConnect ficava
   * **preta por segundos** no primeiro hover porque ela era a única sem
   * `screenshot`, e o `<video>` sem `poster` não tem o que pintar enquanto
   * decodifica. Asset declarado e ausente do disco vira exatamente isso.
   */
  it("todo vídeo e todo poster declarados existem no disco", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const declarados = portfolioProjects.flatMap((project) =>
      [project.video, project.videoMp4, project.poster].filter(Boolean),
    ) as string[];

    expect(declarados.length).toBeGreaterThan(0);
    for (const caminho of declarados) {
      expect(caminho).toMatch(/^\/projetos\/[a-z0-9-]+\.(webm|mp4|webp)$/);
      expect(
        existsSync(join(process.cwd(), "public", caminho)),
        `asset declarado e ausente do disco: ${caminho}`,
      ).toBe(true);
    }
  });

  /**
   * O poster **tem de acompanhar o vídeo**. Um vídeo sem poster é a célula
   * preta de novo; um poster sem vídeo é um quadro parado que nunca anima.
   */
  it("vídeo, fallback e poster andam sempre em trio", () => {
    for (const project of portfolioProjects) {
      const tem = Boolean(project.video);
      expect(Boolean(project.poster), `poster sem vídeo: ${project.slug}`).toBe(tem);
      // Sem o H.264 o iOS anterior ao 17.4 fica no poster para sempre.
      expect(Boolean(project.videoMp4), `sem fallback H.264: ${project.slug}`).toBe(tem);
    }
  });

  /**
   * A grade da home é `[...profissionais, ...estudos].slice(0, 6)`, e o texto
   * dela afirma **"três entregas de cliente … e três exercícios de curso"**.
   * Nada liga as duas coisas: acrescentar um quarto projeto profissional faria
   * a grade virar 4 + 2 com a frase ainda prometendo 3 + 3, o mesmo defeito de
   * rótulo-que-não-bate-com-valor que o SEC-18 nomeia, só que na copy.
   *
   * Quando este teste reprovar, o conserto é o texto de `deliveries.description`
   * nos dois idiomas, não o número aqui.
   */
  it("a composição da grade da home bate com o que a copy promete", () => {
    const profissionais = portfolioProjects.filter((p) => p.grupo !== "estudo");
    const estudos = portfolioProjects.filter((p) => p.grupo === "estudo");

    expect(
      profissionais,
      "a copy diz quatro entregas profissionais",
    ).toHaveLength(4);
    // Os estudos completam as seis células; sobrar é esperado (vão para
    // `/projetos`), faltar deixaria buraco na segunda fileira.
    expect(estudos.length, "a copy diz três exercícios").toBeGreaterThanOrEqual(
      3,
    );
  });
});
