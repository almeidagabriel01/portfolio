// Tipos locais de propósito: mantêm este arquivo sem dependência de `@/store`
// (e do zustand junto). O acoplamento com `next.config.ts` que existia aqui
// (derivar o `frame-src` da CSP dos links) foi desfeito no T21 da v2: sem
// iframe no site, a política virou `frame-src 'none'`.
type Locale = "pt" | "en";
type Localized<T> = Record<Locale, T>;

/**
 * O binário `trabalho`/`estudo` da v2 não distinguia produto próprio de entrega
 * para cliente, e é essa distinção que a hierarquia societária exige: a ProOps
 * é produto da empresa do Gabriel, a Barbalog e a LyftConnect são entregas da
 * SoftCode para terceiros.
 */
export type ProjectGroup = "produto" | "cliente" | "estudo";

/** Empresa que assina a entrega. Só existe para `produto` e `cliente`. */
export type DeliveredBy = "SoftCode" | "ProOps";

export interface ProjectCase {
  contexto: Localized<string>;
  papel: Localized<string>;
  stack: string[];
  destaques: Localized<string[]>;
}

export interface Project {
  /** Chave de rota: precisa ser único e URL-safe. */
  slug: string;
  nome: string;
  /** URL pública do produto, quando existe uma experiência acessível no navegador. */
  link?: string;
  /** Aplicativos sem site público usam uma experiência interativa local. */
  preview?: "interactive";
  grupo: ProjectGroup;
  /**
   * Invariante: presente em todo `produto`/`cliente`, ausente em todo `estudo`.
   * Exercício de curso não sai por empresa nenhuma, e entrega sem atribuição
   * renderizaria um rótulo vazio na UI.
   */
  entreguePor?: DeliveredBy;
  descricao: Localized<string>;
  /** Vídeo de hover da home, quando há gravação real do site (760 × 474). */
  video?: string;
  /** Fallback H.264 para navegadores que não reproduzem o WebM. */
  videoMp4?: string;
  /** Primeiro quadro da gravação, usado enquanto ela decodifica. */
  poster?: string;
  /**
   * Imagem em repouso, 1280 × 800. Sites usam captura da página pública;
   * Registra usa capa editorial identificada como case.
   */
  screenshot: string;
  /** Capturas WebP já comprimidas são servidas diretamente, sem nova conversão. */
  screenshotUnoptimized?: boolean;
  /**
   * A case page do projeto. **Obrigatória** para todas as entregas.
   *
   * Era opcional, e daí saía o par de comportamentos: o cartão da home levava
   * ao case num projeto e abria o site em aba nova no vizinho, com a rota
   * `[slug]` devolvendo 404 no segundo caso. Os sete já tinham case desde que
   * os exercícios de curso ganharam a deles, então o ramo estava dormente — e
   * dormente é pior, porque nada avisa quando ele acorda.
   *
   * O preço está declarado: projeto novo não entra no site sem case escrita.
   */
  case: ProjectCase;
}

