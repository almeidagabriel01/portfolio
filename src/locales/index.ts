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
      "As entregas abaixo saem de duas empresas das quais sou sócio: uma software house e a ProOps, com um ERP em produção e um app pessoal.",
    entries: [
      {
        tipo: "Software house",
        desde: "Desde jul 2025",
        sociedade: "Dois sócios, ambos desenvolvedores",
        desc: "Produtos digitais sob demanda, de sites a apps Android como o Registra, do modelo de dados à interface. Atuamos do escopo ao deploy e à manutenção.",
      },
      {
        tipo: "ERP e app pessoal",
        desde: "Desde out 2025",
        sociedade: "Três sócios, dois na engenharia",
        desc: "O ERP reúne propostas comerciais em PDF, CRM, financeiro, agenda e a Lia, assistente de IA. O app pessoal organiza finanças, notas e lembretes com interação pelo WhatsApp. O ERP está em produção, com cliente pagante.",
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
      desc: "A software house que entrega produtos digitais sob demanda e a ProOps, com um ERP em produção e um app pessoal.",
    },
  },
  /**
   * SEC-10 e SEC-18: as entregas com a empresa que as assina. `by` é o rótulo
   * da atribuição: só é renderizado quando existe `entreguePor`, nunca sozinho.
   *
   * A grade mostra os nove projetos, então o rótulo fala de nove. O
   * rótulo do painel são duas linhas de duas pontas cada, o que dá as quatro
   * etapas de uma entrega na ordem em que acontecem.
   *
   * **O título é curto por exigência do molde**, não por gosto: ele é
   * distribuído ponta a ponta e, em 390, a coluna tem 330px para 40px de corpo.
   * "Sete projetos publicados." media 465px, quebrava em duas linhas, e a
   * segunda, com uma palavra só, não tem como se distribuir e encostava na
   * esquerda. Quem pegou foi a medição em 390 de largura, na sonda
   * `portfolio/titulo-n`: borda direita em 224 contra os 360 da coluna. A conta
   * a fazer antes de mexer aqui é a largura da frase no corpo do estreito.
   */
  deliveries: {
    label: "Nove projetos",
    title: "O que eu ",
    highlight: "construí.",
    description:
      "Seis entregas profissionais pelas empresas das quais sou sócio e três projetos de estudo.",
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
   * O hero das rotas internas. **Cada rota tem o seu conjunto de frases**, e
   * isso não é enfeite: as três rotas abrem com o mesmo molde de hero, então
   * repetir as frases da home fazia `/projects` ler como a home outra vez.
   * Aqui a rota fala do que ela lista (trabalho publicado), e `sobre` de quem
   * escreve.
   *
   * Frase curta é requisito: cada palavra entra com 0,3s de atraso sobre a
   * anterior, e o ciclo vira em 5s.
   */
  rotas: {
    projetos: {
      rotulo: "Projetos",
      /**
       * Não repetem o que a página já diz: o rótulo da lista é "Nove projetos,
       * todos com case escrito" e o título dela é "Nenhum deles começou
       * pronto". Falar de contagem ou de case aqui era ler a mesma frase duas
       * vezes com uma rolagem de distância.
       *
       * **Quatro palavras, como nas outras rotas, e isso é da animação.** Cada
       * palavra entra 0,15s depois da anterior, então o escalonamento é o que
       * faz a entrada ser lida como entrada. Medido: com duas palavras
       * ("Trabalho publicado") o hero desta rota abria em 27ms de
       * escalonamento, contra 335ms da home — e o que se via era um salto.
       */
      frases: [
        "O que eu *entreguei*",
        "Cada escolha tem *motivo*",
        "Feito para o *uso real*",
      ],
    },
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
   * A `/projects`: o rótulo é um **fato de escala** e o título é uma
   * **afirmação**, não uma descrição do que a página lista. Nada aqui repete a
   * seção de entregas da home, que já apresenta o trabalho construído.
   */
  projects: {
    label: "Nove projetos, todos com case escrito",
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
    registraPreview: {
      eyebrow: "Case interativo · app Android",
      open: "Explorar o fluxo",
      close: "Fechar",
      coverTitle: "O registro continua sem sinal.",
      coverBody: "Da ficha em papel ao documento com autoria e integridade verificáveis.",
      illustration: "Demonstração ilustrativa, sem dados de cliente",
      stages: ["Captura", "Offline", "Assinatura"] as [string, string, string],
      titles: [
        "Do papel ao tablet.",
        "O trabalho não espera a rede.",
        "Cada registro deixa prova.",
      ] as [string, string, string],
      captions: [
        "Formulários de autocontrole ganham campos digitais para a operação em tablet.",
        "O preenchimento e a guarda local continuam mesmo quando a conexão cai.",
        "Ao finalizar, a assinatura e o hash permitem verificar autoria e integridade.",
      ] as [string, string, string],
      actions: ["Continuar sem rede", "Finalizar registro", "Recomeçar"] as [string, string, string],
      paper: "Ficha de controle",
      form: "Registro de autocontrole",
      field: "Verificação",
      note: "Observação",
      local: "Salvo no dispositivo",
      pending: "Aguardando conexão",
      final: "Registro finalizado",
      verified: "Integridade verificada",
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
      "Produto digital pela SoftCode ou uma solução da ProOps: o começo é o mesmo e-mail.",
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
      "The work below comes from two companies I co-own: a software house and ProOps, with an ERP in production and a personal app.",
    entries: [
      {
        tipo: "Software house",
        desde: "Since Jul 2025",
        sociedade: "Two partners, both developers",
        desc: "Digital products on demand, from sites to Android apps such as Registra, from the data model to the interface. We work from scoping through deploy and maintenance.",
      },
      {
        tipo: "ERP and personal app",
        desde: "Since Oct 2025",
        sociedade: "Three partners, two in engineering",
        desc: "The ERP combines PDF proposals, CRM, finance, scheduling and Lia, an AI assistant. The personal app organises finances, notes and reminders through WhatsApp. The ERP is in production, with a paying client.",
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
      desc: "The software house that delivers digital products on demand and ProOps, with an ERP in production and a personal app.",
    },
  },
  deliveries: {
    label: "Nine projects",
    title: "What I ",
    highlight: "built.",
    description:
      "Six professional deliveries through the companies I co-own and three study projects.",
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
    projetos: {
      rotulo: "Projects",
      frases: [
        "What I have *shipped*",
        "Every choice has a *reason*",
        "Made for the *real world*",
      ],
    },
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
    label: "Nine projects, each with a written case",
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
    registraPreview: {
      eyebrow: "Interactive case · Android app",
      open: "Explore the flow",
      close: "Close",
      coverTitle: "Records continue without a signal.",
      coverBody: "From a paper form to a document with verifiable authorship and integrity.",
      illustration: "Illustrative demo, with no client data",
      stages: ["Capture", "Offline", "Signing"] as [string, string, string],
      titles: [
        "From paper to tablet.",
        "Work does not wait for a connection.",
        "Every record leaves proof.",
      ] as [string, string, string],
      captions: [
        "Self-monitoring forms gain digital fields for work on a tablet.",
        "Filling and local storage continue even when the connection drops.",
        "On finalisation, the signature and hash make authorship and integrity verifiable.",
      ] as [string, string, string],
      actions: ["Continue offline", "Finalise record", "Start again"] as [string, string, string],
      paper: "Control form",
      form: "Self-monitoring record",
      field: "Verification",
      note: "Observation",
      local: "Saved on device",
      pending: "Waiting for connection",
      final: "Record finalised",
      verified: "Integrity verified",
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
      "A digital product through SoftCode or a ProOps solution: either way, it starts with the same email.",
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
