/**
 * Single source of truth for every fact on this site.
 *
 * Sourced from the LinkedIn export at Profile.pdf (5 pages, retrieved
 * 2026-08-28). Nothing here is inferred and no metric is invented: the 80%
 * and 30% figures are quoted from that document.
 */

export const LOCALES = ["en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const SITE = {
  url: "https://devjravolio.com",
  name: "Julio Cesar Avolio",
  initials: "JA",
  email: "jravolio892@gmail.com",
  tel: "+55 21 98807-1858",
  github: "https://github.com/jravolio",
  linkedin: "https://www.linkedin.com/in/julio-cesar-avolio/",
  location: { en: "Rio de Janeiro, Brazil", pt: "Rio de Janeiro, Brasil" },
} as const;

export type Role = {
  org: string;
  orgUrl?: string;
  via?: string;
  role: string;
  start: string;
  end: string | null;
  location: string;
  stack: string[];
  lede: string;
  bullets: string[];
};

export type Project = {
  slug: string;
  name: string;
  year: string;
  blurb: string;
  stack: string[];
  live?: string;
  repo?: string;
  archived?: boolean;
};

export type Education = {
  school: string;
  qualification: string;
  start: string;
  end: string;
};

export type Dictionary = {
  tagline: string;
  identity: string;
  now: string;
  nav: { index: string; work: string; writing: string; render: string };
  headings: {
    now: string;
    work: string;
    selectedWork: string;
    writing: string;
    education: string;
    contact: string;
    archive: string;
    stack: string;
  };
  ui: {
    copyEmail: string;
    copied: string;
    allWriting: string;
    resume: string;
    present: string;
    halt: string;
    resume_playback: string;
    theme: string;
    lang: string;
    skipToContent: string;
    commandHint: string;
    reducedMotionNote: string;
    blackHoleAlt: string;
    backToIndex: string;
    readRender: string;
  };
  work: Role[];
  projects: Project[];
  education: Education[];
  certifications: string[];
};

const STACK_PLANETBIDS = [
  "python",
  "django",
  "react",
  "ember",
  "aws",
  "terraform",
  "kubernetes",
  "opensearch",
  "ses",
  "sqs",
];

