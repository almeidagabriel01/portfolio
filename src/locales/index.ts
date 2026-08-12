export const ptBR = {
  header: {
    /** Nome acessível da landmark de navegação entre rotas. */
    nav: "Navegação de rotas",
    /** Primeiro tab-stop da página: pula o header e vai ao conteúdo. */
    skip: "Pular para o conteúdo",
    /** Rótulo acessível do botão que troca o idioma. */
    language: "Trocar idioma",
    home: "Início",
    about: "Sobre",
    /** Rótulo do botão que abre o menu em viewport estreita, e o de fechar. */
    menu: "Menu",
    close: "Fechar",
    projects: "Projetos",
    skills: "Habilidades",
    journey: "Jornada",
    contact: "Contato",
  },
  hero: {
    /**
     * As frases giram a cada 5s, uma por vez, no molde
     * (identidade → o que eu faço → a ambição). Palavra entre asteriscos sai no
     * âmbar de acento: ver `PalavrasQueEntram`.
     *
     * Frase curta é requisito, não estilo: cada palavra entra com 0,3s de
     * atraso sobre a anterior, então uma frase de oito palavras só assentaria
     * depois do ciclo já ter virado.
     */
    frases: [
      "Eu sou *Gabriel Dias*",
      "Construo software que *dura*",
      "Da arquitetura ao *detalhe*",
    ],
    cargoCurto: "Desenvolvedor Full-Stack",
    rolar: "Rolar para o conteúdo",
  },
  /**
   * SEC-02/SEC-03. A composição societária é escrita por extenso ("Três
   * sócios") de propósito: o número de sócios é público, o de clientes não, e
   * um algarismo solto perto da ProOps é exatamente o que a restrição proíbe.
   */
  companies: {
    label: "De onde vem o trabalho",
    title: "Sócio em ",
    highlight: "duas empresas.",
    description:
      "As entregas abaixo não são trabalhos avulsos. Saem de duas empresas das quais sou sócio: uma software house e um ERP em produção.",
    entries: [
      {
        tipo: "Software house",
        desde: "Desde jul 2025",
        sociedade: "Dois sócios, ambos desenvolvedores",
        desc: "Produtos digitais sob demanda, do modelo de dados à interface. Atuamos do escopo com o cliente até o deploy e a manutenção depois da publicação.",
      },
      {
        tipo: "ERP para empresas de serviço",
        desde: "Desde out 2025",
        sociedade: "Três sócios, dois na engenharia",
        desc: "Propostas comerciais em PDF com pré-visualização em tempo real, CRM em kanban, fluxo de caixa, agenda e a Lia, assistente de IA que preenche formulários e responde sobre a operação. No ar, com cliente pagante.",
      },
    ],
  },
  /**
   * SEC-01, marco final da trajetória. Os quatro primeiros marcos NÃO vivem
   * aqui: são lidos de `journey.experiences`, para o arco não poder divergir da
   * jornada corrigida. Só o desfecho (as empresas próprias) é texto novo,
   * porque não é emprego e não está na jornada.
   */
  trajectory: {
    label: "Como cheguei aqui",
    title: "Da fibra ",
    highlight: "ao software.",
    own: {
      cargo: "Empresas próprias",
      empresa: "SoftCode · ProOps",
      periodo: "Desde 2025",
      desc: "A software house que entrega produto digital sob demanda e o ERP que está no ar com cliente pagante.",
    },
  },
  /**
   * SEC-10 e SEC-18: as entregas com a empresa que as assina. `by` é o rótulo
   * da atribuição: só é renderizado quando existe `entreguePor`, nunca sozinho.
   *
   * A grade tem seis células, então o rótulo fala de seis. O
   * rótulo do painel são duas linhas de duas pontas cada, o que dá as quatro
   * etapas de uma entrega na ordem em que acontecem.
   *
   * **O título é curto por exigência do molde**, não por gosto: ele é
   * distribuído ponta a ponta e, em 390, a coluna tem 330px para 40px de corpo.
   * "Seis projetos publicados." media 465px, quebrava em duas linhas, e a
   * segunda, com uma palavra só, não tem como se distribuir e encostava na
   * esquerda. Quem pegou foi a medição em 390 de largura, na sonda
   * `portfolio/titulo-n`: borda direita em 224 contra os 360 da coluna. A conta
   * a fazer antes de mexer aqui é a largura da frase no corpo do estreito.
   */
  deliveries: {
    label: "Seis projetos publicados",
    title: "O que está ",
    highlight: "no ar.",
    description:
      "Quatro entregas profissionais, pelas empresas das quais sou sócio, e três exercícios de curso que continuam de pé.",
    by: "Entregue por",
    all: "Ver todos os projetos",
    panelTop: ["Escopo", "Código"] as [string, string],
    panelBottom: ["Deploy", "Manutenção"] as [string, string],
  },
  /**
   * SEC-01 e SEC-09. O diploma e o prêmio **não** são reescritos aqui: a seção
   * lê `journey.experiences[6]` e `[5]`, pelo mesmo motivo da trajetória: dois
   * textos para o mesmo fato divergem na primeira correção. O que mora aqui é
   * só o que a jornada não tem: o inglês e a contagem de certificações.
   */
  education: {
    label: "Formação e prêmios",
    title: "Formação e ",
    highlight: "reconhecimento.",
    english: {
      titulo: "Inglês avançado",
      meta: "Five · Jan 2026",
      desc: "Proficiência avançada concluída em janeiro de 2026, na Five.",
    },
    /**
     * Sem `meta`: o número de credenciais tem fonte, o emissor e a data de cada
     * uma não têm. Campo vazio vira rótulo solto na tela, o mesmo defeito que
     * o SEC-18 nomeia nas entregas.
     */
    certifications: {
      titulo: "21 certificações e licenças",
      desc: "Vinte e uma credenciais registradas até aqui. O número é o dado; a lista inteira fica no LinkedIn.",
    },
  },
  /**
   * O hero das rotas internas. Cada rota tem o seu rótulo; conjunto de frases
   * próprio, só quem precisa: `projetos` herda o da home (por isso não tem
   * `frases`) e `sobre` fala de quem escreve.
   *
   * Frase curta é requisito: cada palavra entra com 0,3s de atraso sobre a
   * anterior, e o ciclo vira em 5s.
   */
  rotas: {
    projetos: { rotulo: "Projetos" },
    sobre: {
      rotulo: "Sobre",
      frases: [
        "Da *fibra óptica* ao produto",
        "Engenharia antes do *framework*",
        "Aprendo *construindo*",
      ],
    },
  },
  /**
   * A `/projetos`: o rótulo é um **fato de escala** e o título é uma
   * **afirmação**, não uma descrição do que a página lista. Nada aqui repete a
   * seção de entregas da home, que já diz o que está no ar.
   */
  projects: {
    label: "Sete projetos, quatro com case escrito",
    title: "Nenhum deles começou ",
    highlight: "pronto.",
    table: { projeto: "Projeto", oQueE: "O que é", grupo: "Grupo" },
    /**
     * O que o projeto **é**, dito na cara do card. "Trabalho" e "Estudos" já
     * existiam como taxonomia da tabela, mas não diziam a diferença que
     * importa a quem lê: se aquilo foi ao ar para um cliente de verdade ou se
     * é exercício de curso.
     */
    tipos: {
      cliente: "Cliente real",
      produto: "Produto próprio",
      estudo: "Projeto de estudo",
    },
    janela: {
      abrir: "Abrir ao vivo",
      fechar: "Fechar",
      aviso: "Site publicado. Clique para navegar aqui dentro",
      emNovaAba: "Abrir o site",
    },
    groups: {
      trabalho: "Trabalho",
      estudo: "Estudos",
    },
    viewCase: "Ver o case",
  },
  /**
   * SEC-13. Só o texto de moldura mora aqui: os nomes de tecnologia são
   * computados de `case.stack` e nenhum deles é escrito no dicionário nem no
   * componente.
   */
  stack: {
    label: "Com o que foi feito",
    title: "A stack ",
    highlight: "das entregas.",
    /**
     * O texto descreve o que a seção **de fato** mostra. A redação anterior
     * dizia "as tecnologias que atravessam mais de um projeto" e a lista trazia
     * Pix, Stripe e WhatsApp, que estão numa entrega só. Filtrar por repetição
     * deixaria a frase verdadeira e quebraria o SEC-13: uma tecnologia nova,
     * acrescentada a um projeto, não apareceria.
     */
    description:
      "Toda tecnologia declarada nos cases, com as entregas em que ela aparece. As que se repetem vêm primeiro.",
  },
  caseStudy: {
    context: "Contexto",
    role: "Papel",
    stack: "Stack",
    highlights: "Destaques",
    visit: "Visitar site",
    back: "Voltar para projetos",
    /** SEC-14: título da navegação entre cases, no fim da página. */
    others: "Outros cases",
  },
  skills: {
    title: "Arquitetura & ",
    highlight: "Código",
    description:
      "Stack tecnológico de alto desempenho, focado em escalabilidade e Clean Architecture.",
    categories: [
      { title: "Front-End" },
      { title: "Back-End" },
      { title: "Infraestrutura" },
      { title: "Formação & Idiomas" },
    ],
  },
  journey: {
    title: "Minha ",
    highlight: "Jornada",
    experiences: [
      {
        cargo: "Desenvolvedor de Software Júnior",
        empresa: "VS Telecom",
        periodo: "Abr 2025 - Presente",
        desc: "Aplicações web de CRM, RH e Geolocalização com Next.js, React.js, PHP/Laravel e MySQL.",
      },
      {
        cargo: "Estágio de Desenvolvedor de Software",
        empresa: "VS Telecom",
        periodo: "Mar 2023 - Mar 2025",
        desc: "Sistemas web de RH e CRM em front-end e back-end, com Next.js, React.js, PHP/Laravel e MySQL.",
      },
      {
        cargo: "Estágio em Desenvolvimento (ND)",
        empresa: "INATEL",
        periodo: "Fev 2023 - Mar 2023",
        desc: "Manutenção do CRM Salesforce e scripts em Python para webscraping, automatizando a coleta e a formatação dos dados em Excel.",
      },
      {
        cargo: "Estágio em Engenharia de Software (PDI)",
        empresa: "INATEL",
        periodo: "Ago 2022 - Jan 2023",
        desc: "Desenvolvimento e manutenção de aplicações web com HTML, CSS, JavaScript, React, Flask e PHP.",
      },
      {
        cargo: "Estágio em Telecomunicações DWDM",
        empresa: "Huawei (INATEL)",
        periodo: "Out 2021 - Jul 2022",
        desc: "Dimensionamento dos canais da fibra, documentação técnica e verificação da qualidade de transmissão em redes DWDM.",
      },
      {
        cargo: "Werk, Prêmio Municipal de Inovações",
        empresa: "Prefeitura de Santa Rita do Sapucaí",
        periodo: "Abr 2021 - Set 2021",
        desc: "Werk, plataforma para trabalhadores divulgarem seus serviços. Atuei no front-end (HTML, CSS, JS).",
      },
      {
        cargo: "Bacharelado Eng. de Software",
        // Cidade e mês de início vêm da linha de Formação do design (LinkedIn +
        // CV). Ficam aqui, e não numa cópia na seção de formação, para o
        // diploma ter um texto só nas duas rotas que o exibem.
        empresa: "INATEL, Santa Rita do Sapucaí",
        periodo: "Jan 2021 - Dez 2025",
        // Trocado de "formação técnica de excelência em algoritmos e
        // arquitetura", que era autoelogio sem fonte e serviria para qualquer
        // formando. O fato específico é a sobreposição: os três estágios que
        // abriram a carreira aconteceram na mesma instituição da graduação.
        desc: "Cinco anos no INATEL, a mesma instituição onde fiz os três estágios que abriram a carreira, do DWDM ao desenvolvimento.",
      },
    ],
  },
  /**
   * SEC-04. E-mail, GitHub e LinkedIn, **nenhum telefone**, por decisão do
   * Gabriel registrada no "Out of Scope" da spec.
   */
  contact: {
    label: "Onde falar comigo",
    title: "Onde a conversa ",
    highlight: "começa.",
    description:
      "Produto digital novo pela SoftCode ou o ERP da ProOps: nos dois casos o começo é o mesmo e-mail.",
    button: "Escrever um e-mail",
    networks: "Redes",
    from: "De onde sai o trabalho",
  },
};

