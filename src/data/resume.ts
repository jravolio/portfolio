// Every fact on the site lives here. Roles, dates and figures are quoted from the LinkedIn profile as of 2026-11-18.

const CITY = "Rio de Janeiro";

export const SITE = {
  url: "https://devjravolio.com",
  name: "Julio Cesar Avolio",
  title: "Product Engineer",
  email: "jravolio892@gmail.com",
  github: "https://github.com/jravolio",
  linkedin: "https://www.linkedin.com/in/julio-cesar-avolio/",
  city: CITY,
  countryCode: "BR",
  location: `${CITY}, Brazil`,
  summary:
    "Product engineer in Rio de Janeiro. I lead design and front end for Scout at SockPuppet, and I build and run RollSummary on the side.",
} as const;

export type StopId = "seat" | "swarm" | "chronicler" | "courier" | "artificer" | "watchman";

export type Role = {
  org: string;
  title: string;
  terms: string;
  start: string;
  end: string | null;
  location: string;
};

export type Group = "now" | "how" | "own" | "before";

export const GROUPS: Array<{ id: Group; label: string }> = [
  { id: "now", label: "Now" },
  { id: "how", label: "How I work" },
  { id: "own", label: "My own product" },
  { id: "before", label: "Before" },
];

export type Card = {
  id: StopId;
  numeral: string;
  name: string;
  welcome: string;
  group: Group;
  kind: string;
  heading: string;
  glance?: string;
  usedAt?: string;
  roles: Role[];
  link?: { href: string; label: string };
  lede: string;
  /** The first figure is the lead outcome; the rest support it. */
  figures: Array<{ value: string; label: string }>;
  steps?: string[];
  deeds: Array<{ topic: string; items: string[] }>;
  stack: string[];
};