export const CONTENT: Record<Locale, Dictionary> = {
  en: {
    tagline: "full-stack engineer",
    identity:
      "Julio Cesar Avolio — full-stack engineer in Rio de Janeiro, building e-procurement systems for US public agencies at PlanetBids.",
    now: "Currently centralising email delivery at PlanetBids: one service on SES, SQS and Kubernetes workers replacing logic that lived in six places. Also writing the renderer behind this page.",
    nav: { index: "index", work: "work", writing: "writing", render: "render" },
    headings: {
      now: "now",
      work: "work",
      selectedWork: "selected work",
      writing: "writing",
      education: "education",
      contact: "contact",
      archive: "archive",
      stack: "stack",
    },
    ui: {
      copyEmail: "copy email",
      copied: "copied",
      allWriting: "all writing",
      resume: "resume.pdf",
      present: "present",
      halt: "halt",
      resume_playback: "resume",
      theme: "toggle output device",
      lang: "português",
      skipToContent: "skip to content",
      commandHint: "press ⌘K",
      reducedMotionNote:
        "Reduced motion is on, so the field below is a single pre-rendered frame.",
      blackHoleAlt:
        "A Schwarzschild black hole rendered in ASCII: a black circular shadow ringed by a thin bright photon ring, with a lensed accretion disk arcing over and under it.",
      backToIndex: "back to index",
      readRender: "how this was rendered",
    },
    work: [
      {
        org: "PlanetBids",
        orgUrl: "https://www.planetbids.com",
        via: "GoFasti",
        role: "full-stack developer",
        start: "2025-09",
        end: null,
        location: "remote, United States",
        stack: STACK_PLANETBIDS,
        lede: "E-procurement for US public agencies. Django backends, AWS infrastructure, and a frontend where React and Ember have to coexist.",
        bullets: [
          "Designed and built a unified email service end to end. Delivery logic had been spread across ColdFusion, Django, Hub, Portal, Postfix and separate SES integrations; it is now one service on AWS SES with SQS batch queues, Kubernetes send workers and quota controls. One system now owns the customer lifecycle communications.",
          "Built the AI extraction flow for agency documents that existed only as scans, tuning the vision layer so scans are detected and their fields read automatically. Cut the time for a customer to fill in a submission.",
          "Established the company's first infrastructure-as-code pattern: wrote the first Terraform configuration and the guidelines around it, built the internal documentation, guided other services through migration, and owned the CI/CD.",
          "Maintain the compatibility layer that translates between React and Ember, so React work can continue without breaking the Ember codebase.",
          "Designed AWS microservices around OpenSearch, improving search performance and enabling advanced indexing workflows.",
          "Built AI experts and skills that turn product requirements into technical language, speeding up ticket writing and slicing for the product team.",
        ],
      },
      {
        org: "topictree",
        orgUrl: "https://topictree.com",
        role: "backend developer",
        start: "2023-12",
        end: "2025-11",
        location: "remote",
        stack: ["python", "gcp", "cdn", "scrum"],
        lede: "Architected and optimised critical infrastructure, most of it around the company's content delivery network.",
        bullets: [
          "Designed and implemented the company's CDN, integrated it across services, and wrote the class that streamlined the whole path. Image loading times dropped substantially.",
          "Researched GCP services, YouTube services and API options, which led to replacing several services with ones better suited to the job.",
          "Improved the rank tracker: added filters to the visualisations and built fallbacks so images still appear when the source is unavailable.",
          "Built user activity monitoring and auditing to get a clearer picture of what users actually needed.",
          "Improved naming conventions and enforced coding standards to keep the codebase consistent.",
        ],
      },
      {
        org: "V.tal",
        orgUrl: "https://www.vtal.com",
        role: "full-stack developer",
        start: "2022-08",
        end: "2023-11",
        location: "Rio de Janeiro, Brazil",
        stack: ["python", "react", "django", "uipath", "jenkins", "docker", "postgresql", "linux"],
        lede: "Automation of critical network operations tasks, plus the web tooling the operations teams used to watch the result.",
        bullets: [
          "Led the ONT homologation automation project, which reduced the process time by 80%.",
          "Built automations with UiPath, Python, Selenium and RobotFramework.",
          "Used Jenkins to create health checks that validated the integrity of production environments, reducing unexpected incidents.",
          "Led development of the integration portal in React and Django, giving operations teams the tooling to monitor and manage systems. It reduced incident response time by 30%.",
          "Maintained and configured the Linux environments, and set up Docker environments for portability.",
        ],
      },
      {
        org: "V.tal",
        orgUrl: "https://www.vtal.com",
        role: "O&M intern",
        start: "2022-01",
        end: "2022-08",
        location: "Rio de Janeiro, Brazil",
        stack: ["linux", "openstack", "zabbix"],
        lede: "Preventive server maintenance and private-cloud monitoring.",
        bullets: [
          "Assisted in preventive activities on the servers, working in Linux.",
          "Used OpenStack and Zabbix to monitor private cloud performance.",
        ],
      },
      {
        org: "Oi",
        orgUrl: "https://www.oi.com.br",
        role: "IT intern",
        start: "2021-08",
        end: "2021-12",
        location: "Rio de Janeiro, Brazil",
        stack: ["grafana", "zabbix", "linux"],
        lede: "Keeping critical systems and networks available, and handling the alarms when they were not.",
        bullets: [
          "Administered the Grafana and Zabbix monitoring tools so anomalies were caught early.",
          "Handled Business Alarms that impacted the network and servers, working to restore normal operation.",
          "Used SGFT, the fault and traffic management system, to document incidents and track resolution.",
        ],
      },
    ],
    projects: [
      {
        slug: "rollsummary",
        name: "RollSummary",
        year: "2024",
        blurb:
          "Transcribes and summarises tabletop RPG sessions. Next.js server components over the Whisper and GPT APIs.",
        stack: ["next.js", "react", "typescript", "whisper", "gpt"],
        live: "https://rollsummary.com",
      },
      {
        slug: "transcriber",
        name: "Transcriber",
        year: "2024",
        blurb:
          "Self-hosted Whisper transcription service. Django with Celery for the job queue and Redis as the broker.",
        stack: ["django", "celery", "redis", "whisper", "docker"],
        repo: "https://github.com/jravolio/Transcriber",
      },
      {
        slug: "blackhole",
        name: "This page",
        year: "2026",
        blurb:
          "A Schwarzschild geodesic integrator running in a WebGL2 fragment shader, quantised to a 7x14px character lattice. Written up in full.",
        stack: ["webgl2", "glsl", "typescript", "next.js"],
        live: "/render",
      },
    ],
    education: [
      {
        school: "Estácio",
        qualification: "BSc Computer Science",
        start: "2021-07",
        end: "2025-11",
      },
      {
        school: "Wizard by Pearson",
        qualification: "English",
        start: "2012-02",
        end: "2020-11",
      },
    ],
    certifications: ["Containers Fundamentals", "Linux Fundamentals", "MongoDB"],
  },

  pt: {
    tagline: "engenheiro full-stack",
    identity:
      "Julio Cesar Avolio — engenheiro full-stack no Rio de Janeiro, construindo sistemas de compras públicas para órgãos americanos na PlanetBids.",
    now: "No momento estou centralizando o envio de e-mails na PlanetBids: um serviço sobre SES, SQS e workers em Kubernetes substituindo lógica que existia em seis lugares. Também escrevendo o renderizador por trás desta página.",
    nav: { index: "início", work: "trajetória", writing: "textos", render: "render" },
    headings: {
      now: "agora",
      work: "trajetória",
      selectedWork: "trabalhos selecionados",
      writing: "textos",
      education: "formação",
      contact: "contato",
      archive: "arquivo",
      stack: "stack",
    },
    ui: {
      copyEmail: "copiar e-mail",
      copied: "copiado",
      allWriting: "todos os textos",
      resume: "curriculo.pdf",
      present: "atual",
      halt: "parar",
      resume_playback: "retomar",
      theme: "trocar dispositivo de saída",
      lang: "english",
      skipToContent: "pular para o conteúdo",
      commandHint: "tecle ⌘K",
      reducedMotionNote:
        "Movimento reduzido está ativo, então o campo abaixo é um único quadro pré-renderizado.",
      blackHoleAlt:
        "Um buraco negro de Schwarzschild renderizado em ASCII: uma sombra circular preta cercada por um anel de fótons fino e brilhante, com um disco de acreção curvado por lente gravitacional passando por cima e por baixo.",
      backToIndex: "voltar ao início",
      readRender: "como isto foi renderizado",
    },
    work: [
      {
        org: "PlanetBids",
        orgUrl: "https://www.planetbids.com",
        via: "GoFasti",
        role: "desenvolvedor full-stack",
        start: "2025-09",
        end: null,
        location: "remoto, Estados Unidos",
        stack: STACK_PLANETBIDS,
        lede: "Compras públicas para órgãos americanos. Backends em Django, infraestrutura AWS e um frontend onde React e Ember precisam conviver.",
        bullets: [
          "Projetei e construí de ponta a ponta um serviço unificado de e-mail. A lógica de envio estava espalhada por ColdFusion, Django, Hub, Portal, Postfix e integrações SES separadas; hoje é um serviço sobre AWS SES, com filas SQS em lote, workers de envio em Kubernetes e controle de cota. Um sistema passou a ser dono de toda a comunicação com o cliente.",
          "Construí o fluxo de extração com IA para documentos que só existiam como digitalizações, ajustando a camada de visão para que os arquivos sejam detectados e seus campos lidos automaticamente. Reduziu drasticamente o tempo de preenchimento pelo cliente.",
          "Estabeleci o primeiro padrão de infraestrutura como código da empresa: escrevi a primeira configuração Terraform e as diretrizes, montei a documentação interna, orientei a migração de outros serviços e cuidei do CI/CD.",
          "Mantenho a camada de compatibilidade que traduz entre React e Ember, permitindo evoluir o React sem quebrar a base Ember.",
          "Projetei microsserviços AWS em torno do OpenSearch, melhorando a performance de busca e viabilizando fluxos avançados de indexação.",
          "Construí agentes e skills de IA que traduzem requisitos de produto para linguagem técnica, acelerando a escrita e o fatiamento de tickets.",
        ],
      },
      {
        org: "topictree",
        orgUrl: "https://topictree.com",
        role: "desenvolvedor backend",
        start: "2023-12",
        end: "2025-11",
        location: "remoto",
        stack: ["python", "gcp", "cdn", "scrum"],
        lede: "Arquitetei e otimizei componentes críticos de infraestrutura, boa parte em torno da CDN da empresa.",
        bullets: [
          "Projetei e implementei a CDN da empresa, integrei-a a todos os serviços e escrevi a classe que padronizou o caminho inteiro. O tempo de carregamento das imagens caiu de forma expressiva.",
          "Pesquisei serviços do GCP, do YouTube e alternativas de API, o que levou a substituir serviços por opções mais adequadas.",
          "Melhorei o rank tracker: adicionei filtros às visualizações e criei fallbacks para que as imagens apareçam mesmo quando a origem está indisponível.",
          "Construí monitoramento e auditoria de atividade para entender melhor o que os usuários precisavam.",
          "Melhorei convenções de nomenclatura e reforcei padrões de código para manter a base consistente.",
        ],
      },
      {
        org: "V.tal",
        orgUrl: "https://www.vtal.com",
        role: "desenvolvedor full-stack",
        start: "2022-08",
        end: "2023-11",
        location: "Rio de Janeiro, Brasil",
        stack: ["python", "react", "django", "uipath", "jenkins", "docker", "postgresql", "linux"],
        lede: "Automação de tarefas críticas de operação de rede, e as ferramentas web que os times de operação usavam para acompanhar o resultado.",
        bullets: [
          "Liderei o projeto de automação da homologação de ONTs, que reduziu o tempo do processo em 80%.",
          "Construí automações com UiPath, Python, Selenium e RobotFramework.",
          "Usei Jenkins para criar health checks que validavam a integridade dos ambientes de produção, reduzindo incidentes inesperados.",
          "Liderei o desenvolvimento do portal de integração em React e Django, dando aos times de operação as ferramentas para monitorar e gerenciar os sistemas. Reduziu o tempo de resposta a incidentes em 30%.",
          "Mantive e configurei os ambientes Linux, e montei ambientes Docker para portabilidade.",
        ],
      },
      {
        org: "V.tal",
        orgUrl: "https://www.vtal.com",
        role: "estagiário de O&M",
        start: "2022-01",
        end: "2022-08",
        location: "Rio de Janeiro, Brasil",
        stack: ["linux", "openstack", "zabbix"],
        lede: "Manutenção preventiva de servidores e monitoramento de nuvem privada.",
        bullets: [
          "Auxiliei nas atividades preventivas dos servidores, trabalhando em Linux.",
          "Usei OpenStack e Zabbix para monitorar a performance da nuvem privada.",
        ],
      },
      {
        org: "Oi",
        orgUrl: "https://www.oi.com.br",
        role: "estagiário de TI",
        start: "2021-08",
        end: "2021-12",
        location: "Rio de Janeiro, Brasil",
        stack: ["grafana", "zabbix", "linux"],
        lede: "Manter sistemas e redes críticas disponíveis, e tratar os alarmes quando não estavam.",
        bullets: [
          "Administrei as ferramentas de monitoramento Grafana e Zabbix para detectar anomalias cedo.",
          "Tratei Business Alarms que impactavam rede e servidores, atuando para restabelecer a operação.",
          "Usei o SGFT, sistema de gestão de falhas e tráfego, para documentar incidentes e acompanhar a resolução.",
        ],
      },
    ],
    projects: [
      {
        slug: "rollsummary",
        name: "RollSummary",
        year: "2024",
        blurb:
          "Transcreve e resume sessões de RPG de mesa. Server components do Next.js sobre as APIs Whisper e GPT.",
        stack: ["next.js", "react", "typescript", "whisper", "gpt"],
        live: "https://rollsummary.com",
      },
      {
        slug: "transcriber",
        name: "Transcriber",
        year: "2024",
        blurb:
          "Serviço de transcrição self-hosted com Whisper. Django com Celery na fila de jobs e Redis como broker.",
        stack: ["django", "celery", "redis", "whisper", "docker"],
        repo: "https://github.com/jravolio/Transcriber",
      },
      {
        slug: "blackhole",
        name: "Esta página",
        year: "2026",
        blurb:
          "Um integrador de geodésicas de Schwarzschild rodando em um fragment shader WebGL2, quantizado para uma malha de caracteres de 7x14px. Documentado por inteiro.",
        stack: ["webgl2", "glsl", "typescript", "next.js"],
        live: "/render",
      },
    ],
    education: [
      {
        school: "Estácio",
        qualification: "Bacharelado em Ciência da Computação",
        start: "2021-07",
        end: "2025-11",
      },
      {
        school: "Wizard by Pearson",
        qualification: "Inglês",
        start: "2012-02",
        end: "2020-11",
      },
    ],
    certifications: ["Containers Fundamentals", "Linux Fundamentals", "MongoDB"],
  },
};

export function getContent(locale: string): Dictionary {
  return CONTENT[(LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : DEFAULT_LOCALE];
}

/** `2025-09` -> `2025-09`; null -> the localised "present". Never `new Date()`. */
export function formatPeriod(start: string, end: string | null, present: string) {
  return `${start} — ${end ?? present}`;
}
