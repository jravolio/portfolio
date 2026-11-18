import { type Card, formatPeriod, type Role } from "@/data/resume";
import { Emblem } from "./emblems";
import { OpenReading, OpenReadingFromCard, ReadingDialog } from "./reading";
import { SheetHead } from "./sheet-head";

function CardFace({ card }: { card: Card }) {
  return (
    <svg viewBox="0 0 220 380" className="card-face" aria-hidden="true">
      <rect x="1" y="1" width="218" height="378" rx="12" className="card-stock" />
      <g className="card-frame">
        <rect x="11" y="11" width="198" height="358" rx="6" />
        <rect x="18" y="18" width="184" height="344" rx="3" />
        <path d="M18 62 H202 M18 312 H202" />
        <path d="M30 30 l8 8 l-8 8 l-8 -8 Z M190 30 l8 8 l-8 8 l-8 -8 Z" className="fill-accent" />
      </g>
      <text x="110" y="53" className="card-numeral">
        {card.numeral}
      </text>
      <g transform="translate(19 74) scale(1.3)">
        <Emblem id={card.id} />
      </g>
      <text x="110" y="346" className="card-name">
        {card.name}
      </text>
    </svg>
  );
}

function Roles({ roles }: { roles: Role[] }) {
  return (
    <dl className="roles">
      {roles.map((role) => (
        <div key={`${role.org}-${role.start}`}>
          <dt>{role.title}</dt>
          <dd>
            {formatPeriod(role.start, role.end)}. {role.terms}. {role.location}.
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Figures({ figures }: { figures: Card["figures"] }) {
  if (figures.length === 0) return null;
  return (
    <ul className="figures">
      {figures.map((figure) => (
        <li key={figure.label}>
          <strong>{figure.value}</strong>
          <span>{figure.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function PlacePanel({ card, when, position }: { card: Card; when?: string; position: string }) {
  const titleId = `${card.id}-title`;
  const dialogId = `${card.id}-reading`;
  const readingTitleId = `${card.id}-reading-title`;
  const identity = (
    <>
      {card.roles.length > 0 ? <Roles roles={card.roles} /> : null}
      {card.usedAt ? <p className="used-at">{card.usedAt}</p> : null}
    </>
  );

  return (
    <article className="place" aria-labelledby={titleId}>
      <OpenReadingFromCard dialogId={dialogId} className="tarot">
        <CardFace card={card} />
      </OpenReadingFromCard>

      <div className="sheet">
        <div className="band">
          <SheetHead
            kind={
              <>
                {card.kind}
                {when ? `, ${when}` : ""}
              </>
            }
            aside={
              <>
                <span className="aside-card">
                  {card.numeral}. {card.name}
                </span>
                <span className="aside-position">{position}</span>
              </>
            }
          />
          <h2 id={titleId}>{card.heading}</h2>
          {identity}
        </div>

        <div className="band">
          <p>{card.lede}</p>
          {card.steps ? (
            <ol className="steps">
              {card.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
          <Figures figures={card.figures} />
        </div>

        <div className="band">
          <p className="sheet-stack">
            <span>Worked with</span> {card.stack.join(", ")}
          </p>
          <footer className="sheet-foot">
            <OpenReading dialogId={dialogId} className="plain-button primary" describedBy={titleId}>
              Read the full record
            </OpenReading>
            {card.link ? <a href={card.link.href}>{card.link.label}</a> : null}
          </footer>
        </div>
      </div>

      <ReadingDialog id={dialogId} labelledBy={readingTitleId}>
        <form method="dialog" className="reading-close">
          <button type="submit" className="plain-button" autoFocus>
            Close
          </button>
        </form>
        <div className="reading-sheet">
          <CardFace card={card} />
          <div className="reading-text">
            <p className="reading-kind">
              {card.kind}
              {when ? `, ${when}` : ""}
            </p>
            <h3 id={readingTitleId}>{card.heading}</h3>
            {identity}
            <p className="reading-voice">{card.welcome}</p>
            <Figures figures={card.figures} />
            {card.deeds.map((group) => (
              <section key={group.topic} className="deeds">
                <h4>{group.topic}</h4>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
            <p className="reading-stack">Worked with {card.stack.join(", ")}.</p>
          </div>
        </div>
      </ReadingDialog>
    </article>
  );
}