export const CARDS: Card[] = [
  {
    id: "seat",
    numeral: "I",
    name: "The Seat",
    welcome: "You find me at work. The valley is governed from this room.",
    group: "now",
    kind: "Current role",
    heading: "SockPuppet",
    glance: "where I lead design and front end for Scout.",
    roles: [
      {
        org: "SockPuppet",
        title: "Product Engineer",
        terms: "Full-time",
        start: "2026-02",
        end: null,
        location: "Remote",
      },
    ],
    lede: "I lead design and front end for Scout, the company's new product, which gives investigative teams governed, isolated access to hundreds of online platforms.",
    figures: [
      { value: "4 weeks", label: "from an empty repo to beta" },
      { value: "165", label: "merge requests in 3 months" },
      { value: "31 to 38%", label: "faster runs for about 3,700 tests" },
    ],
    deeds: [
      {
        topic: "Scout from zero",
        items: [
          "Took the customer portal and staff console from an empty repo to beta in about 4 weeks and to general availability in about 2 months. 165 merge requests in 3 months.",
          "Work across the stack, from interface to database: usage trends, demand reports, audit logs and data exports, with sign-in and role-based access on WorkOS.",
        ],
      },
      {
        topic: "Design system",
        items: [
          "Built the product's design system in React, TypeScript and Tailwind CSS, with Storybook, accessibility checks and a color-blind-safe palette.",
        ],
      },
      {
        topic: "Engineering speed",
        items: [
          "Led a front-end refactor across both apps: duplicated code moved into one shared package, one lint and format setup, and upgrades to Vitest 5, TypeScript 7 and Node 26. About 3,700 tests now run 31% to 38% faster and the codebase is about 2,000 lines smaller.",
          "Sped up CI and the commit loop in GitLab CI: per-pipeline dependency caching, shared checks that run once instead of once per app, and a pre-commit hook that formats, lints and typechecks in about 6 seconds.",
        ],
      },
      {
        topic: "Analytics",
        items: [
          "Shipped product analytics end to end on PostHog, with error tracking in Sentry, feeding the dashboards Product uses for the north star metric, activation funnel and launch success rate.",
        ],
      },
      {
        topic: "Earlier, on the existing portal",
        items: ["The Evidence Locker, a staff provisioning wizard and a service status system."],
      },
    ],
    stack: [
      "TypeScript",
      "React",
      "Tailwind CSS",
      "Storybook",
      "WorkOS",
      "Vitest",
      "Oxlint",
      "GitLab CI",
      "PostHog",
      "Sentry",
    ],
  },
  {
    id: "swarm",
    numeral: "II",
    name: "The Swarm",
    welcome: "They leave at dusk with their orders, and they come back with the work done.",
    group: "how",
    kind: "Not a job",
    heading: "Agent workflows",
    glance: "multi-agent pipelines that take a ticket to a tested, recorded change.",
    usedAt: "Used at SockPuppet and RollSummary.",
    roles: [],
    lede: "I design the multi-agent workflows my products ship through. One orchestrator gives the orders, and each agent has one job.",
    figures: [],
    steps: [
      "An orchestrator hands each ticket to a coding agent.",
      "The coding agent makes the change.",
      "A second agent tests it in a real browser and records a demo video, captioned by acceptance criterion.",
    ],
    deeds: [
      {
        topic: "At SockPuppet",
        items: [
          "Designed the multi-agent workflow Scout ships through: an orchestrator hands each ticket to a coding agent, then a second agent tests the change in a real browser and records a demo video captioned by acceptance criterion.",
        ],
      },
      {
        topic: "At RollSummary",
        items: [
          "Ship LLM agents on the OpenAI API that build each campaign's wiki through tool calls, plus an MCP connector for Claude.",
        ],
      },
    ],
    stack: ["Agent orchestration", "OpenAI API", "MCP", "Tool calls", "Browser automation"],
  },
  {
    id: "chronicler",
    numeral: "III",
    name: "The Chronicler",
    welcome: "Every tale told at my table is written down here, whether the players like it or not.",
    group: "own",
    kind: "Side project, live and paid",
    heading: "RollSummary",
    glance: "a live SaaS with 26 paying customers.",
    roles: [
      {
        org: "RollSummary",
        title: "Founder and Engineer",
        terms: "Side project",
        start: "2024-07",
        end: null,
        location: "Remote",
      },
    ],
    link: { href: "https://rollsummary.com", label: "rollsummary.com" },
    lede: "I build and operate a live SaaS that turns tabletop RPG session recordings into transcripts, summaries and a campaign wiki. I am its only engineer.",
    figures: [
      { value: "26", label: "paying customers" },
      { value: "0", label: "inbound ports open on the server" },
      { value: "Weekly", label: "automated restore drill" },
    ],
    deeds: [
      {
        topic: "Product",
        items: [
          "Own the product end to end, from design to Stripe billing and customer support, in TypeScript: Next.js and React on the front end, Elysia on Bun with PostgreSQL and Drizzle on the back end.",
          "Ship LLM agents on the OpenAI API that build each campaign's wiki through tool calls, plus an MCP connector for Claude.",
        ],
      },
      {
        topic: "Infrastructure",
        items: [
          "Moved production from a managed platform to my own VPS: Docker Compose services behind a Cloudflare Tunnel with no inbound ports open, documented with architecture diagrams and runbooks.",
          "Set up CI/CD in GitHub Actions on self-hosted runners: lint, typecheck, tests against a live database, security scans with Semgrep and Trivy, and automatic deploys.",
        ],
      },
      {
        topic: "Reliability",
        items: [
          "Run background work as async jobs on PostgreSQL with pg-boss: retries, heartbeats and a dead-letter queue that refunds the customer's hours when a job fails for good.",
          "Built layered backups: continuous WAL archiving for point-in-time recovery, hourly encrypted dumps and a weekly automated restore drill.",
        ],
      },
      {
        topic: "Monitoring",
        items: [
          "Built monitoring with Grafana dashboards on VictoriaMetrics metrics and centralized logs, with Telegram alerts for errors, failed jobs and stale backups.",
          "Send a daily analytics report to Telegram covering traffic, signups, revenue and AI spend, pulled from PostHog, the database and Stripe.",
        ],
      },
    ],
    stack: [
      "TypeScript",
      "Next.js",
      "Bun",
      "Elysia",
      "PostgreSQL",
      "Drizzle",
      "pg-boss",
      "Docker Compose",
      "Cloudflare Tunnel",
      "Grafana",
      "Stripe",
    ],
  },
  {
    id: "courier",
    numeral: "IV",
    name: "The Courier",
    welcome: "Everything that enters the valley crosses here. I made the crossing shorter.",
    group: "before",
    kind: "Past role",
    heading: "topictree",
    roles: [
      {
        org: "topictree",
        title: "Backend Developer",
        terms: "Freelance",
        start: "2023-12",
        end: "2025-11",
        location: "Remote",
      },
    ],
    lede: "Working in Python on Google Cloud, I designed and built the company's content delivery network and the image pipeline behind it.",
    figures: [
      { value: "40%", label: "faster image loading" },
      { value: "About 20%", label: "lower CDN cost" },
      { value: "100", label: "keywords in the provider benchmark" },
    ],
    deeds: [
      {
        topic: "The CDN",
        items: [
          "Cut image loading times by 40% by designing and building the CDN for video and channel thumbnails: a Cloud Function fed by a Cloud Tasks queue downloads each image, compresses it and stores it in Cloud Storage.",
          "Created the CDN module in the company's internal cloud package, used by every data collector.",
          "Cut CDN costs by about 20% by skipping thumbnails that were already stored, so a refresh no longer re-processes every image.",
        ],
      },
      {
        topic: "Data collection",
        items: [
          "Benchmarked two YouTube data providers across 100 keywords for result consistency and response time, then migrated the collector to the new one.",
          "Built an API usage reporter: a Cloud Function that tracks requests and spend across four external APIs, stores them in MySQL and emails an alert when one passes 80% of its limit.",
        ],
      },
      {
        topic: "Delivery",
        items: [
          "Set up CI/CD in GitHub Actions: each Cloud Function deploys automatically to the development and production environments.",
          "Full-stack product work in FastAPI, Next.js and React: first-login tracking for product analytics and user activation, usage limits and search filters in the REST API, and resilient image fallbacks in the UI.",
        ],
      },
    ],
    stack: [
      "Python",
      "Google Cloud",
      "Cloud Functions",
      "Cloud Tasks",
      "Cloud Storage",
      "FastAPI",
      "MySQL",
      "GitHub Actions",
    ],
  },
  {
    id: "artificer",
    numeral: "V",
    name: "The Artificer",
    welcome: "The wheel turns whether anyone watches it or not. That was the point of building it.",
    group: "before",
    kind: "Past role",
    heading: "V.tal",
    roles: [
      {
        org: "V.tal",
        title: "Full Stack Developer",
        terms: "Full-time",
        start: "2022-08",
        end: "2023-11",
        location: "Rio de Janeiro and remote",
      },
      {
        org: "V.tal",
        title: "O&M Intern",
        terms: "Part-time",
        start: "2022-01",
        end: "2022-08",
        location: "Rio de Janeiro",
      },
    ],
    lede: "I started as an operations intern and stayed on as a full-stack developer, automating critical network operations tasks and building the web tools the operations teams used to watch the result.",
    figures: [{ value: "80%", label: "less time to homologate a new device" }],
    deeds: [
      {
        topic: "Automation",
        items: [
          "Led the ONT homologation automation project, which reduced the time to homologate new devices by 80%.",
          "Built automations with UiPath, Python, Selenium and RobotFramework.",
          "Used Jenkins to create health checks that validate the integrity of production environments.",
        ],
      },
      {
        topic: "Tools for operations",
        items: [
          "Led development of the integration portal in React and Django, which operations teams used to monitor and manage their systems.",
          "Maintained and configured the Linux production environments, and set up Docker environments and the applications that ran in them.",
        ],
      },
      {
        topic: "As an intern",
        items: [
          "Assisted in preventive maintenance of the servers, working in Linux.",
          "Used OpenStack and Zabbix to monitor private cloud performance.",
        ],
      },
    ],
    stack: [
      "Python",
      "React",
      "Django",
      "UiPath",
      "Selenium",
      "RobotFramework",
      "Jenkins",
      "Docker",
      "PostgreSQL",
      "Linux",
      "OpenStack",
    ],
  },
  {
    id: "watchman",
    numeral: "VI",
    name: "The Watchman",
    welcome: "I began at the gate, on the night watch. Someone has to see the trouble first.",
    group: "before",
    kind: "Where I started",
    heading: "Oi",
    roles: [
      {
        org: "Oi",
        title: "IT Intern",
        terms: "Part-time",
        start: "2021-08",
        end: "2021-12",
        location: "Rio de Janeiro",
      },
    ],
    lede: "An internship keeping critical systems and networks available, and handling the alarms when they were not.",
    figures: [],
    deeds: [
      {
        topic: "Monitoring",
        items: ["Administered the Grafana and Zabbix monitoring tools so anomalies were caught early."],
      },
      {
        topic: "Incidents",
        items: [
          "Handled Business Alarms that impacted the network and servers, working to restore normal operation.",
          "Used SGFT, the fault and traffic management system, to document incidents and track their resolution.",
        ],
      },
    ],
    stack: ["Grafana", "Zabbix", "SGFT", "Network monitoring"],
  },
];

