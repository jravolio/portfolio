import { Icons } from "@/components/icons";
import { HomeIcon, NotebookIcon } from "lucide-react";

export const DATA_en = {
  name: "Julio Cesar Avolio",
  initials: "JA",
  url: "https://devjravolio.com",
  location: "Rio de Janeiro, Brazil",
  locationLink: "https://www.google.com/maps/place/riodejaneiro",
  description:
    "Full-stack developer focused on automation and efficiency. I love solving problems and building solutions.",
  summary:
    "Experienced full-stack developer with a strong background on task efficiency and automation. Skilled in automation using Python, React, with a track record of improving operational efficiency. Proficient in managing critical systems and networks, excelling in proactive monitoring and incident handling. Committed to excellence and adept at problem-solving.",
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
    { href: "/", icon: HomeIcon, label: "Home" },
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
        name: "Send Email",
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
      location: "Remote",
      title: "Backend Developer",
      logoUrl: "/topictree.svg",
      start: "June 2024",
      end: "Present",
      description:
        "Developed and maintained Google CDN infrastructure, improving website media performance. Responsible for refactoring legacy code and researching new technologies. Developed cloud-focused solutions using Google Cloud Platform (GCP).",
    },
    {
      company: "V.tal",
      href: "https://vtal.com",
      badges: [],
      location: "Rio de Janeiro, Brazil",
      title: "Full-Stack Developer",
      logoUrl: "/vtal.png",
      start: "August 2022",
      end: "November 2023",
      description:
        "Led automation initiatives reducing process time by 80%. Developed integration portal using React and Django for operational monitoring. Implemented solutions using Python, Jenkins, and UiPath.",
    },
    {
      company: "Oi",
      href: "https://oi.com.br",
      badges: [],
      location: "Rio de Janeiro, Brazil",
      title: "Operations and Maintenance Intern",
      logoUrl: "/oi.png",
      start: "August 2021",
      end: "August 2022",
      description:
        "Maintained monitoring tools including Grafana and Zabbix. Handled business alarms impacting network and servers. Acted as Linux sysadmin for incident resolution.",
    }
  ],
  education: [
    {
      school: "Estácio de Sá",
      href: "https://estacio.br",
      degree: "Bachelor's Degree in Computer Science",
      logoUrl: "/estacio.png",
      start: "2021",
      end: "2025",
    },
    {
      school: "Wizard by Pearson",
      href: "https://wizard.com.br",
      degree: "English Course",
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
        "Integrated Whisper AI with Django, leveraging Celery for task management and Redis for messaging, to develop a dynamic and interactive web application for transcription services.",
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
          type: "Source",
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
        "A website for summarizing tabletop RPG sessions, built with Next.js and React using server components. Integrates ChatGPT and Whisper APIs to provide session transcripts and summaries.",
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
          type: "Source",
          href: "https://rollsummary.com",
          icon: <Icons.github className="size-3" />,
        }
      ],
      image: "/rollsummary.jpeg",
    }
  ]
} as const;
