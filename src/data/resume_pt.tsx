import { Icons } from "@/components/icons";
import { HomeIcon, NotebookIcon } from "lucide-react";

export const DATA_pt = {
  name: "Julio Cesar Avolio",
  initials: "JA",
  url: "https://devjravolio.com",
  location: "Rio de Janeiro, Brasil",
  locationLink: "https://www.google.com/maps/place/riodejaneiro",
  description:
    "Desenvolvedor full-stack focado em automação e eficiência. Amo resolver problemas e construir soluções.",
  summary:
    "Desenvolvedor full-stack experiente com forte background em eficiência de tarefas e automação. Especializado em automação usando Python e React, com histórico comprovado em melhorar a eficiência operacional. Proficiente em gerenciar sistemas e redes críticas, destacando-se em monitoramento proativo e tratamento de incidentes. Comprometido com a excelência e hábil em resolução de problemas.",
  avatarUrl: "/me.png",
  skills: [
    "React",
    "Django",
    "PostgreSQL", 
    "Jenkins",
    "UiPath",
    "Javascript",
    "Typescript",
    "Flask",
    "Linux",
    "Docker",
    "Python",
    "Google Cloud Platform",
    "Azure",
    "Git",
    "Next.js",
    "FastAPI",
    "TailwindCSS",
    "Framer Motion",
    "Shadcn/UI",
  ],
  navbar: [
    { href: "/", icon: HomeIcon, label: "Início" },
    // { href: "/blog", icon: NotebookIcon, label: "Blog" },
  ],
  contact: {
    email: "jravolio892@gmail.com",
    tel: "+55 (21) 988071858",
    social: {
      GitHub: {
        name: "GitHub",
        url: "https://github.com/jravolio",
        icon: Icons.github,
        navbar: true,
      },
      LinkedIn: {
        name: "LinkedIn",
        url: "https://www.linkedin.com/in/julio-cesar-avolio/",
        icon: Icons.linkedin,
        navbar: true,
      },
      email: {
        name: "Enviar Email",
        url: "mailto:jravolio892@gmail.com",
        icon: Icons.email,
        navbar: false,
      },
    },
  },

  work: [
    {
      company: "TopicTree",
      href: "https://topictree.com",
      badges: [],
      location: "Remoto",
      title: "Desenvolvedor Backend",
      logoUrl: "/topictree.svg",
      start: "Junho 2024",
      end: "Presente",
      description:
        "Desenvolvi e mantive infraestrutura do Google CDN, melhorando o desempenho de mídia do site. Responsável por refatorar código legado e pesquisar novas tecnologias. Desenvolvi soluções focadas em nuvem usando Google Cloud Platform (GCP).",
    },
    {
      company: "V.tal",
      href: "https://vtal.com",
      badges: [],
      location: "Rio de Janeiro, Brasil",
      title: "Desenvolvedor Full-Stack",
      logoUrl: "/vtal.png",
      start: "Agosto 2022",
      end: "Novembro 2023",
      description:
        "Liderei iniciativas de automação reduzindo o tempo de processo em 80%. Desenvolvi portal de integração usando React e Django para monitoramento operacional. Implementei soluções usando Python, Jenkins e UiPath.",
    },
    {
      company: "Oi",
      href: "https://oi.com.br",
      badges: [],
      location: "Rio de Janeiro, Brasil",
      title: "Estagiário de Operações e Manutenção",
      logoUrl: "/oi.png",
      start: "Agosto 2021",
      end: "Agosto 2022",
      description:
        "Mantive ferramentas de monitoramento incluindo Grafana e Zabbix. Tratei alarmes de negócio impactando rede e servidores. Atuei como administrador Linux para resolução de incidentes.",
    }
  ],
  education: [
    {
      school: "Estácio de Sá",
      href: "https://estacio.br",
      degree: "Bacharelado em Ciência da Computação",
      logoUrl: "/estacio.png",
      start: "2021",
      end: "2025",
    },
    {
      school: "Wizard by Pearson",
      href: "https://wizard.com.br",
      degree: "Curso de Inglês",
      logoUrl: "/wizard.png",
      start: "2012",
      end: "2020",
    }
  ],
  projects: [
    {
      title: "Transcriber AI",
      href: "https://github.com/jravolio/Transcriber",
      dates: "2024",
      active: true,
      description:
        "Integrei Whisper AI com Django, utilizando Celery para gerenciamento de tarefas e Redis para mensageria, desenvolvendo uma aplicação web dinâmica e interativa para serviços de transcrição.",
      technologies: [
        "Django",
        "Celery",
        "Redis",
        "Whisper AI",
        "Python",
        "Docker"
      ],
      video: "https://youtu.be/lmNhHhYfx-A",
      links: [
        {
          type: "Código Fonte",
          href: "https://github.com/jravolio/Transcriber",
          icon: <Icons.github className="size-3" />,
        }
      ],
      image: "/transcriber.jpeg",
    },
    {
      title: "RollSummary",
      href: "https://rollsummary.com",
      dates: "2024",
      active: true,
      description:
        "Um site para resumir sessões de RPG de mesa, construído com Next.js e React usando componentes de servidor. Integra APIs do ChatGPT e Whisper para fornecer transcrições e resumos de sessões.",
      technologies: [
        "Next.js",
        "React",
        "TypeScript",
        "ChatGPT",
        "Whisper AI"
      ],
      video: "https://youtu.be/lmNhHhYfx-A",
      links: [
        {
          type: "Código Fonte",
          href: "https://rollsummary.com",
          icon: <Icons.github className="size-3" />,
        }
      ],
      image: "/rollsummary.jpeg",
    }
  ]
} as const;