export const portfolioProjects: Project[] = [
  {
    slug: "store-flow",
    video: "/projects/store-flow.webm",
    videoMp4: "/projects/store-flow.mp4",
    poster: "/projects/store-flow-poster.webp",
    screenshot: "/projects/store-flow.png",
    nome: "Store Flow",
    link: "https://store-flow-pink.vercel.app/",
    grupo: "estudo",
    descricao: {
      pt: "Vitrine de e-commerce com experiência de compra fluida.",
      en: "E-commerce storefront with a fluid shopping experience.",
    },
    // Redigido a partir do README do projeto, fornecido pelo Gabriel. É a única
    // fonte: o repositório não é público.
    case: {
      contexto: {
        pt: "Exercício próprio de front-end: uma loja que consome a FakeStore API para listar produtos, manter um carrinho e simular um checkout completo em três etapas. O que o estudo exercita é estado global sem biblioteca de store e formulário validado por schema.",
        en: "A front-end exercise of my own: a store that consumes the FakeStore API to list products, keep a cart and simulate a complete three-step checkout. What the study practises is global state without a store library, and schema-validated forms.",
      },
      papel: {
        pt: "Estudo próprio, sem cliente. Escrevi a aplicação inteira: catálogo, carrinho, checkout, login de demonstração e o tema claro/escuro.",
        en: "A study of my own, with no client. I wrote the entire application: catalogue, cart, checkout, demo login and the light/dark theme.",
      },
      stack: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "React Hook Form", "Zod"],
      destaques: {
        pt: [
          "Estado global de carrinho, autenticação e tema com Context API e `useReducer`, sem dependência externa de store.",
          "Checkout em três passos (entrega, pagamento e revisão), com validação por etapa via React Hook Form e Zod.",
          "Catálogo servido pela FakeStore API, com detalhe do produto em modal e total do carrinho recalculado em tempo real.",
          "Tema claro/escuro persistido em `localStorage`, e acessibilidade com alt-text, `aria-label` e navegação por teclado.",
        ],
        en: [
          "Global state for cart, authentication and theme with Context API and `useReducer`, with no external store dependency.",
          "A three-step checkout (delivery, payment and review), validated step by step through React Hook Form and Zod.",
          "Catalogue served by the FakeStore API, with product detail in a modal and the cart total recalculated in real time.",
          "Light/dark theme persisted in `localStorage`, plus accessibility through alt text, `aria-label` and keyboard navigation.",
        ],
      },
    },
  },
  {
    slug: "softcode",
    video: "/projects/softcode.webm",
    videoMp4: "/projects/softcode.mp4",
    poster: "/projects/softcode-poster.webp",
    screenshot: "/projects/softcode.png",
    nome: "SoftCode",
    link: "https://softcodedev.com.br",
    grupo: "produto",
    entreguePor: "SoftCode",
    descricao: {
      pt: "Site da software house da qual sou sócio: narrativa de scroll em oito cenas sobre um campo de partículas na GPU, com agendamento embutido.",
      en: "Site of the software house I co-own: an eight-scene scroll narrative over a GPU particle field, with booking built in.",
    },
    // Reescrito em 2026-08-12: o site foi refeito (v2) e o case anterior
    // descrevia outra página. Redigido a partir do repositório da v2 e da
    // página no ar, não do release antigo — as rotas, a contagem de partículas
    // e a grade do agendamento saíram do código, não da documentação (o
    // `CLAUDE.md` de lá ainda diz "~60k partículas", e a fonte diz outra coisa).
    case: {
      contexto: {
        pt: "A SoftCode é a software house da qual sou sócio, e o site dela é a primeira coisa que um cliente vê antes de qualquer conversa. A tese da segunda versão é que o site seja a prova: uma casa que vende software feito à mão não pode se apresentar num template, então a home virou uma narrativa única de scroll e a primeira reunião passou a ser marcada ali mesmo, sem formulário de qualificação no caminho.",
        en: "SoftCode is the software house I co-own, and its site is the first thing a client sees before any conversation. The premise of the second version is that the site is the proof: a shop that sells hand-written software cannot introduce itself with a template, so the home became a single scroll narrative and the first meeting is now booked right there, with no qualification form in the way.",
      },
      papel: {
        pt: "Sócio e responsável pelo site, do escopo ao deploy. Nesta versão isso incluiu o motor de cenas (uma fonte única define as oito faixas de scroll), o campo de partículas na GPU, o agendamento de ponta a ponta e a base bilíngue — e a manutenção depois da publicação.",
        en: "Partner, and responsible for the site from scope to deploy. In this version that included the scene engine (a single source defines the eight scroll ranges), the GPU particle field, the booking flow end to end and the bilingual base, plus maintenance after launch.",
      },
      stack: [
        "Next.js",
        "React",
        "TypeScript",
        "next-intl",
        "Three.js",
        "React Three Fiber",
        "GSAP",
        "Lenis",
        "Zustand",
        "CSS Modules",
        "Zoom",
        "Cloudflare Workers",
      ],
      destaques: {
        pt: [
          "A home é uma narrativa de scroll em oito cenas, e as faixas de cada uma vivem num arquivo só: mudar onde uma cena começa não mexe nas fronteiras das vizinhas.",
          "O campo de partículas roda na GPU e a contagem se adapta ao aparelho, pelo lado da textura de simulação: 6,4 mil no celular, 12,1 mil no desktop.",
          "Bilíngue por rota prefixada (`/pt` e `/en`), e o caminho também é traduzido: `/servicos` responde por `/services`. Não é troca de string sobre a mesma URL.",
          "A reunião de 30 minutos é marcada no próprio site, e a grade de horários mora num módulo só, importado pelo calendário no cliente e pelas duas rotas de API. É o que impede o cliente de oferecer um horário que o servidor recusa.",
          "A sala do Zoom é criada por Server-to-Server OAuth em modo best-effort: se o Zoom não responde, a reserva já confirmada continua de pé e cai numa sala alternativa.",
          "Os dois sites entregues são percorridos ao vivo dentro de uma moldura na página, e o escopo acende conforme a parte correspondente passa — em vez de um recorte parado da primeira dobra.",
          "Com `prefers-reduced-motion` a experiência inteira não monta: sobra a casca semântica, que é a mesma coisa que quem está sem JS recebe.",
          "É a casa que entregou a Barbalog e a LyftConnect, e as duas creditam a SoftCode no rodapé.",
        ],
        en: [
          "The home is an eight-scene scroll narrative, and each scene's range lives in a single file: moving where one scene starts does not disturb its neighbours' boundaries.",
          "The particle field runs on the GPU and the count adapts to the device through the simulation texture side: 6.4k on phones, 12.1k on desktop.",
          "Bilingual by prefixed route (`/pt` and `/en`), and the path is translated too: `/servicos` answers as `/services`. It is not a string swap over the same URL.",
          "The 30-minute meeting is booked on the site itself, and the slot grid lives in one module, imported by the client-side calendar and by both API routes. That is what stops the client offering a time the server would refuse.",
          "The Zoom room is created through Server-to-Server OAuth on a best-effort basis: if Zoom does not answer, an already confirmed booking stands and falls back to an alternative room.",
          "The two delivered sites are browsed live inside a frame on the page, with the scope lighting up as the matching part goes by, instead of a still crop of the fold.",
          "Under `prefers-reduced-motion` the whole experience never mounts: what is left is the semantic shell, the same thing a visitor without JS receives.",
          "It is the shop that delivered Barbalog and LyftConnect, and both credit SoftCode in the footer.",
        ],
      },
    },
  },
  {
    slug: "barbalog",
    video: "/projects/barbalog.webm",
    videoMp4: "/projects/barbalog.mp4",
    poster: "/projects/barbalog-poster.webp",
    screenshot: "/projects/barbalog.png",
    nome: "Barbalog",
    link: "https://www.barbalog.com.br/",
    grupo: "cliente",
    entreguePor: "SoftCode",
    descricao: {
      pt: "Consultoria em logística e supply chain: diagnóstico, projetos de CD, WMS e PCP.",
      en: "Logistics and supply chain consulting: diagnostics, DC design, WMS and PCP.",
    },
    // Redigido só a partir do que o site publica hoje (fetch de
    // https://www.barbalog.com.br/) e da stack detectada nos headers da resposta.
    // Nenhuma métrica, cliente ou data foi inferida.
    case: {
      contexto: {
        pt: "Site institucional de uma consultoria de logística e supply chain do Rio Grande do Sul, que se apresenta com a promessa de 'operação enxuta, decisão baseada em dados'. A página precisa cobrir seis frentes de serviço distintas sem virar um catálogo confuso, e converter visita em diagnóstico agendado.",
        en: "Marketing site for a logistics and supply chain consultancy based in Rio Grande do Sul, Brazil, built around the promise of a 'lean operation, data-driven decisions'. The page has to present six distinct service lines without turning into a confusing catalogue, and turn a visit into a booked diagnostic.",
      },
      papel: {
        pt: "Entrega da SoftCode, a software house da qual sou sócio. Atuei do escopo ao deploy: estrutura das seis frentes de serviço numa página só, construção da interface em Next.js e TypeScript, e a manutenção depois da publicação.",
        en: "A SoftCode delivery, from the software house I co-own. I worked from scope to deploy: structuring the six service lines into a single page, building the interface in Next.js and TypeScript, and maintaining it after launch.",
      },
      // Stack declarada na tabela de entregas da spec (Next.js, TypeScript,
      // Tailwind), somada ao que a resposta HTTP entrega: `Server: Vercel` e
      // assets em `/_next/static`.
      stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Vercel"],
      destaques: {
        pt: [
          "Seis frentes de serviço numeradas de 01 a 06, do diagnóstico logístico aos treinamentos corporativos.",
          "Jornada explícita em três estágios (diagnóstico, plano de ação e implementação) como espinha da narrativa da página.",
          "Modelagem 3D apresentada como prova visual: ver o centro de distribuição antes de construir.",
          "Diagnóstico gratuito como porta de entrada, com CTA direto para WhatsApp e agendamento de reunião.",
          "Um mês do início ao ar, do escopo à publicação.",
        ],
        en: [
          "Six service lines numbered 01 to 06, from the logistics diagnostic through to corporate training.",
          "An explicit three-stage journey (diagnostic, action plan, implementation) as the spine of the page narrative.",
          "3D modelling used as visual proof: see the distribution centre before building it.",
          "A free diagnostic as the entry point, with direct CTAs to WhatsApp and meeting scheduling.",
          "One month from kickoff to live, from scope to publication.",
        ],
      },
    },
  },
  {
    slug: "lyftconnect",
    video: "/projects/lyftconnect.webm",
    videoMp4: "/projects/lyftconnect.mp4",
    poster: "/projects/lyftconnect-poster.webp",
    screenshot: "/projects/lyftconnect.png",
    nome: "LyftConnect",
    // Sem `www`: o host com `www` devolve 522 (o Cloudflare não alcança a
    // origem) e o apex responde 200. Mesmo caso já registrado na SoftCode.
    link: "https://lyftconnect.com.br/",
    grupo: "cliente",
    entreguePor: "SoftCode",
    descricao: {
      pt: "Site de uma empresa de automação residencial, entregue pela SoftCode.",
      en: "Website for a home automation company, delivered by SoftCode.",
    },
    // Escrito só a partir dos fatos registrados na spec: setor, período, stack
    // e o crédito à SoftCode no rodapé, verificado por fetch quando a spec foi
    // redigida. A tentativa de refazer o fetch agora devolveu HTTP 403, então
    // nenhuma seção ou copy da página entra aqui: o que não tem fonte viva não
    // é descrito (AD-001).
    case: {
      contexto: {
        pt: "Empresa de automação residencial que precisava de presença própria na web: uma página que explicasse o serviço para quem está pesquisando instalação em casa e servisse de porta de entrada para contato, sem depender de rede social.",
        en: "A home automation company that needed a web presence of its own: a page that explains the service to someone researching a home installation and works as the front door for contact, without depending on social media.",
      },
      papel: {
        pt: "Entrega da SoftCode, a software house da qual sou sócio. Construí o site em Next.js, React e Tailwind, do escopo com o cliente até o deploy, entre agosto e setembro de 2025.",
        en: "A SoftCode delivery, from the software house I co-own. I built the site in Next.js, React and Tailwind, from scoping with the client through to deploy, between August and September 2025.",
      },
      stack: ["Next.js", "React", "Tailwind CSS"],
      destaques: {
        pt: [
          "Entrega da SoftCode: o rodapé do site credita a software house.",
          "Um mês do início ao ar, do escopo à publicação.",
          "Setor de automação residencial: o serviço é instalado na casa do cliente final, e a página precisa explicar antes de converter.",
          "Front-end em Next.js com React e Tailwind CSS.",
        ],
        en: [
          "A SoftCode delivery: the site footer credits the software house.",
          "One month from kickoff to live, from scope to publication.",
          "Home automation sector: the service is installed in the end customer's home, so the page has to explain before it converts.",
          "Front-end in Next.js with React and Tailwind CSS.",
        ],
      },
    },
  },
  {
    slug: "proops",
    video: "/projects/proops.webm",
    videoMp4: "/projects/proops.mp4",
    poster: "/projects/proops-poster.webp",
    screenshot: "/projects/proops.png",
    nome: "ProOps ERP",
    link: "https://erp.proops.com.br/",
    grupo: "produto",
    entreguePor: "ProOps",
    descricao: {
      pt: "ERP para empresas de serviços: propostas, CRM, financeiro e IA integrada.",
      en: "ERP for service companies: proposals, CRM, finance and built-in AI.",
    },
    // Redigido a partir da página pública do ERP
    // (https://erp.proops.com.br/) e do repositório do produto.
    // Os números do dashboard na landing page (saldo, propostas, conversão) são
    // dados de demonstração da própria peça. NÃO são métricas de uso e não
    // entram aqui como resultado.
    case: {
      contexto: {
        pt: "Plataforma de gestão para empresas de serviços que reúne proposta comercial, CRM, financeiro e equipe num só lugar, o oposto da operação espalhada entre planilha, WhatsApp e caderno. O site apresenta ainda pacotes especializados para automação residencial e decoração de interiores.",
        en: "A management platform for service companies that brings commercial proposals, CRM, finance and team into one place, the opposite of an operation scattered across spreadsheets, WhatsApp and notebooks. The site also presents specialised packages for home automation and interior design.",
      },
      papel: {
        pt: "Sócio da ProOps e um dos dois que tocam a engenharia do produto. Atuo na modelagem multi-tenant, nas integrações de pagamento e agenda e na assistente de IA que preenche formulários e responde sobre a operação. O ERP está no ar, em produção.",
        en: "Partner at ProOps and one of the two people running the product's engineering. I work on the multi-tenant data model, the payment and calendar integrations, and the AI assistant that fills in forms and answers questions about the operation. The ERP is live, in production.",
      },
      // Detectado na resposta HTTP: `Server: Vercel` + assets em `/_next/static`.
      // As integrações são as declaradas na própria página.
      stack: [
        "Next.js",
        "React",
        "Vercel",
        "Stripe",
        "Pix",
        "Asaas",
        "WhatsApp",
        "Google Agenda",
        "Firebase",
        "Firestore",
        "Cloud Functions",
        "Gemini",
      ],
      destaques: {
        pt: [
          "Proposta comercial vira PDF pronto na hora, sem passar por editor de texto.",
          "Assistente de IA (Lia) para automatizar tarefas e responder perguntas sobre o próprio negócio.",
          "Financeiro completo no mesmo lugar: fluxo de caixa, despesas e parcelas.",
          "Integrações declaradas com WhatsApp, Google Agenda, Stripe, Pix e Asaas.",
          "Arquitetura multi-tenant com isolamento por cliente, TLS e conformidade com a LGPD, conforme declarado no site.",
          "Os números do painel na landing page são de demonstração: o produto não publica métrica real.",
        ],
        en: [
          "A commercial proposal becomes a finished PDF on the spot, with no word processor in between.",
          "An AI assistant (Lia) to automate tasks and answer questions about the business itself.",
          "Full finance in the same place: cash flow, expenses and instalments.",
          "Stated integrations with WhatsApp, Google Calendar, Stripe, Pix and Asaas.",
          "Multi-tenant architecture with per-client isolation, TLS and LGPD compliance, as stated on the site.",
          "The dashboard figures on the landing page are demo data: the product publishes no real metrics.",
        ],
      },
    },
  },
  {
    slug: "proops-app",
    screenshot: "/projects/proops-app.webp",
    screenshotUnoptimized: true,
    nome: "ProOps App",
    link: "https://app.proops.com.br/",
    grupo: "produto",
    entreguePor: "ProOps",
    descricao: {
      pt: "App pessoal para finanças, notas e lembretes com agente de IA pelo WhatsApp.",
      en: "Personal app for finances, notes and reminders with an AI agent on WhatsApp.",
    },
    // Fonte: Personal-ProOps-app/README.md, PRODUCT.md, package.json e agent/README.md.
    // O link é a página pública do app, não uma URL de loja nem uma sessão autenticada.
    case: {
      contexto: {
        pt: "Aplicativo pessoal da ProOps para organizar dinheiro e rotina. Mensagens de texto ou áudio pelo WhatsApp podem gerar lançamentos, notas e lembretes; no app, a pessoa acompanha contas, cartões, faturas, orçamento e projeção de caixa.",
        en: "ProOps' personal app for organising money and daily life. Text or voice messages through WhatsApp can create transactions, notes and reminders; in the app, people can follow accounts, cards, bills, budgets and cash-flow forecasts.",
      },
      papel: {
        pt: "Sócio da ProOps e integrante da engenharia do produto. Trabalho no aplicativo mobile, nos fluxos financeiros e no agente que interpreta mensagens e integra o WhatsApp ao Supabase. É um produto distinto do ERP.",
        en: "Partner at ProOps and part of the product engineering team. I work on the mobile app, financial flows and the agent that interprets messages and connects WhatsApp to Supabase. It is a separate product from the ERP.",
      },
      stack: ["Expo", "React Native", "TypeScript", "Supabase", "PostgreSQL", "FastAPI", "LangGraph", "Gemini", "Groq Whisper", "Meta Cloud API", "Cloud Run"],
      destaques: {
        pt: [
          "Visão Hoje reúne saldo, gastos do dia, próximas contas e lembretes para orientar decisões imediatas.",
          "Contas, cartões, faturas, parcelamentos, metas, orçamentos e projeção de caixa compartilham o mesmo domínio financeiro.",
          "Agente em Python recebe mensagens de texto e áudio, organiza ações e confirma o resultado pelo WhatsApp.",
          "Notas e lembretes ficam disponíveis no app junto da rotina financeira, inclusive quando criados pelo agente.",
        ],
        en: [
          "The Today view brings together balances, today's spending, upcoming bills and reminders for immediate decisions.",
          "Accounts, cards, bills, instalments, goals, budgets and cash-flow forecasts share the same financial domain.",
          "A Python agent receives text and voice messages, organises actions and confirms the result through WhatsApp.",
          "Notes and reminders sit alongside finances in the app, including those created through the agent.",
        ],
      },
    },
  },
  {
    slug: "registra",
    screenshot: "/projects/registra.webp",
    screenshotUnoptimized: true,
    nome: "Registra",
    preview: "interactive",
    grupo: "cliente",
    entreguePor: "SoftCode",
    descricao: {
      pt: "App Android para digitalizar formulários industriais com operação offline e trilha de auditoria.",
      en: "Android app for digitising industrial forms with offline operation and an audit trail.",
    },
    // Fontes: registra/docs/DIGITALIZACAO-PACS.md, docs/REPASSE-SESSAO.md,
    // app/build.gradle.kts e supabase/README.md. A capa usa somente a marca;
    // não publica documentos, dados ou telas da operação do cliente.
    case: {
      contexto: {
        pt: "Produto desenvolvido pela SoftCode para substituir formulários de autocontrole em papel por registros digitais em tablets Android. A operação precisa continuar sem conexão e manter autoria, integridade e histórico de cada registro.",
        en: "A SoftCode product that replaces paper self-monitoring forms with digital records on Android tablets. The operation must continue without a connection and preserve authorship, integrity and the history of every record.",
      },
      papel: {
        pt: "Na SoftCode, participo da engenharia do aplicativo Android e do painel administrativo. O trabalho cobre formulários configuráveis, fluxo offline, sincronização entre dispositivos e mecanismos de assinatura e auditoria.",
        en: "At SoftCode, I work on the Android app and the admin panel. The work covers configurable forms, offline flows, device synchronisation, signing and audit mechanisms.",
      },
      stack: ["Kotlin", "Jetpack Compose", "Room", "SQLCipher", "Android Keystore", "Google Tink", "Hilt", "WorkManager", "Supabase", "Edge Functions"],
      destaques: {
        pt: [
          "Formulários configuráveis são preenchidos offline no tablet; registros finalizados passam a ser imutáveis.",
          "Assinaturas ECDSA P-256, hashes SHA-256 e verificação de integridade sustentam a trilha de auditoria.",
          "Transferência tablet a tablet por Wi-Fi e sincronização opcional por tenant permitem operar sem rede contínua.",
          "Painel web administra usuários e modelos de formulário.",
        ],
        en: [
          "Configurable forms are filled in offline on a tablet; finalised records become immutable.",
          "ECDSA P-256 signatures, SHA-256 hashes and integrity checks support the audit trail.",
          "Tablet-to-tablet transfer over Wi-Fi and optional per-tenant sync support work without continuous connectivity.",
          "A web panel manages users and form templates.",
        ],
      },
    },
  },
];