export type Relic = {
  id: "dice" | "camera" | "shard" | "cup" | "blade" | "lantern";
  name: string;
  note: string;
};

export const RELICS: Relic[] = [
  {
    id: "dice",
    name: "A set of dice",
    note: "I run the table more often than I sit at it. Dungeons & Dragons 5e, and the campaign that stayed with me was Curse of Strahd, which is why this valley looks the way it does. RollSummary came out of those sessions.",
  },
  {
    id: "shard",
    name: "A shard from a brighter city",
    note: "Cyberpunk 2077. It does not belong in a castle and I keep it anyway. I love that game.",
  },
  {
    id: "camera",
    name: "An instant camera",
    note: "Life is Strange.",
  },
  {
    id: "cup",
    name: "A porcelain cup with a straw",
    note: "Cuphead. Every frame of it was drawn by hand, which is the standard this page is chasing.",
  },
  {
    id: "blade",
    name: "A blade, much used",
    note: "Dark Souls III, Sekiro and both Dishonored games. I am told that dying repeatedly builds character.",
  },
  {
    id: "lantern",
    name: "A lantern that never goes out",
    note: "My own server. RollSummary runs on a VPS I operate myself, with backups, dashboards and alerts that reach my phone before a customer notices anything.",
  },
];

export const EDUCATION = {
  school: "Estácio",
  qualification: "BSc Computer Science",
  start: "2021-07",
  end: "2025-11",
} as const;

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return MONTH.format(new Date(Date.UTC(year, month - 1)));
}

export function yearOf(value: string) {
  return Number(value.slice(0, 4));
}

export function formatPeriod(start: string, end: string | null) {
  return `${formatMonth(start)} to ${end ? formatMonth(end) : "now"}`;
}
