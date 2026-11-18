import { preload } from "react-dom";
import { InkDefs } from "@/components/ink-defs";
import { type IndexGroup, PlaceIndex } from "@/components/place-index";
import { PlacePanel } from "@/components/place-panel";
import { SheetHead } from "@/components/sheet-head";
import { Study } from "@/components/study";
import { ValleyStage } from "@/components/valley-stage";
import { CARDS, type Card, EDUCATION, GROUPS, SITE, yearOf } from "@/data/resume";

function years(cards: Card[]) {
  const roles = cards.flatMap((card) => card.roles);
  if (roles.length === 0) return undefined;
  const start = Math.min(...roles.map((role) => yearOf(role.start)));
  if (roles.some((role) => role.end === null)) return `${start} to now`;
  const end = Math.max(...roles.map((role) => yearOf(role.end!)));
  return start === end ? String(start) : `${start} to ${end}`;
}

const WHEN = new Map(CARDS.map((card) => [card.id, years([card])]));

const SECTIONS = GROUPS.map((group) => ({
  ...group,
  cards: CARDS.filter((card) => card.group === group.id),
}));

const INDEX: IndexGroup[] = [
  { label: "Home", items: [{ id: "hero", label: SITE.name }] },
  ...SECTIONS.map(({ label, cards }) => ({
    label,
    items: cards.map((card) => ({ id: card.id, label: card.heading, when: WHEN.get(card.id) })),
  })),
  {
    label: "Also",
    items: [
      { id: "study", label: "Off duty" },
      { id: "gate", label: "Contact" },
    ],
  },
];

function position(card: Card) {
  const section = SECTIONS.find((s) => s.id === card.group)!;
  if (section.cards.length === 1) return section.label;
  return `${section.label}, ${section.cards.indexOf(card) + 1} of ${section.cards.length}`;
}

function NameList({ cards }: { cards: Card[] }) {
  return cards.map((card, i) => (
    <span key={card.id}>
      {i === 0 ? "" : i === cards.length - 1 ? " and " : ", "}
      <a href={`#${card.id}`}>{card.heading}</a>
    </span>
  ));
}

export default function HomePage() {
  preload("/models/kit.bin", { as: "fetch", crossOrigin: "anonymous" });
  const current = CARDS[0].roles[0];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE.url}/#person`,
    name: SITE.name,
    url: SITE.url,
    jobTitle: SITE.title,
    description: SITE.summary,
    email: `mailto:${SITE.email}`,
    address: { "@type": "PostalAddress", addressLocality: SITE.city, addressCountry: SITE.countryCode },
    sameAs: [SITE.github, SITE.linkedin],
    worksFor: { "@type": "Organization", name: current.org },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <InkDefs />
      <ValleyStage />
      <PlaceIndex groups={INDEX} />

      <main>
        <section id="hero" className="stop">
          <div className="pin pin-low">
            <div className="hero-text">
              <h1>{SITE.name}</h1>
              <p className="hero-summary">
                {SITE.title} in {SITE.location}.
              </p>
              <dl className="glance">
                {SECTIONS.map(({ id, label, cards }) => {
                  const single = cards.length === 1 ? cards[0].glance : undefined;
                  return (
                    <div key={id}>
                      <dt>{label}</dt>
                      <dd>
                        <NameList cards={cards} />
                        {single ? `, ${single}` : `, ${years(cards)}.`}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p className="voice">Enter freely. Every lit window in this valley is work of mine.</p>
              <p className="hero-actions">
                <a href={`#${CARDS[0].id}`} className="plain-button primary">
                  Walk down the valley
                </a>
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                <a href={SITE.linkedin}>LinkedIn</a>
                <a href={SITE.github}>GitHub</a>
              </p>
            </div>
          </div>
        </section>

        {CARDS.map((card) => (
          <section key={card.id} id={card.id} className="stop">
            <div className="pin">
              <PlacePanel card={card} when={WHEN.get(card.id)} position={position(card)} />
            </div>
          </section>
        ))}

        <section id="study" className="stop">
          <div className="pin">
            <div className="sheet sheet-wide">
              <div className="band">
                <SheetHead kind="Not work" aside="The study" />
                <h2>Off duty</h2>
              </div>
              <div className="band">
                <p>The lit window up there is mine. Six things sit on the shelf. Pick one up.</p>
                <Study />
              </div>
            </div>
          </div>
        </section>

        <section id="gate" className="stop stop-last">
          <div className="pin pin-low">
            <div className="sheet sheet-wide">
              <div className="band">
                <SheetHead kind="Contact" aside="The gate" />
                <h2>Write to me</h2>
                <p className="voice">The gate stands open. Most people write before they leave.</p>
              </div>
              <div className="band">
                <ul className="contact">
                  <li>
                    <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                  </li>
                  <li>
                    <a href={SITE.linkedin}>LinkedIn</a>
                  </li>
                  <li>
                    <a href={SITE.github}>GitHub</a>
                  </li>
                </ul>
                <p className="colophon">
                  {SITE.location}. {EDUCATION.qualification}, {EDUCATION.school},{" "}
                  {yearOf(EDUCATION.end)}.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