export const enUS = {
  header: {
    nav: "Route navigation",
    skip: "Skip to content",
    language: "Switch language",
    home: "Home",
    about: "About",
    menu: "Menu",
    close: "Close",
    projects: "Projects",
    skills: "Skills",
    journey: "Journey",
    contact: "Contact",
  },
  hero: {
    frases: [
      "I am *Gabriel Dias*",
      "I build software that *lasts*",
      "From architecture to the *detail*",
    ],
    cargoCurto: "Full-Stack Developer",
    rolar: "Scroll to content",
  },
  companies: {
    label: "Where the work comes from",
    title: "Partner at ",
    highlight: "two companies.",
    description:
      "The work below isn't a string of one-off gigs. It comes out of two companies I co-own: a software house and an ERP in production.",
    entries: [
      {
        tipo: "Software house",
        desde: "Since Jul 2025",
        sociedade: "Two partners, both developers",
        desc: "Digital products on demand, from the data model to the interface. We work from scoping with the client through to deploy and maintenance after launch.",
      },
      {
        tipo: "ERP for service companies",
        desde: "Since Oct 2025",
        sociedade: "Three partners, two in engineering",
        desc: "Commercial proposals as PDFs with real-time preview, a kanban CRM, cash flow, scheduling, and Lia, an AI assistant that fills in forms and answers questions about the operation. Live, with a paying client.",
      },
    ],
  },
  trajectory: {
    label: "How I got here",
    title: "From fibre ",
    highlight: "to software.",
    own: {
      cargo: "Companies of my own",
      empresa: "SoftCode · ProOps",
      periodo: "Since 2025",
      desc: "The software house that delivers digital products on demand, and the ERP that is live with a paying client.",
    },
  },
  deliveries: {
    label: "Six shipped projects",
    title: "What is ",
    highlight: "live.",
    description:
      "Four professional deliveries, from the companies I co-own, and three course projects still standing.",
    by: "Delivered by",
    all: "See all projects",
    panelTop: ["Scope", "Code"] as [string, string],
    panelBottom: ["Deploy", "Maintenance"] as [string, string],
  },
  education: {
    label: "Education and awards",
    title: "Education and ",
    highlight: "recognition.",
    english: {
      titulo: "Advanced English",
      meta: "Five · Jan 2026",
      desc: "Advanced proficiency completed in January 2026, at Five.",
    },
    certifications: {
      titulo: "21 certifications and licences",
      desc: "Twenty-one credentials on record so far. The number is the data point; the full list lives on LinkedIn.",
    },
  },
  rotas: {
    projetos: { rotulo: "Projects" },
    sobre: {
      rotulo: "About",
      frases: [
        "From *fiber optics* to product",
        "Engineering before the *framework*",
        "I learn by *building*",
      ],
    },
  },
  projects: {
    label: "Seven projects, four with a written case",
    title: "None of them started ",
    highlight: "finished.",
    table: { projeto: "Project", oQueE: "What it is", grupo: "Group" },
    tipos: {
      cliente: "Real client",
      produto: "Own product",
      estudo: "Study project",
    },
    janela: {
      abrir: "Open live",
      fechar: "Close",
      aviso: "Live site. Click to browse it right here",
      emNovaAba: "Open the site",
    },
    groups: {
      trabalho: "Work",
      estudo: "Studies",
    },
    viewCase: "View case",
  },
  stack: {
    label: "What it was built with",
    title: "The stack ",
    highlight: "behind the work.",
    description:
      "Every technology the case studies declare, with the deliveries it appears in. The recurring ones come first.",
  },
  caseStudy: {
    context: "Context",
    role: "Role",
    stack: "Stack",
    highlights: "Highlights",
    visit: "Visit site",
    back: "Back to projects",
    others: "Other case studies",
  },
  skills: {
    title: "Architecture & ",
    highlight: "Code",
    description:
      "High-performance technology stack, focused on scalability and Clean Architecture.",
    categories: [
      { title: "Front-End" },
      { title: "Back-End" },
      { title: "Infrastructure" },
      { title: "Education & Languages" },
    ],
  },
  journey: {
    title: "My ",
    highlight: "Journey",
    experiences: [
      {
        cargo: "Junior Software Developer",
        empresa: "VS Telecom",
        periodo: "Apr 2025 - Present",
        desc: "Web applications for CRM, HR and Geolocation with Next.js, React.js, PHP/Laravel and MySQL.",
      },
      {
        cargo: "Software Developer Intern",
        empresa: "VS Telecom",
        periodo: "Mar 2023 - Mar 2025",
        desc: "HR and CRM web systems across front-end and back-end, with Next.js, React.js, PHP/Laravel and MySQL.",
      },
      {
        cargo: "Development Intern (ND)",
        empresa: "INATEL",
        periodo: "Feb 2023 - Mar 2023",
        desc: "Salesforce CRM maintenance and Python scripts for web scraping, automating data collection and formatting into Excel.",
      },
      {
        cargo: "Software Engineering Intern (PDI)",
        empresa: "INATEL",
        periodo: "Aug 2022 - Jan 2023",
        desc: "Development and maintenance of web applications with HTML, CSS, JavaScript, React, Flask and PHP.",
      },
      {
        cargo: "DWDM Telecommunications Intern",
        empresa: "Huawei (INATEL)",
        periodo: "Oct 2021 - Jul 2022",
        desc: "Fibre channel dimensioning, technical documentation and transmission quality verification on DWDM networks.",
      },
      {
        cargo: "Werk, Municipal Innovations Award",
        empresa: "Santa Rita do Sapucaí City Hall",
        periodo: "Apr 2021 - Sep 2021",
        desc: "Werk, a platform for workers to advertise their services. I worked on the front-end (HTML, CSS, JS).",
      },
      {
        cargo: "Bachelor's in Software Engineering",
        empresa: "INATEL, Santa Rita do Sapucaí",
        periodo: "Jan 2021 - Dec 2025",
        desc: "Five years at INATEL, the same institution where I did the three internships that opened the career, from DWDM to development.",
      },
    ],
  },
  contact: {
    label: "Where to reach me",
    title: "Where the conversation ",
    highlight: "starts.",
    description:
      "A new digital product through SoftCode, or the ProOps ERP: either way, it starts with the same email.",
    button: "Write an email",
    networks: "Networks",
    from: "Where the work comes from",
  },
};

export type Translations = typeof ptBR;

/**
 * Dicionário por locale do store. A anotação é o primeiro guarda de paridade:
 * chave que existir em PT e faltar em EN não compila. O segundo guarda é o diff
 * recursivo em `index.test.ts`, que também pega chave sobrando em EN (PORT-17).
 */
export const dictionaries: Record<"pt" | "en", Translations> = {
  pt: ptBR,
  en: enUS,
};
